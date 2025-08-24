# app/routes/agent_enhanced.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.services.persistence import get_persistence_service, PersistenceService
from app.services.rebalance import RebalanceService
from app.services.agent_runner_service import get_agent_runner_service
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
    persistence: PersistenceService = Depends(get_persistence_service)
) -> RebalanceResponse:
    """Generate rebalance strategies and persist them"""
    try:
        # Initialize rebalance service
        rebalance_service = RebalanceService()
        
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
    persistence: PersistenceService = Depends(get_persistence_service)
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
        
        # Get agent runner service
        agent_runner = get_agent_runner_service(persistence)
        
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

@router.get("/execution/{execution_id}")
async def get_execution_status(
    execution_id: str,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Get execution status and details"""
    try:
        execution = await persistence.get_execution(execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")
        
        return execution.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting execution: {str(e)}")

@router.post("/chat")
async def chat_with_agent(
    request: dict,
    persistence: PersistenceService = Depends(get_persistence_service)
):
    """Chat with the agent using your existing run_agent function"""
    try:
        wallet_address = request.get("wallet_address")
        user_prompt = request.get("prompt", "")
        
        if not wallet_address or not user_prompt:
            raise HTTPException(status_code=400, detail="wallet_address and prompt are required")
        
        # Get agent runner service
        agent_runner = get_agent_runner_service(persistence)
        
        # Use your existing agent logic
        response = await agent_runner.run_agent(user_prompt, wallet_address)
        
        if response is None:
            raise HTTPException(status_code=500, detail="Agent failed to generate response")
        
        return {
            "status": "success",
            "response": response,
            "wallet_address": wallet_address,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in agent chat: {str(e)}")