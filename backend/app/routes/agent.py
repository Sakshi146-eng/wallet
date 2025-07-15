from fastapi import APIRouter
from app.models.request_schemas import AgentQueryRequest
from app.models.response_schemas import AgentResponse
from app.services.agent_runner import run_agent

router = APIRouter()

@router.post("/ask", response_model=AgentResponse)
async def ask_agent(req: AgentQueryRequest):
    reply = await run_agent(req.prompt, req.wallet_address)
    return {"response": reply}


from fastapi import Query
from app.db.mongo import agent_logs

@router.get("/logs")
async def get_logs(wallet_address: str = Query(..., description="Wallet address to filter logs")):
    cursor = agent_logs.find({"wallet_address": wallet_address}).sort("timestamp", -1).limit(20)
    logs = await cursor.to_list(length=20)

    # Convert ObjectId to string for JSON
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs
