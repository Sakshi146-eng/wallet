import uuid
from typing import Dict, List
from datetime import datetime, timezone
import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.request_schemas import AgentQueryRequest
from app.routes.agent import build_prompt, parse_strategies
from app.services.agent_runner import llm
from app.services.coingecko import fetch_token_prices
from app.services.wallet_utils import get_eth_balance, get_erc20_balance
from app.db.mongo import strategies, save_strategy, save_wallet_info

router = APIRouter()


# Utility to assign a unique ID to each strategy and save to DB
async def attach_ids_and_save(strategies_list: list, wallet_address: str, user_prompt: str):
    """
    Attach unique IDs to strategies and save them to database.
    
    Args:
        strategies_list: List of strategy dictionaries
        wallet_address: Wallet address that requested strategies
        user_prompt: Original user prompt
    
    Returns:
        Updated strategies list with IDs
    """
    for strategy in strategies_list:
        strategy_id = f"strategy_{uuid.uuid4().hex[:8]}"
        strategy["strategy_id"] = strategy_id
        
        # Prepare strategy document for database
        strategy_doc = {
            "strategy_id": strategy_id,
            "wallet_address": wallet_address,
            "user_prompt": user_prompt,
            "label": strategy.get("label", "Unknown Strategy"),
            "target_allocation": strategy.get("target_allocation", {}),
            "rationale": strategy.get("rationale", ""),
            "expected_return": strategy.get("expected_return", 0),
            "sharpe_ratio": strategy.get("sharpe_ratio", 0),
            "risk_level": strategy.get("risk_level", "medium"),
            "created_at": datetime.now(timezone.utc),
            "status": "generated",
            "implementation_status": "not_implemented"
        }
        
        # Save strategy to database
        try:
            await save_strategy(strategy_doc)
            print(f"[INFO] Saved strategy {strategy_id} to database")
        except Exception as e:
            print(f"[ERROR] Failed to save strategy {strategy_id}: {str(e)}")
    
    return strategies_list


# Endpoint 1: Generate Rebalance Strategies
@router.post("/agent/rebalance")
async def generate_rebalance(data: AgentQueryRequest):
    w_address = data.wallet_address
    user_prompt = data.prompt

    try:
        print("[INFO] Rebalance request triggered.")
        async with aiohttp.ClientSession() as session:
            eth = await get_eth_balance(w_address, session)
            usdc = await get_erc20_balance(w_address, " b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6, session) #OWN
            link = await get_erc20_balance(w_address, "0x514910771af9ca656af840dff83e8264ecf986ca", 18, session)

        balances = {"ETH": eth, "USDC": usdc, "LINK": link}
        prices = await fetch_token_prices(["ETH", "USDC", "LINK"])
        usd_values = {k: round(v * prices[k], 2) for k, v in balances.items()}
        total = round(sum(usd_values.values()), 2)

        # Save current wallet state
        wallet_data = {
            "wallet_address": w_address,
            "current_balances": balances,
            "current_usd_values": usd_values,
            "total_portfolio_value": total,
            "prices_snapshot": prices,
            "last_updated": datetime.now(timezone.utc),
            "last_query": user_prompt
        }
        await save_wallet_info(wallet_data)

        prompt = build_prompt(eth, usd_values["ETH"], usdc, usd_values["USDC"], link, usd_values["LINK"], total, user_prompt)
        llm_output = llm.invoke(prompt)
        raw_text = llm_output.content if hasattr(llm_output, "content") else str(llm_output)
        print("RAW_TEXT:", raw_text)
        
        strategies_list = parse_strategies(raw_text)
        strategies_list = await attach_ids_and_save(strategies_list, w_address, user_prompt)
        print("STRATEGIES:", strategies_list)

        print("[INFO] Returning generated strategies.")
        return {
            "strategies": strategies_list,
            "total_usd_value": total,
            "wallet_summary": balances,
            "prices": prices,
            "generation_timestamp": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        print(f"[ERROR] Rebalance generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Data model for choosing a strategy
class Strategy(BaseModel):
    strategy_id: str
    label: str
    target_allocation: Dict[str, int]
    rationale: str
    expected_return: float = 0
    sharpe_ratio: float = 0


class StrategySelectionRequest(BaseModel):
    wallet_address: str
    chosen_strategy: Strategy


# Endpoint 2: User Chooses a Strategy
@router.post("/agent/choose")
async def choose_strategy(data: StrategySelectionRequest):
    try:
        strategy = data.chosen_strategy
        wallet = data.wallet_address

        # Update strategy status in database
        await strategies.update_one(
            {"strategy_id": strategy.strategy_id},
            {
                "$set": {
                    "status": "selected",
                    "selected_at": datetime.now(timezone.utc),
                    "selected_by_wallet": wallet
                }
            }
        )

        # Mark other strategies for this wallet as not selected
        await strategies.update_many(
            {
                "wallet_address": wallet,
                "strategy_id": {"$ne": strategy.strategy_id},
                "status": "generated"
            },
            {
                "$set": {
                    "status": "not_selected",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

        print(f"[INFO] Strategy {strategy.strategy_id} selected for wallet {wallet}")

        return {
            "status": "success",
            "message": f"Strategy '{strategy.label}' selected for wallet {wallet[:8]}...****",
            "applied_strategy": strategy.target_allocation,
            "strategy_id": strategy.strategy_id,
            "rationale": strategy.rationale,
            "expected_return": strategy.expected_return,
            "sharpe_ratio": strategy.sharpe_ratio,
            "next_steps": [
                "Review allocation charts and metrics",
                "Preview estimated gas fees and execution plan",
                "Execute rebalancing transaction on Sepolia testnet",
                "Monitor transaction status and portfolio performance"
            ],
            "ready_for_execution": True
        }

    except Exception as e:
        print(f"[ERROR] Strategy selection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Endpoint 3: Get Strategy Details
@router.get("/strategy/{strategy_id}")
async def get_strategy_details(strategy_id: str):
    """
    Get detailed information about a specific strategy.
    """
    try:
        from app.db.mongo import get_strategy
        
        strategy = await get_strategy(strategy_id)
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        return {
            "strategy": strategy,
            "status": "success"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to get strategy details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Endpoint 4: Get All Strategies for Wallet
@router.get("/strategies")
async def get_wallet_strategies(wallet: str, status: str = None):
    """
    Get all strategies generated for a wallet address.
    
    Args:
        wallet: Wallet address
        status: Optional status filter ('generated', 'selected', 'implemented')
    """
    try:
        query_filter = {"wallet_address": wallet}
        if status:
            query_filter["status"] = status
        
        cursor = strategies.find(query_filter).sort("created_at", -1)
        
        strategy_list = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            strategy_list.append(doc)
        
        return {
            "wallet_address": wallet,
            "total_strategies": len(strategy_list),
            "strategies": strategy_list,
            "filter_applied": status
        }
    
    except Exception as e:
        print(f"[ERROR] Failed to get wallet strategies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))