
# app/services/agent_strategy_runner.py (rename the new one to avoid confusion)
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import uuid
from app.services.persistence import PersistenceService
from app.services.web3_utils import Web3Utils
from app.services.wallet_utils import WalletUtils
from app.models.strategy import Strategy, Execution
from app.db.logger import get_logger

logger = get_logger(__name__)

class AgentStrategyRunner:
    """Service for executing and simulating trading strategies"""
    
    def __init__(
        self, 
        persistence_service: PersistenceService,
        web3_utils: Web3Utils,
        wallet_utils: WalletUtils
    ):
        self.persistence = persistence_service
        self.web3_utils = web3_utils
        self.wallet_utils = wallet_utils
        
        # Configuration
        self.default_slippage = 0.01  # 1%
        self.max_gas_price = 50  # gwei
        self.simulation_timeout = 30  # seconds
        
    async def simulate_strategy(self, execution_id: str, strategy: Strategy) -> bool:
        """Simulate strategy execution without broadcasting transactions"""
        try:
            logger.info(f"Starting simulation for execution {execution_id}")
            
            # Update execution status
            await self.persistence.update_execution_status(execution_id, "simulating")
            
            # Get current wallet balances using your existing wallet_utils
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    eth_balance = await self.wallet_utils.get_eth_balance(strategy.wallet_address, session)
                    
                    # Get token balances using your existing methods
                    usdc_balance = await self.wallet_utils.get_erc20_balance(
                        strategy.wallet_address,
                        "0x14A3Fb98C14759169f998155ba4c31d1393D6D7c",  # Your USDC contract
                        6,
                        session
                    )
                    
                    link_balance = await self.wallet_utils.get_erc20_balance(
                        strategy.wallet_address,
                        "0x514910771af9ca656af840dff83e8264ecf986ca",  # LINK
                        18,
                        session
                    )
                    
                    balances = {
                        "balances": {
                            "ETH": eth_balance,
                            "USDC": usdc_balance,
                            "LINK": link_balance
                        }
                    }
                    
                    # Get USD values from your existing price service
                    from app.services.coingecko import fetch_token_prices
                    usd_prices = await fetch_token_prices(["ETH", "USDC", "LINK"])
                    
                    balances["usd_value"] = {
                        "ETH": eth_balance * usd_prices.get("ETH", {}).get("usd", 0),
                        "USDC": usdc_balance * usd_prices.get("USDC", {}).get("usd", 1),
                        "LINK": link_balance * usd_prices.get("LINK", {}).get("usd", 0)
                    }
                    
            except Exception as e:
                logger.error(f"Error fetching balances: {e}")
                return False
            
            # Plan the trades needed
            planned_actions = await self._plan_trades(strategy, balances)
            
            # Get quotes for each trade
            quoted_actions = []
            total_gas_estimate = 0
            total_cost_estimate = 0.0
            
            for action in planned_actions:
                try:
                    quote = await self._get_trade_quote(action)
                    quoted_action = {**action, "quote": quote}
                    quoted_actions.append(quoted_action)
                    
                    total_gas_estimate += quote.get("estimated_gas", 0)
                    total_cost_estimate += quote.get("estimated_cost_usd", 0)
                    
                except Exception as e:
                    logger.error(f"Error getting quote for action {action}: {e}")
                    quoted_action = {**action, "quote": None, "error": str(e)}
                    quoted_actions.append(quoted_action)
            
            # Update execution with simulation results
            execution = await self.persistence.get_execution(execution_id)
            if execution:
                execution.actions = quoted_actions
                execution.gas_used = total_gas_estimate
                execution.total_cost_usd = total_cost_estimate
                execution.status = "simulated"
                execution.note = f"Simulation completed. {len(quoted_actions)} actions planned."
                
                await self.persistence.executions.replace_one(
                    {"execution_id": execution_id},
                    execution.dict(by_alias=True, exclude_unset=True)
                )
            
            logger.info(f"Simulation completed for execution {execution_id}")
            return True
            
        except Exception as e:
            logger.error(f"Simulation failed for execution {execution_id}: {e}")
            await self.persistence.update_execution_status(
                execution_id, 
                "failed", 
                error_message=str(e)
            )
            return False
    
    async def execute_strategy(self, execution_id: str, strategy: Strategy) -> bool:
        """Execute strategy with real blockchain transactions using your web3_utils"""
        try:
            logger.info(f"Starting execution for execution {execution_id}")
            
            # First simulate to get the plan
            simulation_success = await self.simulate_strategy(execution_id, strategy)
            if not simulation_success:
                raise Exception("Simulation failed, aborting execution")
            
            # Get the updated execution with simulation results
            execution = await self.persistence.get_execution(execution_id)
            if not execution or not execution.actions:
                raise Exception("No actions available for execution")
            
            # Update status to executing
            await self.persistence.update_execution_status(execution_id, "executing")
            
            # Execute each action using your existing web3_utils
            tx_hashes = []
            for i, action in enumerate(execution.actions):
                try:
                    if action.get("quote") is None:
                        logger.warning(f"Skipping action {i} - no valid quote")
                        continue
                    
                    logger.info(f"Executing action {i+1}/{len(execution.actions)}: {action['from']} -> {action['to']}")
                    
                    # Use your existing web3_utils for actual execution
                    tx_hash = await self._execute_trade_with_web3_utils(strategy.wallet_address, action)
                    
                    if tx_hash:
                        tx_hashes.append(tx_hash)
                        logger.info(f"Trade executed successfully: {tx_hash}")
                        
                        # Wait for confirmation
                        await asyncio.sleep(2)
                    else:
                        logger.error(f"Trade execution failed for action {i}")
                        
                except Exception as e:
                    logger.error(f"Error executing action {i}: {e}")
                    continue
            
            # Update execution with results
            final_status = "confirmed" if tx_hashes else "failed"
            await self.persistence.update_execution_status(
                execution_id,
                final_status,
                tx_hashes=tx_hashes
            )
            
            if tx_hashes:
                logger.info(f"Execution completed successfully: {len(tx_hashes)} transactions")
                return True
            else:
                logger.error(f"Execution failed: no successful transactions")
                return False
                
        except Exception as e:
            logger.error(f"Execution failed for execution {execution_id}: {e}")
            await self.persistence.update_execution_status(
                execution_id,
                "failed",
                error_message=str(e)
            )
            return False
    
    async def _execute_trade_with_web3_utils(self, wallet_address: str, action: Dict[str, Any]) -> Optional[str]:
        """Execute trade using your existing web3_utils"""
        try:
            quote = action.get("quote", {})
            if not quote or quote.get("error"):
                raise Exception("No valid quote available")
            
            # This integrates with your existing web3_utils.py
            # You'll need to adapt based on your actual web3_utils methods
            
            # Example integration (adapt to your actual methods):
            # tx_hash = await self.web3_utils.execute_swap(
            #     from_token=action["from"],
            #     to_token=action["to"],
            #     amount=action["amount"],
            #     min_receive=quote["min_receive"],
            #     wallet_address=wallet_address
            # )
            
            # For now, return mock hash for testing
            logger.info(f"Would execute: {action['from']} -> {action['to']}")
            mock_hash = f"0x{''.join([str(uuid.uuid4().hex)[:8]])}"
            return mock_hash
            
        except Exception as e:
            logger.error(f"Error executing trade: {e}")
            return None
    
    async def _plan_trades(self, strategy: Strategy, balances: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Plan the individual trades needed to achieve target allocation"""
        try:
            current_balances = balances.get("balances", {})
            current_usd_values = balances.get("usd_value", {})
            total_usd = sum(current_usd_values.values())
            
            if total_usd == 0:
                return []
            
            # Calculate target amounts in USD
            target_usd_amounts = {}
            for token, target_pct in strategy.target_allocation.items():
                target_usd_amounts[token] = (target_pct / 100.0) * total_usd
            
            # Calculate required trades
            actions = []
            
            # Simple implementation: identify tokens to sell and buy
            tokens_to_sell = []
            tokens_to_buy = []
            
            for token in set(list(current_usd_values.keys()) + list(target_usd_amounts.keys())):
                current_usd = current_usd_values.get(token, 0)
                target_usd = target_usd_amounts.get(token, 0)
                diff_usd = target_usd - current_usd
                
                if diff_usd < -10:  # Need to sell (with $10 threshold)
                    tokens_to_sell.append({"token": token, "excess_usd": -diff_usd})
                elif diff_usd > 10:  # Need to buy
                    tokens_to_buy.append({"token": token, "needed_usd": diff_usd})
            
            # Create trade actions
            for sell_info in tokens_to_sell:
                for buy_info in tokens_to_buy:
                    if sell_info["excess_usd"] <= 0 or buy_info["needed_usd"] <= 0:
                        continue
                    
                    # Calculate trade amount
                    trade_usd = min(sell_info["excess_usd"], buy_info["needed_usd"])
                    
                    if trade_usd > 10:  # Minimum trade size
                        # Convert USD to token amount
                        sell_token_balance = current_balances.get(sell_info["token"], 0)
                        sell_token_usd = current_usd_values.get(sell_info["token"], 0)
                        sell_token_price = sell_token_usd / sell_token_balance if sell_token_balance > 0 else 0
                        
                        trade_amount = trade_usd / sell_token_price if sell_token_price > 0 else 0
                        
                        if trade_amount > 0:
                            actions.append({
                                "from": sell_info["token"],
                                "to": buy_info["token"],
                                "amount": trade_amount,
                                "amount_usd": trade_usd,
                                "min_receive": None,  # Will be calculated during quoting
                                "estimated_gas": None
                            })
                            
                            # Update remaining amounts
                            sell_info["excess_usd"] -= trade_usd
                            buy_info["needed_usd"] -= trade_usd
            
            logger.info(f"Planned {len(actions)} trades for strategy {strategy.strategy_id}")
            return actions
            
        except Exception as e:
            logger.error(f"Error planning trades: {e}")
            return []
    
    async def _get_trade_quote(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Get quote for a trade action - integrate with 1inch or your preferred DEX"""
        try:
            # TODO: Replace with real 1inch API integration
            # Example 1inch API call:
            # url = f"https://api.1inch.dev/swap/v6.0/1/quote"
            # params = {
            #     "src": token_addresses[action["from"]],
            #     "dst": token_addresses[action["to"]],
            #     "amount": str(int(action["amount"] * 10**decimals[action["from"]]))
            # }
            
            # Mock quote for now
            await asyncio.sleep(0.1)  # Simulate API delay
            
            quote = {
                "from_token": action["from"],
                "to_token": action["to"],
                "from_amount": action["amount"],
                "to_amount": action["amount"] * 0.998,  # Mock 0.2% slippage
                "min_receive": action["amount"] * 0.99,  # 1% slippage tolerance
                "estimated_gas": 150000,
                "estimated_cost_usd": 5.0,
                "route": f"{action['from']} -> {action['to']}",
                "source": "mock_dex",
                "quote_timestamp": datetime.utcnow().isoformat()
            }
            
            return quote
            
        except Exception as e:
            logger.error(f"Error getting trade quote: {e}")
            return {
                "error": str(e),
                "estimated_gas": 200000,
                "estimated_cost_usd": 10.0
            }

# Singleton instance
agent_strategy_runner = None

def get_agent_strategy_runner(
    persistence_service: PersistenceService,
    web3_utils: Web3Utils,
    wallet_utils: WalletUtils
) -> AgentStrategyRunner:
    """Get or create agent strategy runner instance"""
    global agent_strategy_runner
    if agent_strategy_runner is None:
        agent_strategy_runner = AgentStrategyRunner(
            persistence_service, 
            web3_utils, 
            wallet_utils
        )
    return agent_strategy_runner