import uuid
from typing import Dict, List
import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.request_schemas import AgentQueryRequest
from app.routes.agent import build_prompt, parse_strategies
from app.services.agent_runner import llm
from app.services.coingecko import fetch_token_prices
from app.services.wallet_utils import get_eth_balance, get_erc20_balance

router = APIRouter()


# Utility to assign a unique ID to each strategy
def attach_ids(strategies: list):
    for strategy in strategies:
        strategy["strategy_id"] = f"strategy_{uuid.uuid4().hex[:8]}"
    return strategies


# Endpoint 1: Generate Rebalance Strategies
@router.post("/agent/rebalance")
async def generate_rebalance(data: AgentQueryRequest):
    w_address = data.wallet_address
    user_prompt = data.prompt

    try:
        print("[INFO] Rebalance request triggered.")
        async with aiohttp.ClientSession() as session:
            eth = await get_eth_balance(w_address, session)
            usdc = await get_erc20_balance(w_address, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6, session)
            link = await get_erc20_balance(w_address, "0x514910771af9ca656af840dff83e8264ecf986ca", 18, session)

        balances = {"ETH": eth, "USDC": usdc, "LINK": link}
        prices = await fetch_token_prices(["ETH", "USDC", "LINK"])
        usd_values = {k: round(v * prices[k], 2) for k, v in balances.items()}
        total = round(sum(usd_values.values()), 2)

        prompt = build_prompt(eth, usd_values["ETH"], usdc, usd_values["USDC"], link, usd_values["LINK"], total, user_prompt)
        llm_output = llm.invoke(prompt)
        raw_text = llm_output.content if hasattr(llm_output, "content") else str(llm_output)
        strategies = parse_strategies(raw_text)
        strategies = attach_ids(strategies)

        print("[INFO] Returning generated strategies.")
        return {
            "strategies": strategies,
            "total_usd_value": total,
            "wallet_summary": balances
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Data model for choosing a strategy
class Strategy(BaseModel):
    strategy_id: str
    label: str
    target_allocation: Dict[str, int]
    rationale: str


class StrategySelectionRequest(BaseModel):
    wallet_address: str
    chosen_strategy: Strategy


# Endpoint 2: User Chooses a Strategy
@router.post("/agent/choose")
async def choose_strategy(data: StrategySelectionRequest):
    try:
        strategy = data.chosen_strategy
        wallet = data.wallet_address

        return {
            "status": "success",
            "message": f"Strategy '{strategy.label}' selected for wallet {wallet[:8]}...****",
            "applied_strategy": strategy.target_allocation,
            "strategy_id": strategy.strategy_id,
            "rationale": strategy.rationale,
            "next_steps": [
                "Show rebalance charts in frontend",
                "Preview on-chain execution",
                "Execute and track results"
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
