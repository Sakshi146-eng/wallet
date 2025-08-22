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

# Authentication collection
users = db["users"]


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
        
        # Users indexes - Fixed to avoid duplicate index creation
        try:
            await users.create_index("email", unique=True)
        except Exception as e:
            # Index might already exist, that's okay
            print(f"[INFO] Email index might already exist: {str(e)}")
            
        await users.create_index("created_at")
        await users.create_index("wallet_addresses")
        
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


# USER AUTHENTICATION FUNCTIONS
async def save_user(user_data: dict) -> str:
    """
    Save a new user to the database.
    
    Args:
        user_data: User information including email, hashed_password, wallet_addresses, etc.
    
    Returns:
        User ID
    """
    try:
        result = await users.insert_one(user_data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"[ERROR] Failed to save user: {str(e)}")
        raise


async def get_user_by_email(email: str) -> dict:
    """
    Get user by email address.
    
    Args:
        email: User email address
    
    Returns:
        User document or None if not found
    """
    try:
        user = await users.find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        print(f"[ERROR] Failed to get user by email: {str(e)}")
        return None


async def get_user_by_id(user_id: str) -> dict:
    """
    Get user by user ID.
    
    Args:
        user_id: User ID
    
    Returns:
        User document or None if not found
    """
    try:
        from bson import ObjectId
        user = await users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        print(f"[ERROR] Failed to get user by ID: {str(e)}")
        return None


async def update_user_wallet_addresses(email: str, wallet_address: str) -> bool:
    """
    Add a wallet address to user's wallet_addresses list.
    
    Args:
        email: User email
        wallet_address: Wallet address to add
    
    Returns:
        True if successful, False otherwise
    """
    try:
        from datetime import datetime, timezone
        
        result = await users.update_one(
            {"email": email},
            {
                "$addToSet": {"wallet_addresses": wallet_address},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"[ERROR] Failed to update user wallet addresses: {str(e)}")
        return False


async def update_user_profile(email: str, update_data: dict) -> bool:
    """
    Update user profile information.
    
    Args:
        email: User email
        update_data: Dictionary of fields to update
    
    Returns:
        True if successful, False otherwise
    """
    try:
        from datetime import datetime, timezone
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = await users.update_one(
            {"email": email},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"[ERROR] Failed to update user profile: {str(e)}")
        return False


async def delete_user(email: str) -> bool:
    """
    Delete a user from the database.
    
    Args:
        email: User email
    
    Returns:
        True if successful, False otherwise
    """
    try:
        result = await users.delete_one({"email": email})
        return result.deleted_count > 0
    except Exception as e:
        print(f"[ERROR] Failed to delete user: {str(e)}")
        return False


async def get_users_by_wallet(wallet_address: str) -> list:
    """
    Get all users associated with a wallet address.
    
    Args:
        wallet_address: Wallet address to search for
    
    Returns:
        List of user documents
    """
    try:
        cursor = users.find({"wallet_addresses": wallet_address})
        
        user_list = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            # Remove sensitive information
            doc.pop("hashed_password", None)
            user_list.append(doc)
        
        return user_list
    except Exception as e:
        print(f"[ERROR] Failed to get users by wallet: {str(e)}")
        return []


async def get_user_stats() -> dict:
    """
    Get user statistics.
    
    Returns:
        Dictionary with user statistics
    """
    try:
        total_users = await users.count_documents({})
        
        # Users with wallet addresses
        users_with_wallets = await users.count_documents(
            {"wallet_addresses": {"$exists": True, "$ne": []}}
        )
        
        # Recent signups (last 7 days)
        from datetime import datetime, timezone, timedelta
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_signups = await users.count_documents(
            {"created_at": {"$gte": week_ago}}
        )
        
        return {
            "total_users": total_users,
            "users_with_wallets": users_with_wallets,
            "recent_signups": recent_signups
        }
    except Exception as e:
        print(f"[ERROR] Failed to get user stats: {str(e)}")
        return {}


async def cleanup_inactive_users(days_inactive: int = 90) -> int:
    """
    Clean up inactive users (optional - be careful with this).
    
    Args:
        days_inactive: Number of days without login to consider inactive
    
    Returns:
        Number of users cleaned up
    """
    try:
        from datetime import datetime, timezone, timedelta
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_inactive)
        
        # Only delete users who haven't logged in recently AND have no wallet addresses
        result = await users.delete_many({
            "last_login": {"$lt": cutoff_date},
            "$or": [
                {"wallet_addresses": {"$exists": False}},
                {"wallet_addresses": {"$size": 0}}
            ]
        })
        
        deleted_count = result.deleted_count
        if deleted_count > 0:
            print(f"[INFO] Cleaned up {deleted_count} inactive users")
        
        return deleted_count
    except Exception as e:
        print(f"[ERROR] Failed to cleanup inactive users: {str(e)}")
        return 0