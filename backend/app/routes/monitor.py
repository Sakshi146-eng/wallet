# app/routes/monitor.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime

from app.services.persistence import get_persistence_service, PersistenceService
from app.services.monitor import get_monitor_service, MonitorService
from app.models.strategy import DriftEvent, WalletPreferences
from app.models.request_schemas import (
    WalletSubscribeRequest, 
    ForceCheckRequest,
    WalletPreferencesRequest
)
from app.models.response_schemas import (
    AgentStatusResponse,
    MonitorEventsResponse,
    MonitorStatusResponse
)

router = APIRouter(prefix="/monitor", tags=["monitoring"])

@router.post("/subscribe")
async def subscribe_wallet(
    request: WalletSubscribeRequest,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Subscribe a wallet to agent monitoring"""
    try:
        preferences = WalletPreferences(
            wallet_address=request.wallet_address,
            mode=request.mode,
            risk_profile=request.risk_profile,
            auto_execute=request.auto_execute,
            drift_threshold=request.threshold,
            max_trade_pct=request.max_trade_pct or 20.0,
            slippage_pct=request.slippage_pct or 1.0
        )
        
        await persistence.save_wallet_preferences(preferences)
        
        return {
            "status": "success",
            "message": f"Wallet {request.wallet_address} subscribed to {request.mode} mode",
            "preferences": preferences.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error subscribing wallet: {str(e)}")

@router.get("/status/{wallet_address}")
async def get_agent_status(
    wallet_address: str,
    persistence: PersistenceService = Depends(get_persistence_service)
) -> AgentStatusResponse:
    """Get agent status for a specific wallet"""
    try:
        preferences = await persistence.get_wallet_preferences(wallet_address)
        recent_executions = await persistence.get_executions_by_wallet(wallet_address, limit=5)
        recent_events = await persistence.drift_events.find(
            {"wallet_address": wallet_address}
        ).sort("created_at", -1).limit(5).to_list(length=5)
        
        return AgentStatusResponse(
            wallet_address=wallet_address,
            mode=preferences.mode if preferences else "manual",
            auto_execute=preferences.auto_execute if preferences else False,
            last_check=datetime.utcnow(),  # TODO: Get actual last check time
            recent_executions=[exec.dict() for exec in recent_executions],
            recent_events=[DriftEvent(**event).dict() for event in recent_events],
            preferences=preferences.dict() if preferences else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting agent status: {str(e)}")

@router.get("/events/{wallet_address}")
async def get_monitor_events(
    wallet_address: str,
    limit: int = 20,
    event_type: Optional[str] = None,
    persistence: PersistenceService = Depends(get_persistence_service)
) -> MonitorEventsResponse:
    """Get monitoring events for a wallet"""
    try:
        query = {"wallet_address": wallet_address}
        if event_type:
            query["event_type"] = event_type
            
        cursor = persistence.drift_events.find(query).sort("created_at", -1).limit(limit)
        events = await cursor.to_list(length=limit)
        
        return MonitorEventsResponse(
            wallet_address=wallet_address,
            events=[DriftEvent(**event).dict() for event in events],
            total_count=len(events)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting monitor events: {str(e)}")

@router.post("/force-check")
async def force_wallet_check(
    request: ForceCheckRequest,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Force a monitoring check for a specific wallet"""
    try:
        monitor = get_monitor_service(persistence)
        success = await monitor.force_wallet_check(request.wallet_address)
        
        if success:
            return {
                "status": "success",
                "message": f"Force check completed for wallet {request.wallet_address}",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Force check failed")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in force check: {str(e)}")

@router.get("/service-status")
async def get_monitor_service_status(
    persistence: PersistenceService = Depends(get_persistence_service)
) -> MonitorStatusResponse:
    """Get monitoring service status"""
    try:
        monitor = get_monitor_service(persistence)
        status = await monitor.get_monitor_status()
        return MonitorStatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting service status: {str(e)}")

@router.post("/start")
async def start_monitoring_service(
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Start the monitoring service"""
    try:
        monitor = get_monitor_service(persistence)
        await monitor.start_monitoring()
        return {
            "status": "success",
            "message": "Monitoring service started",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting monitor service: {str(e)}")

@router.post("/stop")
async def stop_monitoring_service(
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Stop the monitoring service"""
    try:
        monitor = get_monitor_service(persistence)
        await monitor.stop_monitoring()
        return {
            "status": "success",
            "message": "Monitoring service stopped",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping monitor service: {str(e)}")

@router.get("/preferences/{wallet_address}")
async def get_wallet_preferences(
    wallet_address: str,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Get wallet monitoring preferences"""
    try:
        preferences = await persistence.get_wallet_preferences(wallet_address)
        if not preferences:
            raise HTTPException(status_code=404, detail="No preferences found for this wallet")
        
        return preferences.dict()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting preferences: {str(e)}")

@router.put("/preferences/{wallet_address}")
async def update_wallet_preferences(
    wallet_address: str,
    request: WalletPreferencesRequest,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Update wallet monitoring preferences"""
    try:
        preferences = WalletPreferences(
            wallet_address=wallet_address,
            mode=request.mode,
            risk_profile=request.risk_profile,
            auto_execute=request.auto_execute,
            drift_threshold=request.drift_threshold,
            max_trade_pct=request.max_trade_pct,
            slippage_pct=request.slippage_pct
        )
        
        await persistence.save_wallet_preferences(preferences)
        
        return {
            "status": "success",
            "message": f"Preferences updated for wallet {wallet_address}",
            "preferences": preferences.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating preferences: {str(e)}")