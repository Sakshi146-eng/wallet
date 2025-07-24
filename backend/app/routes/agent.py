from fastapi import APIRouter
from app.models.request_schemas import AgentQueryRequest
from app.models.response_schemas import AgentResponse
from app.services.agent_runner import run_agent

from fastapi import Query
from app.db.mongo import agent_logs

from app.services.agent_runner import llm
from langchain_core.messages import AIMessage

router = APIRouter()

from app.services.fallback_parser import fallback_parse  #import fallback 

@router.post("/ask", response_model=AgentResponse)
async def ask_agent(req: AgentQueryRequest):
    try:
        reply = await run_agent(req.prompt, req.wallet_address)

        if reply:
            return {"response": {"content": reply, "source": "live"}}

        
        if reply is None:
            return {
            "response": {
                "error": "Could not process your prompt",
                "source": "fallback",
                "advice": "Try again later or check your internet connection."
            }
        }

    except Exception as e:
        print("[LLM Error]", e)

    #Fallback response
    fallback = fallback_parse(req.prompt)
    if fallback:
        return {
            "response": {
                "source": "fallback",
                "data": fallback
            }
        }

    return {"response": {"error": "Could not process your prompt"}}





@router.get("/logs")
async def get_logs(wallet_address: str = Query(..., description="Wallet address to filter logs")):
    cursor = agent_logs.find({"wallet_address": wallet_address}).sort("timestamp", -1).limit(20)
    logs = await cursor.to_list(length=20)

    # Convert ObjectId to string for JSON
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs


@router.get("/summary")
async def get_wallet_summary(wallet_address: str = Query(...), limit: int = 5):
    cursor = agent_logs.find({"wallet_address": wallet_address}).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)

    if not logs:
        return {"summary": "No history found for this wallet."}

    history = "\n---\n".join([
        f"Prompt: {log['user_prompt']}\nResponse: {log['agent_response']}" for log in logs
    ])

    prompt = f"""You are a crypto analysis assistant.Summarize the following interaction history for wallet {wallet_address} into 3-5 bullet points of DeFi advice/actions.
    {history}
"""

    result = llm.invoke(prompt)
    if isinstance(result, AIMessage):
        return {"summary": result.content}
    return {"summary": str(result)}

#------------------------
import re
from app.models. request_schemas import AgentQueryRequest
from app.services.wallet_utils import get_all_token_balances,get_erc20_balance,get_eth_balance
import aiohttp
from app.services.coingecko import fetch_token_prices

def build_prompt(eth, eth_usd, usdc, usdc_usd, link, link_usd, total, user_prompt):
    return f"""
You are a crypto portfolio rebalancing agent.

Based on the wallet's token holdings and market prices, generate **3 optimal portfolio strategies** with the following for each:
1. A strategy label (e.g., Conservative, Balanced)
2. Target % allocation across ETH, USDC, LINK
3. Rationale for the recommendation (risk, stability, yield, etc.)

Wallet Balances:
- ETH: {eth:.4f} (${eth_usd:,.2f})
- USDC: {usdc:.2f} (${usdc_usd:,.2f})
- LINK: {link:.2f} (${link_usd:,.2f})
Total Portfolio USD: ~${total:,.2f}

User request: {user_prompt}
"""

def parse_strategies(response: str):
    blocks = re.split(r"\n\s*\n", response.strip())
    strategies = []

    for block in blocks:
        lines = block.splitlines()
        if len(lines) >= 3:
            label = lines[0].strip(":- ")
            target = {}
            rationale = ""

            for line in lines[1:]:
                if "%" in line:
                    parts = re.findall(r"([A-Z]+)\s*[:\-]?\s*(\d+)%", line)
                    for token, percent in parts:
                        target[token] = int(percent)
                elif line.strip():
                    rationale += line.strip() + " "

            if target:
                strategies.append({
                    "label": label,
                    "target_allocation": target,
                    "rationale": rationale.strip()
                })
    return strategies

