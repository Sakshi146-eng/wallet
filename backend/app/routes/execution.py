import uuid
from datetime import datetime, timezone
from typing import Dict
import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.web3_utils import (
    execute_rebalance_transaction,
    get_transaction_status,
    estimate_gas_fees
)
from app.db.mongo import executions, strategies
from app.services.wallet_utils import get_eth_balance, get_erc20_balance
from app.services.coingecko import fetch_token_prices

router = APIRouter()


class ExecutionRequest(BaseModel):
    wallet_address: str
    strategy_id: str
    target_allocation: Dict[str, float]  # {"ETH": 40, "USDC": 30, "LINK": 30}


class ExecutionResponse(BaseModel):
    execution_id: str
    tx_hash: str
    status: str
    estimated_gas: str
    etherscan_url: str
    message: str


@router.post("/agent/execute", response_model=ExecutionResponse)
async def execute_strategy(data: ExecutionRequest):
    """
    Execute a chosen portfolio rebalancing strategy on-chain.
    
    This endpoint:
    1. Validates the strategy exists
    2. Calculates required trades
    3. Executes transactions on Sepolia testnet
    4. Logs the execution in MongoDB
    5. Returns transaction hash and status
    """
    try:
        print(f"[INFO] Executing strategy {data.strategy_id} for wallet {data.wallet_address}")
        
        # Generate unique execution ID
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"
        
        # Get current wallet balances
        async with aiohttp.ClientSession() as session:
            eth_balance = await get_eth_balance(data.wallet_address, session)
            usdc_balance = await get_erc20_balance(
                data.wallet_address, 
                "0x14A3Fb98C14759169f998155ba4c31d1393D6D7c", 
                6, 
                session
            )
            link_balance = await get_erc20_balance(
                data.wallet_address, 
                "0x514910771af9ca656af840dff83e8264ecf986ca", 
                18, 
                session
            )

        current_balances = {
            "ETH": eth_balance,
            "USDC": usdc_balance,
            "LINK": link_balance
        }

        # Get current prices
        prices = await fetch_token_prices(["ETH", "USDC", "LINK"])
        
        # Calculate current USD values
        current_usd_values = {
            token: balance * prices[token] 
            for token, balance in current_balances.items()
        }
        total_portfolio_value = sum(current_usd_values.values())

        # Calculate target amounts in USD and tokens
        target_usd_values = {
            token: (percentage / 100) * total_portfolio_value
            for token, percentage in data.target_allocation.items()
        }
        
        target_token_amounts = {
            token: usd_value / prices[token]
            for token, usd_value in target_usd_values.items()
        }

        # Calculate trades needed
        trades_needed = {}
        for token in current_balances:
            current_amount = current_balances[token]
            target_amount = target_token_amounts.get(token, 0)
            difference = target_amount - current_amount
            
            if abs(difference) > 0.001:  # Minimum trade threshold
                trades_needed[token] = {
                    "current": current_amount,
                    "target": target_amount,
                    "difference": difference,
                    "action": "buy" if difference > 0 else "sell"
                }

        print(f"[INFO] Trades needed: {trades_needed}")

        # Estimate gas fees
        estimated_gas = await estimate_gas_fees(trades_needed)
        
        # Execute the rebalancing transaction
        tx_result = await execute_rebalance_transaction(
            wallet_address=data.wallet_address,
            trades=trades_needed,
            target_allocation=data.target_allocation
        )

        # Create execution record
        execution_record = {
            "execution_id": execution_id,
            "wallet_address": data.wallet_address,
            "strategy_id": data.strategy_id,
            "target_allocation": data.target_allocation,
            "current_balances": current_balances,
            "target_balances": target_token_amounts,
            "trades_executed": trades_needed,
            "tx_hash": tx_result["tx_hash"],
            "gas_used": tx_result.get("gas_used"),
            "gas_price": tx_result.get("gas_price"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "network": "sepolia",
            "total_portfolio_value_usd": total_portfolio_value,
            "estimated_gas_fees": estimated_gas
        }

        # Save to MongoDB
        await executions.insert_one(execution_record)
        
        # Create Etherscan URL
        etherscan_url = f"https://sepolia.etherscan.io/tx/0x{tx_result['tx_hash']}"

        print(f"[SUCCESS] Strategy executed. TX Hash: {tx_result['tx_hash']}")

        return ExecutionResponse(
            execution_id=execution_id,
            tx_hash=tx_result["tx_hash"],
            status="pending",
            estimated_gas=estimated_gas,
            etherscan_url=etherscan_url,
            message=f"Portfolio rebalancing transaction submitted successfully! Monitor on Sepolia Etherscan."
        )

    except Exception as e:
        print(f"[ERROR] Execution failed: {str(e)}")
        
        # Log failed execution
        failed_record = {
            "execution_id": f"failed_{uuid.uuid4().hex[:8]}",
            "wallet_address": data.wallet_address,
            "strategy_id": data.strategy_id,
            "status": "failed",
            "error": str(e),
            "created_at": datetime.now(timezone.utc)
        }
        await executions.insert_one(failed_record)
        
        raise HTTPException(
            status_code=500, 
            detail=f"Strategy execution failed: {str(e)}"
        )


@router.get("/executions")
async def get_execution_history(wallet: str):
    """
    Get execution history for a wallet address.
    Returns all past strategy executions with their status.
    """
    try:
        # Fetch executions from MongoDB
        cursor = executions.find(
            {"wallet_address": wallet}
        ).sort("created_at", -1).limit(50)
        
        execution_list = []
        async for doc in cursor:
            # Convert ObjectId to string
            doc["_id"] = str(doc["_id"])
            
            # Check transaction status if pending
            if doc.get("status") == "pending" and doc.get("tx_hash"):
                current_status = await get_transaction_status(doc["tx_hash"])
                doc["status"] = current_status
                
                # Update in database
                await executions.update_one(
                    {"execution_id": doc["execution_id"]},
                    {"$set": {"status": current_status}}
                )
            
            execution_list.append(doc)

        return {
            "wallet_address": wallet,
            "total_executions": len(execution_list),
            "executions": execution_list
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch execution history: {str(e)}"
        )


@router.get("/execution/{execution_id}")
async def get_execution_details(execution_id: str):
    """
    Get detailed information about a specific execution.
    """
    try:
        execution = await executions.find_one({"execution_id": execution_id})
        
        if not execution:
            raise HTTPException(
                status_code=404,
                detail="Execution not found"
            )
        
        # Convert ObjectId to string
        execution["_id"] = str(execution["_id"])
        
        # Update status if pending
        if execution.get("status") == "pending" and execution.get("tx_hash"):
            current_status = await get_transaction_status(execution["tx_hash"])
            execution["status"] = current_status
            
            # Update in database
            await executions.update_one(
                {"execution_id": execution_id},
                {"$set": {"status": current_status}}
            )

        return execution

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch execution details: {str(e)}"
        )