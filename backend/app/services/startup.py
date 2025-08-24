"""
Startup Service for Autonomous Agent

This service handles the initialization and startup of the autonomous agent
when the FastAPI application starts. It ensures the autonomous monitoring
service is properly configured and started.
"""

import asyncio
import logging
from typing import Optional

from app.services.autonomous_agent import autonomous_agent_service
from app.db.mongo import wallet_monitoring_configs

logger = logging.getLogger(__name__)

class StartupService:
    """Service to handle application startup tasks"""
    
    def __init__(self):
        self.autonomous_agent_started = False
    
    async def initialize_autonomous_agent(self):
        """Initialize and start the autonomous agent service"""
        try:
            logger.info("Initializing autonomous agent service...")
            
            # Check if there are any wallets configured for monitoring
            monitored_wallets_count = await wallet_monitoring_configs.count_documents({"enabled": True})
            
            if monitored_wallets_count > 0:
                logger.info(f"Found {monitored_wallets_count} wallets configured for autonomous monitoring")
                
                # Start the autonomous agent service
                await autonomous_agent_service.start_monitoring()
                self.autonomous_agent_started = True
                
                logger.info("Autonomous agent service started successfully")
            else:
                logger.info("No wallets configured for autonomous monitoring - service will start when wallets are added")
                
        except Exception as e:
            logger.error(f"Failed to initialize autonomous agent service: {str(e)}")
            # Don't fail the entire startup, just log the error
            self.autonomous_agent_started = False
    
    async def shutdown_autonomous_agent(self):
        """Shutdown the autonomous agent service"""
        try:
            if self.autonomous_agent_started:
                logger.info("Shutting down autonomous agent service...")
                await autonomous_agent_service.stop_monitoring()
                self.autonomous_agent_started = False
                logger.info("Autonomous agent service shut down successfully")
        except Exception as e:
            logger.error(f"Error shutting down autonomous agent service: {str(e)}")
    
    async def get_startup_status(self) -> dict:
        """Get the status of startup services"""
        return {
            "autonomous_agent_started": self.autonomous_agent_started,
            "monitored_wallets_count": await wallet_monitoring_configs.count_documents({"enabled": True}),
            "total_wallets_count": await wallet_monitoring_configs.count_documents({})
        }

# Global startup service instance
startup_service = StartupService()

async def initialize_startup_services():
    """Initialize all startup services"""
    await startup_service.initialize_autonomous_agent()

async def shutdown_startup_services():
    """Shutdown all startup services"""
    await startup_service.shutdown_autonomous_agent()
