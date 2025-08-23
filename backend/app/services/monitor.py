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
    monitor: MonitorService = Depends(get_monitor_service)
):
    """Force a monitoring check for a specific wallet"""
    try:
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
    monitor: MonitorService = Depends(get_monitor_service)
) -> MonitorStatusResponse:
    """Get monitoring service status"""
    try:
        status = await monitor.get_monitor_status()
        return MonitorStatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting service status: {str(e)}")


# app/routes/agent_enhanced.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional, Dict, Any
import uuid

from app.services.persistence import get_persistence_service, PersistenceService
from app.services.rebalance import RebalanceService
from app.services.agent_runner import get_agent_runner_service, AgentRunnerService
from app.models.strategy import Strategy, Execution
from app.models.request_schemas import (
    RebalanceRequest, 
    ChooseStrategyRequest, 
    ExecuteRequest,
    FeedbackRequest
)
from app.models.response_schemas import (
    RebalanceResponse,
    ExecutionResponse,
    HistoryResponse
)

router = APIRouter(prefix="/agent", tags=["agent"])

@router.post("/rebalance")
async def generate_rebalance_strategies(
    request: RebalanceRequest,
    background_tasks: BackgroundTasks,
    persistence: PersistenceService = Depends(get_persistence_service),
    rebalance_service: RebalanceService = Depends()
) -> RebalanceResponse:
    """Generate rebalance strategies and persist them"""
    try:
        # Generate strategies using existing rebalance service
        strategies_data = await rebalance_service.generate_strategies(
            wallet_address=request.wallet_address,
            prompt=request.prompt
        )
        
        # Convert to Strategy models and save
        strategies = []
        strategy_ids = []
        
        for strategy_data in strategies_data.get("strategies", []):
            strategy = Strategy(
                strategy_id=f"strategy_{uuid.uuid4().hex[:8]}",
                wallet_address=request.wallet_address,
                label=strategy_data.get("label", "Generated Strategy"),
                target_allocation=strategy_data.get("target_allocation", {}),
                rationale=strategy_data.get("rationale", ""),
                raw_agent_response=strategies_data.get("raw_agent_response", ""),
                metadata={
                    "trigger": request.trigger or "manual",
                    "total_usd_value": strategies_data.get("total_usd_value"),
                    "wallet_summary": strategies_data.get("wallet_summary")
                }
            )
            strategies.append(strategy)
            strategy_ids.append(strategy.strategy_id)
        
        # Save strategies in background
        background_tasks.add_task(persistence.save_strategies_batch, strategies)
        
        return RebalanceResponse(
            strategies=[s.dict() for s in strategies],
            wallet_summary=strategies_data.get("wallet_summary", {}),
            total_usd_value=strategies_data.get("total_usd_value", 0),
            raw_agent_response=strategies_data.get("raw_agent_response", "")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating strategies: {str(e)}")

@router.post("/choose")
async def choose_strategy(
    request: ChooseStrategyRequest,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Choose and persist a strategy selection"""
    try:
        strategy = await persistence.get_strategy(request.chosen_strategy_id)
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        # TODO: Implement strategy selection persistence logic
        # This might involve updating strategy status or creating a selection record
        
        return {
            "status": "success",
            "chosen_strategy": strategy.dict(),
            "message": f"Strategy {request.chosen_strategy_id} selected successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error choosing strategy: {str(e)}")

@router.post("/execute")
async def execute_strategy(
    request: ExecuteRequest,
    background_tasks: BackgroundTasks,
    persistence: PersistenceService = Depends(get_persistence_service),
    agent_runner: AgentRunnerService = Depends(get_agent_runner_service)
) -> ExecutionResponse:
    """Execute or simulate a strategy"""
    try:
        strategy = await persistence.get_strategy(request.strategy_id)
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        # Create execution record
        execution = Execution(
            execution_id=f"exec_{uuid.uuid4().hex[:8]}",
            wallet_address=request.wallet_address,
            strategy_id=request.strategy_id,
            mode=request.mode,
            actions=[],  # Will be populated by agent runner
            status="queued"
        )
        
        execution_id = await persistence.save_execution(execution)
        
        # Execute in background
        if request.mode == "simulate":
            background_tasks.add_task(
                agent_runner.simulate_strategy, 
                execution_id, 
                strategy
            )
        else:  # execute
            background_tasks.add_task(
                agent_runner.execute_strategy, 
                execution_id, 
                strategy
            )
        
        return ExecutionResponse(
            execution_id=execution_id,
            status="queued",
            mode=request.mode,
            strategy_id=request.strategy_id,
            message=f"Strategy {request.mode} queued successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing strategy: {str(e)}")

@router.get("/executions/{wallet_address}")
async def get_execution_history(
    wallet_address: str,
    limit: int = 20,
    status: Optional[str] = None,
    persistence: PersistenceService = Depends(get_persistence_service)
) -> HistoryResponse:
    """Get execution history for a wallet"""
    try:
        executions = await persistence.get_executions_by_wallet(
            wallet_address, 
            limit=limit, 
            status=status
        )
        
        return HistoryResponse(
            wallet_address=wallet_address,
            executions=[exec.dict() for exec in executions],
            total_count=len(executions)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting execution history: {str(e)}")

@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Submit user feedback for an execution"""
    try:
        # TODO: Implement feedback storage and learning system
        # For now, just log the feedback
        
        return {
            "status": "success",
            "message": "Feedback received successfully",
            "feedback_id": f"feedback_{uuid.uuid4().hex[:8]}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

@router.get("/simulations/{strategy_id}")
async def get_strategy_simulations(
    strategy_id: str,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Get simulation history for a strategy"""
    try:
        simulations = await persistence.executions.find({
            "strategy_id": strategy_id,
            "mode": "simulate"
        }).sort("created_at", -1).to_list(length=10)
        
        return {
            "strategy_id": strategy_id,
            "simulations": [Execution(**sim).dict() for sim in simulations],
            "total_simulations": len(simulations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting simulations: {str(e)}")