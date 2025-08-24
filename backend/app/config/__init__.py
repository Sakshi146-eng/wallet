"""
Configuration package for the application.

This package contains configuration files for various components:
- autonomous_agent_config.py: Configuration for the autonomous agent service
"""

# Import from the main config.py file in the parent directory to avoid circular imports
import os
from dotenv import load_dotenv

load_dotenv()

def get_env(key: str, default=None):
    """Get environment variable - copied from ../config.py to avoid circular imports"""
    return os.getenv(key, default)

from .autonomous_agent_config import (
    get_monitoring_config,
    get_config_summary,
    DEFAULT_MONITORING_CONFIG
)

__all__ = [
    "get_env",
    "get_monitoring_config",
    "get_config_summary", 
    "DEFAULT_MONITORING_CONFIG"
]
