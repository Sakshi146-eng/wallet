from datetime import datetime,timezone
from app.db.mongo import agent_logs

async def log_agent_interaction(data: dict):
    data["timestamp"] = datetime.now(timezone.utc)
    await agent_logs.insert_one(data)
#hello