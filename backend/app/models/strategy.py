# app/models/strategy.py
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from bson import ObjectId

class Strategy(BaseModel):
    """Strategy model for persistence"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    strategy_id: str
    wallet_address: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    source: str = "llm"  # llm, manual, auto
    label: str
    target_allocation: Dict[str, int]  # {"ETH": 60, "USDC": 30, "LINK": 10}
    rationale: str
    raw_agent_response: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Execution(BaseModel):
    """Execution model for persistence"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    execution_id: str
    wallet_address: str
    strategy_id: str
    actions: List[Dict[str, Any]]  # List of swap actions
    mode: str  # "simulate" or "execute"
    tx_hashes: List[str] = Field(default_factory=list)
    status: str = "queued"  # simulated, queued, pending, confirmed, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: Optional[datetime] = None
    gas_used: Optional[int] = None
    gas_price: Optional[str] = None
    total_cost_usd: Optional[float] = None
    note: str = ""
    error_message: Optional[str] = None
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DriftEvent(BaseModel):
    """Drift/monitor event model"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    wallet_address: str
    event_type: str  # "drift", "large_tx", "price_shock", "rebalance_needed"
    details: Dict[str, Any]
    threshold_breached: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    handled: bool = False
    strategy_generated: Optional[str] = None  # strategy_id if auto-generated
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class WalletPreferences(BaseModel):
    """User wallet preferences for agent mode"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    wallet_address: str
    mode: str = "manual"  # "auto" or "manual"
    risk_profile: str = "balanced"  # "conservative", "balanced", "aggressive"
    auto_execute: bool = False
    max_trade_pct: float = 20.0  # Max % of portfolio per trade
    drift_threshold: float = 0.10  # 10% drift before rebalance
    slippage_pct: float = 1.0
    notify_via: List[str] = Field(default_factory=lambda: ["in_app"])
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Performance(BaseModel):
    """Performance tracking for learning"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    wallet_address: str
    strategy_id: str
    execution_id: str
    start_balances: Dict[str, float]
    end_balances: Dict[str, float]
    start_usd_value: float
    end_usd_value: float
    pnl_usd: float
    pnl_pct: float
    duration_hours: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}