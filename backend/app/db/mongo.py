from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_env

MONGO_URI = get_env("MONGODB_URI")
MONGO_DB_NAME = "wallet_ai_db"

client = AsyncIOMotorClient(MONGO_URI)
db = client[MONGO_DB_NAME]

# Existing collections
agent_logs = db["agent_logs"]

# New collections for strategy execution
strategies = db["strategies"]
executions = db["executions"]
wallets = db["wallets"]

# Collection schemas and indexes
async def setup_database():
    """
    Set up database collections with proper indexes.
    Call this during application startup.
    """
    try:
        # Create indexes for better query performance
        
        # Agent logs indexes
        await agent_logs.create_index("timestamp")
        await agent_logs.create_index("wallet_address")
        
        # Strategies indexes
        await strategies.create_index("strategy_id", unique=True)
        await strategies.create_index("wallet_address")
        await strategies.create_index("created_at")
        
        # Executions indexes
        await executions.create_index("execution_id", unique=True)
        await executions.create_index("wallet_address")
        await executions.create_index("strategy_id")
        await executions.create_index("tx_hash")
        await executions.create_index("status")
        await executions.create_index("created_at")
        
        # Wallets indexes
        await wallets.create_index("wallet_address", unique=True)
        await wallets.create_index("last_updated")
        
        print("[INFO] Database indexes created successfully")
        
    except Exception as e:
        print(f"[ERROR] Failed to setup database: {str(e)}")


# Helper functions for database operations
async def save_strategy(strategy_data: dict) -> str:
    """
    Save a generated strategy to the database.
    
    Args:
        strategy_data: Strategy information including allocations and rationale
    
    Returns:
        Strategy ID
    """
    try:
        result = await strategies.insert_one(strategy_data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"[ERROR] Failed to save strategy: {str(e)}")
        raise


async def get_strategy(strategy_id: str) -> dict:
    """
    Retrieve a strategy by ID.
    
    Args:
        strategy_id: Unique strategy identifier
    
    Returns:
        Strategy document or None if not found
    """
    try:
        strategy = await strategies.find_one({"strategy_id": strategy_id})
        if strategy:
            strategy["_id"] = str(strategy["_id"])
        return strategy
    except Exception as e:
        print(f"[ERROR] Failed to get strategy: {str(e)}")
        return None


async def save_execution(execution_data: dict) -> str:
    """
    Save an execution record to the database.
    
    Args:
        execution_data: Execution information including tx hash and status
    
    Returns:
        Execution ID
    """
    try:
        result = await executions.insert_one(execution_data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"[ERROR] Failed to save execution: {str(e)}")
        raise


async def update_execution_status(execution_id: str, status: str, additional_data: dict = None) -> bool:
    """
    Update execution status and optionally add more data.
    
    Args:
        execution_id: Unique execution identifier
        status: New status ('pending', 'confirmed', 'failed')
        additional_data: Optional additional data to update
    
    Returns:
        True if successful, False otherwise
    """
    try:
        update_data = {"status": status}
        if additional_data:
            update_data.update(additional_data)
        
        result = await executions.update_one(
            {"execution_id": execution_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"[ERROR] Failed to update execution status: {str(e)}")
        return False


async def get_wallet_executions(wallet_address: str, limit: int = 50) -> list:
    """
    Get execution history for a wallet.
    
    Args:
        wallet_address: Wallet address to query
        limit: Maximum number of executions to return
    
    Returns:
        List of execution documents
    """
    try:
        cursor = executions.find(
            {"wallet_address": wallet_address}
        ).sort("created_at", -1).limit(limit)
        
        execution_list = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            execution_list.append(doc)
        
        return execution_list
    except Exception as e:
        print(f"[ERROR] Failed to get wallet executions: {str(e)}")
        return []


async def save_wallet_info(wallet_data: dict) -> bool:
    """
    Save or update wallet information.
    
    Args:
        wallet_data: Wallet information including balances and metadata
    
    Returns:
        True if successful, False otherwise
    """
    try:
        result = await wallets.update_one(
            {"wallet_address": wallet_data["wallet_address"]},
            {"$set": wallet_data},
            upsert=True
        )
        return True
    except Exception as e:
        print(f"[ERROR] Failed to save wallet info: {str(e)}")
        return False


async def get_wallet_info(wallet_address: str) -> dict:
    """
    Get wallet information from database.
    
    Args:
        wallet_address: Wallet address to query
    
    Returns:
        Wallet document or None if not found
    """
    try:
        wallet = await wallets.find_one({"wallet_address": wallet_address})
        if wallet:
            wallet["_id"] = str(wallet["_id"])
        return wallet
    except Exception as e:
        print(f"[ERROR] Failed to get wallet info: {str(e)}")
        return None


# Statistics and analytics functions
async def get_execution_stats(wallet_address: str = None) -> dict:
    """
    Get execution statistics.
    
    Args:
        wallet_address: Optional wallet address to filter by
    
    Returns:
        Dictionary with execution statistics
    """
    try:
        match_filter = {}
        if wallet_address:
            match_filter["wallet_address"] = wallet_address
        
        pipeline = [
            {"$match": match_filter},
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                    "total_portfolio_value": {"$sum": "$total_portfolio_value_usd"}
                }
            }
        ]
        
        stats = {}
        async for doc in executions.aggregate(pipeline):
            stats[doc["_id"]] = {
                "count": doc["count"],
                "total_value": doc["total_portfolio_value"]
            }
        
        return stats
    except Exception as e:
        print(f"[ERROR] Failed to get execution stats: {str(e)}")
        return {}


async def cleanup_old_logs(days_to_keep: int = 30) -> int:
    """
    Clean up old logs and data.
    
    Args:
        days_to_keep: Number of days to keep data
    
    Returns:
        Number of documents deleted
    """
    try:
        from datetime import datetime, timezone, timedelta
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        # Clean up old agent logs
        logs_result = await agent_logs.delete_many(
            {"timestamp": {"$lt": cutoff_date}}
        )
        
        # Clean up old executions (keep all for now, but could add logic here)
        # executions_result = await executions.delete_many(...)
        
        total_deleted = logs_result.deleted_count
        print(f"[INFO] Cleaned up {total_deleted} old documents")
        
        return total_deleted
    except Exception as e:
        print(f"[ERROR] Failed to cleanup old logs: {str(e)}")
        return 0