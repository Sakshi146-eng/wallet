from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_env

MONGO_URI = get_env("MONGODB_URI")
MONGO_DB_NAME = "wallet_ai_db"

client = AsyncIOMotorClient(MONGO_URI)
db = client[MONGO_DB_NAME]

agent_logs = db["agent_logs"]
