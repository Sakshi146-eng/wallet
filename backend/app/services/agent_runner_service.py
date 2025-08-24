# app/services/agent_runner_service.py
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import json
import uuid
import aiohttp
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage

from app.config import get_env
from app.services.persistence import PersistenceService
from app.services.web3_utils import Web3Utils
from app.services.wallet_utils import get_eth_balance, get_erc20_balance
from app.services.coingecko import fetch_token_prices
from app.services.logger import log_agent_interaction
from app.models.strategy import Strategy, Execution
from app.db.mongo import agent_logs

# Initialize Groq LLM
groq_api_key = get_env("GROQ_API_KEY")
llm = ChatGroq(
    api_key=groq_api_key,
    model="llama3-70b-8192"  
)

# Your existing prompt template
prompt_template = """Your name is Walli-a crypto co-agent. You analyze wallet {wallet_address} activity and answer the user's request below.

User Input:
{user_prompt}

Wallet ETH balance: {eth_balance:.4f} ETH

Other Token Balances:
{token_balances}

Only respond with actionable DeFi advice based on market logic.
"""

class AgentRunnerService:
    """Enhanced service for running agent interactions and strategy execution"""
    
    def __init__(self, persistence_service: PersistenceService):
        self.persistence = persistence_service
        self.web3_utils = Web3Utils()
        
        # Configuration
        self.default_slippage = 0.01  # 1%
        self.max_gas_price = 50  # gwei
        self.simulation_timeout = 30  # seconds
    
    async def run_agent(self, user_prompt: str, wallet_address: str) -> str:
        """Your existing agent logic wrapped as a service method"""
        print("[AGENT] Invoked")
        try:
            async with aiohttp.ClientSession() as session:
                try:
                    # Try live balance fetch
                    print("[AGENT] Fetching balances from live sources")
                    eth_balance = await get_eth_balance(wallet_address, session)

                    usdc = await get_erc20_balance(
                        address=wallet_address,
                        contract_address="0x14A3Fb98C14759169f998155ba4c31d1393D6D7c", #OWN
                        decimals=6,
                        session=session
                    )

                    link = await get_erc20_balance(
                        address=wallet_address,
                        contract_address="0x514910771af9ca656af840dff83e8264ecf986ca",  
                        decimals=18,
                        session=session
                    )

                    token_balances = {
                        "USDC": usdc,
                        "LINK": link
                    }

                    usd_values = await fetch_token_prices(["ETH", "USDC", "LINK"])

                except Exception as e:
                    print(f"[AGENT] Live balance fetch failed: {e}")
                    # Fallback to mongo db 
                    last_log = await agent_logs.find_one(
                        {"wallet_address": wallet_address},
                        sort=[("timestamp", -1)]
                    )

                    if not last_log:
                        raise Exception("No cached balance found in MongoDB.")

                    print("[AGENT] Using fallback from MongoDB")
                    eth_balance = last_log.get("eth_balance", 0.0)
                    usd_values = last_log.get("usd_values", {})
                    token_balances = {
                        "USDC": usd_values.get("USDC", 0.0),
                        "LINK": usd_values.get("LINK", 0.0)
                    }

                # Build prompt
                prompt = prompt_template.format(
                    wallet_address=wallet_address,
                    user_prompt=user_prompt,
                    eth_balance=eth_balance,
                    token_balances="\n".join([f"{k}: {v:.2f}" for k, v in token_balances.items()])
                )

                print("[AGENT] Sending prompt to Groq...")
                result = await llm.ainvoke(prompt)
                print("Groq response:", result)

                response_text = result.content if isinstance(result, AIMessage) else str(result)

                # Log agent interaction
                await log_agent_interaction({
                    "wallet_address": wallet_address,
                    "user_prompt": user_prompt,
                    "agent_response": response_text,
                    "eth_balance": eth_balance,
                    "usd_values": usd_values,
                    "timestamp": datetime.now(timezone.utc)
                })

                return response_text

        except Exception as e:
            print(f"[AGENT ERROR] {e}")
            return None  # triggers fallback intent parser
    
    async def simulate_strategy(self, execution_id: str, strategy: Strategy) -> bool:
        """Simulate strategy execution without broadcasting transactions"""
        try:
            print(f"Starting simulation for execution {execution_id}")
            
            # Update execution status
            await self.persistence.update_execution_status(execution_id, "simulating")
            
            # Get current wallet balances
            try:
                async with aiohttp.ClientSession() as session:
                    eth_balance = await get_eth_balance(strategy.wallet_address, session)
                    
                    # Get token balances
                    usdc_balance = await get_erc20_balance(
                        strategy.wallet_address,
                        "0x14A3Fb98C14759169f998155ba4c31d1393D6D7c",  # Your USDC contract
                        6,
                        session
                    )
                    
                    link_balance = await get_erc20_balance(
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
                    
                    # Get USD values
                    usd_prices = await fetch_token_prices(["ETH", "USDC", "LINK"])
                    
                    balances["usd_value"] = {
                        "ETH": eth_balance * usd_prices.get("ETH", {}).get("usd", 0),
                        "USDC": usdc_balance * usd_prices.get("USDC", {}).get("usd", 1),
                        "LINK": link_balance * usd_prices.get("LINK", {}).get("usd", 0)
                    }
                    
            except Exception as e:
                print(f"Error fetching balances: {e}")
                await self.persistence.update_execution_status(
                    execution_id, 
                    "failed", 
                    error_message=str(e)
                )
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
                    print(f"Error getting quote for action {action}: {e}")
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
            
            print(f"Simulation completed for execution {execution_id}")
            return True
            
        except Exception as e:
            print(f"Simulation failed for execution {execution_id}: {e}")
            await self.persistence.update_execution_status(
                execution_id, 
                "failed", 
                error_message=str(e)
            )
            return False
    
    async def execute_strategy(self, execution_id: str, strategy: Strategy) -> bool:
        """Execute strategy with real blockchain transactions"""
        try:
            print(f"Starting execution for execution {execution_id}")
            
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
            
            # Execute each action using web3_utils
            tx_hashes = []
            for i, action in enumerate(execution.actions):
                try:
                    if action.get("quote") is None:
                        print(f"Skipping action {i} - no valid quote")
                        continue
                    
                    print(f"Executing action {i+1}/{len(execution.actions)}: {action['from']} -> {action['to']}")
                    
                    # Use web3_utils for actual execution
                    tx_hash = await self._execute_trade(strategy.wallet_address, action)
                    
                    if tx_hash:
                        tx_hashes.append(tx_hash)
                        print(f"Trade executed successfully: {tx_hash}")
                        
                        # Wait for confirmation
                        await asyncio.sleep(2)
                    else:
                        print(f"Trade execution failed for action {i}")
                        
                except Exception as e:
                    print(f"Error executing action {i}: {e}")
                    continue
            
            # Update execution with results
            final_status = "confirmed" if tx_hashes else "failed"
            await self.persistence.update_execution_status(
                execution_id,
                final_status,
                tx_hashes=tx_hashes
            )
            
            if tx_hashes:
                print(f"Execution completed successfully: {len(tx_hashes)} transactions")
                return True
            else:
                print(f"Execution failed: no successful transactions")
                return False
                
        except Exception as e:
            print(f"Execution failed for execution {execution_id}: {e}")
            await self.persistence.update_execution_status(
                execution_id,
                "failed",
                error_message=str(e)
            )
            return False
    
    async def _execute_trade(self, wallet_address: str, action: Dict[str, Any]) -> Optional[str]:
        """Execute trade using web3_utils"""
        try:
            quote = action.get("quote", {})
            if not quote or quote.get("error"):
                raise Exception("No valid quote available")
            
            # Convert the action to the format expected by your web3_utils
            trades = {
                action["from"]: {
                    "current": action["amount"],
                    "target": 0,
                    "difference": -action["amount"],
                    "action": "sell"
                }
            }
            
            target_allocation = {action["to"]: 100}  # Simple allocation for swap
            
            # Execute using your existing web3_utils
            result = await self.web3_utils.execute_transaction(wallet_address, trades, target_allocation)
            return result.get("tx_hash")
            
        except Exception as e:
            print(f"Error executing trade: {e}")
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
            
            print(f"Planned {len(actions)} trades for strategy {strategy.strategy_id}")
            return actions
            
        except Exception as e:
            print(f"Error planning trades: {e}")
            return []
    
    async def _get_trade_quote(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Get quote for a trade action"""
        try:
            # Mock quote for now - integrate with 1inch or your preferred DEX
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
            print(f"Error getting trade quote: {e}")
            return {
                "error": str(e),
                "estimated_gas": 200000,
                "estimated_cost_usd": 10.0
            }


# Singleton instance
agent_runner_service_instance = None

def get_agent_runner_service(persistence_service: PersistenceService = None) -> AgentRunnerService:
    """Get or create agent runner service instance"""
    global agent_runner_service_instance
    if agent_runner_service_instance is None:
        if persistence_service is None:
            # Import here to avoid circular imports
            from app.services.persistence import get_persistence_service
            persistence_service = get_persistence_service()
        agent_runner_service_instance = AgentRunnerService(persistence_service)
    return agent_runner_service_instance