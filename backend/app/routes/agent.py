from fastapi import APIRouter
from app.models.request_schemas import AgentQueryRequest
from app.models.response_schemas import AgentResponse
from app.services.agent_runner import run_agent

router = APIRouter()

@router.post("/ask", response_model=AgentResponse)
async def ask_agent(req: AgentQueryRequest):
    reply = await run_agent(req.prompt, req.wallet_address)
    return {"response": reply}
