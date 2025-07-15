from fastapi import APIRouter
from app.models.request_schemas import AgentQueryRequest
from app.models.response_schemas import AgentResponse
from app.services.agent_runner import run_agent

from fastapi import Query
from app.db.mongo import agent_logs

from app.services.agent_runner import llm
from datetime import datetime
from langchain_core.messages import AIMessage

router = APIRouter()


@router.post("/ask", response_model=AgentResponse)
async def ask_agent(req: AgentQueryRequest):
    reply = await run_agent(req.prompt, req.wallet_address)
    return {"response": reply}




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