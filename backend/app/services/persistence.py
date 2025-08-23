# app/services/persistence.py
from datetime import datetime
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from app.models.strategy import Strategy, Execution, DriftEvent, WalletPreferences, Performance
from app.utils.logger import get_logger

logger = get_logger(__name__)

class PersistenceService:
    def __init__(self, db_client: AsyncIOMotorClient, db_name: str = "portfolio_agent"):
        self.db = db_client[db_name]
        self.strategies = self.db.strategies
        self.executions = self.db.executions
        self.drift_events = self.db.drift_events
        self.wallet_preferences = self.db.wallet_preferences
        self.performances = self.db.performances
    
    # Strategy operations
    async def save_strategy(self, strategy: Strategy) -> str:
        """Save a strategy to database"""
        try:
            strategy_dict = strategy.dict(by_alias=True, exclude_unset=True)
            if not strategy_dict.get("strategy_id"):
                strategy_dict["strategy_id"] = f"strategy_{uuid.uuid4().hex[:8]}"
            
            result = await self.strategies.insert_one(strategy_dict)
            logger.info(f"Strategy saved: {strategy_dict['strategy_id']}")
            return strategy_dict["strategy_id"]
        except Exception as e:
            logger.error(f"Error saving strategy: {e}")
            raise
    
    async def save_strategies_batch(self, strategies: List[Strategy]) -> List[str]:
        """Save multiple strategies at once"""
        try:
            strategy_ids = []
            for strategy in strategies:
                strategy_dict = strategy.dict(by_alias=True, exclude_unset=True)
                if not strategy_dict.get("strategy_id"):
                    strategy_dict["strategy_id"] = f"strategy_{uuid.uuid4().hex[:8]}"
                strategy_ids.append(strategy_dict["strategy_id"])
            
            strategy_dicts = [s.dict(by_alias=True, exclude_unset=True) for s in strategies]
            await self.strategies.insert_many(strategy_dicts)
            logger.info(f"Batch saved {len(strategies)} strategies")
            return strategy_ids
        except Exception as e:
            logger.error(f"Error saving strategy batch: {e}")
            raise
    
    async def get_strategy(self, strategy_id: str) -> Optional[Strategy]:
        """Get strategy by ID"""
        try:
            doc = await self.strategies.find_one({"strategy_id": strategy_id})
            return Strategy(**doc) if doc else None
        except Exception as e:
            logger.error(f"Error getting strategy {strategy_id}: {e}")
            return None
    
    async def get_strategies_by_wallet(self, wallet_address: str, limit: int = 10) -> List[Strategy]:
        """Get recent strategies for a wallet"""
        try:
            cursor = self.strategies.find(
                {"wallet_address": wallet_address}
            ).sort("created_at", -1).limit(limit)
            
            docs = await cursor.to_list(length=limit)
            return [Strategy(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting strategies for wallet {wallet_address}: {e}")
            return []
    
    # Execution operations
    async def save_execution(self, execution: Execution) -> str:
        """Save an execution record"""
        try:
            execution_dict = execution.dict(by_alias=True, exclude_unset=True)
            if not execution_dict.get("execution_id"):
                execution_dict["execution_id"] = f"exec_{uuid.uuid4().hex[:8]}"
            
            result = await self.executions.insert_one(execution_dict)
            logger.info(f"Execution saved: {execution_dict['execution_id']}")
            return execution_dict["execution_id"]
        except Exception as e:
            logger.error(f"Error saving execution: {e}")
            raise
    
    async def update_execution_status(
        self, 
        execution_id: str, 
        status: str, 
        tx_hashes: Optional[List[str]] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """Update execution status"""
        try:
            update_data = {"status": status, "updated_at": datetime.utcnow()}
            
            if tx_hashes:
                update_data["tx_hashes"] = tx_hashes
            if error_message:
                update_data["error_message"] = error_message
            if status == "confirmed":
                update_data["confirmed_at"] = datetime.utcnow()
            
            result = await self.executions.update_one(
                {"execution_id": execution_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating execution {execution_id}: {e}")
            return False
    
    async def get_execution(self, execution_id: str) -> Optional[Execution]:
        """Get execution by ID"""
        try:
            doc = await self.executions.find_one({"execution_id": execution_id})
            return Execution(**doc) if doc else None
        except Exception as e:
            logger.error(f"Error getting execution {execution_id}: {e}")
            return None
    
    async def get_executions_by_wallet(
        self, 
        wallet_address: str, 
        limit: int = 20,
        status: Optional[str] = None
    ) -> List[Execution]:
        """Get execution history for wallet"""
        try:
            query = {"wallet_address": wallet_address}
            if status:
                query["status"] = status
            
            cursor = self.executions.find(query).sort("created_at", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            return [Execution(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting executions for wallet {wallet_address}: {e}")
            return []
    
    # Drift event operations
    async def save_drift_event(self, drift_event: DriftEvent) -> str:
        """Save a drift/monitor event"""
        try:
            event_dict = drift_event.dict(by_alias=True, exclude_unset=True)
            result = await self.drift_events.insert_one(event_dict)
            logger.info(f"Drift event saved for wallet {drift_event.wallet_address}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error saving drift event: {e}")
            raise
    
    async def get_unhandled_drift_events(self) -> List[DriftEvent]:
        """Get all unhandled drift events"""
        try:
            cursor = self.drift_events.find({"handled": False}).sort("created_at", 1)
            docs = await cursor.to_list(length=None)
            return [DriftEvent(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting unhandled drift events: {e}")
            return []
    
    async def mark_drift_event_handled(self, event_id: str, strategy_id: Optional[str] = None) -> bool:
        """Mark drift event as handled"""
        try:
            update_data = {"handled": True, "handled_at": datetime.utcnow()}
            if strategy_id:
                update_data["strategy_generated"] = strategy_id
            
            result = await self.drift_events.update_one(
                {"_id": event_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error marking drift event as handled: {e}")
            return False
    
    # Wallet preferences
    async def save_wallet_preferences(self, preferences: WalletPreferences) -> str:
        """Save or update wallet preferences"""
        try:
            preferences_dict = preferences.dict(by_alias=True, exclude_unset=True)
            preferences_dict["updated_at"] = datetime.utcnow()
            
            result = await self.wallet_preferences.replace_one(
                {"wallet_address": preferences.wallet_address},
                preferences_dict,
                upsert=True
            )
            logger.info(f"Preferences saved for wallet {preferences.wallet_address}")
            return preferences.wallet_address
        except Exception as e:
            logger.error(f"Error saving wallet preferences: {e}")
            raise
    
    async def get_wallet_preferences(self, wallet_address: str) -> Optional[WalletPreferences]:
        """Get wallet preferences"""
        try:
            doc = await self.wallet_preferences.find_one({"wallet_address": wallet_address})
            return WalletPreferences(**doc) if doc else None
        except Exception as e:
            logger.error(f"Error getting wallet preferences: {e}")
            return None
    
    async def get_auto_mode_wallets(self) -> List[str]:
        """Get all wallets with auto mode enabled"""
        try:
            cursor = self.wallet_preferences.find({"mode": "auto"})
            docs = await cursor.to_list(length=None)
            return [doc["wallet_address"] for doc in docs]
        except Exception as e:
            logger.error(f"Error getting auto mode wallets: {e}")
            return []
    
    # Performance tracking
    async def save_performance(self, performance: Performance) -> str:
        """Save performance metrics"""
        try:
            performance_dict = performance.dict(by_alias=True, exclude_unset=True)
            result = await self.performances.insert_one(performance_dict)
            logger.info(f"Performance saved for execution {performance.execution_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error saving performance: {e}")
            raise
    
    async def get_wallet_performance_history(
        self, 
        wallet_address: str, 
        days: int = 30
    ) -> List[Performance]:
        """Get performance history for wallet"""
        try:
            from_date = datetime.utcnow() - timedelta(days=days)
            cursor = self.performances.find({
                "wallet_address": wallet_address,
                "created_at": {"$gte": from_date}
            }).sort("created_at", -1)
            
            docs = await cursor.to_list(length=None)
            return [Performance(**doc) for doc in docs]
        except Exception as e:
            logger.error(f"Error getting performance history: {e}")
            return []
    
    # Memory for LLM context
    async def get_wallet_memory_context(self, wallet_address: str, limit: int = 5) -> Dict[str, Any]:
        """Get memory context for LLM prompts"""
        try:
            # Get recent strategies
            recent_strategies = await self.get_strategies_by_wallet(wallet_address, limit=limit)
            
            # Get recent executions
            recent_executions = await self.get_executions_by_wallet(wallet_address, limit=limit)
            
            # Get recent performance
            recent_performance = await self.get_wallet_performance_history(wallet_address, days=7)
            
            # Get preferences
            preferences = await self.get_wallet_preferences(wallet_address)
            
            return {
                "recent_strategies": [s.dict() for s in recent_strategies],
                "recent_executions": [e.dict() for e in recent_executions],
                "recent_performance": [p.dict() for p in recent_performance],
                "preferences": preferences.dict() if preferences else None,
                "context_timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting memory context: {e}")
            return {}

# Singleton instance
persistence_service = None

def get_persistence_service(db_client: AsyncIOMotorClient) -> PersistenceService:
    """Get or create persistence service instance"""
    global persistence_service
    if persistence_service is None:
        persistence_service = PersistenceService(db_client)
    return persistence_service