"""
Configuration for Autonomous Agent Service

This file contains default configuration values for the autonomous agent,
including monitoring intervals, drift thresholds, and risk management settings.
Values can be overridden using environment variables.
"""

import os
from typing import Dict, Any

# Default monitoring configuration
DEFAULT_MONITORING_CONFIG = {
    "check_interval_minutes": 15,  # How often to check wallets
    "drift_threshold_percent": 5.0,  # % drift before triggering rebalance
    "max_daily_trades": 3,  # Maximum trades per day per wallet
    "risk_profiles": {
        "conservative": {
            "drift_threshold": 8.0,  # Higher threshold for conservative
            "max_daily_trades": 2,
            "urgency_requirements": ["high", "critical"]
        },
        "balanced": {
            "drift_threshold": 5.0,
            "max_daily_trades": 3,
            "urgency_requirements": ["medium", "high", "critical"]
        },
        "aggressive": {
            "drift_threshold": 3.0,  # Lower threshold for aggressive
            "max_daily_trades": 5,
            "urgency_requirements": ["low", "medium", "high", "critical"]
        }
    },
    "market_monitoring": {
        "check_interval_minutes": 5,  # Market conditions check frequency
        "risk_score_threshold": 80,  # Skip actions when risk > 80
        "volatility_threshold": 0.15,  # High volatility threshold
        "correlation_threshold": 0.7  # Correlation breakdown threshold
    },
    "portfolio_requirements": {
        "min_portfolio_value_usd": 100.0,  # Minimum portfolio value to monitor
        "min_trade_amount_usd": 10.0,  # Minimum trade amount
        "max_slippage_percent": 2.0  # Maximum allowed slippage
    },
    "execution_settings": {
        "gas_limit_buffer": 1.2,  # 20% buffer on gas estimates
        "max_gas_price_gwei": 100,  # Maximum gas price in Gwei
        "retry_attempts": 3,  # Number of retry attempts for failed transactions
        "retry_delay_seconds": 60  # Delay between retry attempts
    }
}

# Environment variable overrides
def get_config_value(key: str, default: Any = None) -> Any:
    """Get configuration value with environment variable override support"""
    env_key = f"AUTONOMOUS_AGENT_{key.upper()}"
    return os.getenv(env_key, default)

def get_monitoring_config() -> Dict[str, Any]:
    """Get monitoring configuration with environment variable overrides"""
    config = DEFAULT_MONITORING_CONFIG.copy()
    
    # Override with environment variables if set
    config["check_interval_minutes"] = int(get_config_value(
        "check_interval_minutes", 
        config["check_interval_minutes"]
    ))
    
    config["drift_threshold_percent"] = float(get_config_value(
        "drift_threshold_percent", 
        config["drift_threshold_percent"]
    ))
    
    config["max_daily_trades"] = int(get_config_value(
        "max_daily_trades", 
        config["max_daily_trades"]
    ))
    
    # Market monitoring overrides
    config["market_monitoring"]["check_interval_minutes"] = int(get_config_value(
        "market_check_interval", 
        config["market_monitoring"]["check_interval_minutes"]
    ))
    
    config["market_monitoring"]["risk_score_threshold"] = float(get_config_value(
        "risk_score_threshold", 
        config["market_monitoring"]["risk_score_threshold"]
    ))
    
    # Portfolio requirements overrides
    config["portfolio_requirements"]["min_portfolio_value_usd"] = float(get_config_value(
        "min_portfolio_value", 
        config["portfolio_requirements"]["min_portfolio_value_usd"]
    ))
    
    config["portfolio_requirements"]["max_slippage_percent"] = float(get_config_value(
        "max_slippage", 
        config["portfolio_requirements"]["max_slippage_percent"]
    ))
    
    return config

def get_risk_profile_config(risk_profile: str) -> Dict[str, Any]:
    """Get configuration for a specific risk profile"""
    config = get_monitoring_config()
    return config["risk_profiles"].get(risk_profile, config["risk_profiles"]["balanced"])

def get_market_monitoring_config() -> Dict[str, Any]:
    """Get market monitoring configuration"""
    config = get_monitoring_config()
    return config["market_monitoring"]

def get_portfolio_requirements() -> Dict[str, Any]:
    """Get portfolio requirements configuration"""
    config = get_monitoring_config()
    return config["portfolio_requirements"]

def get_execution_settings() -> Dict[str, Any]:
    """Get execution settings configuration"""
    config = get_monitoring_config()
    return config["execution_settings"]

# Feature flags
def is_feature_enabled(feature: str) -> bool:
    """Check if a feature is enabled via environment variable"""
    env_key = f"AUTONOMOUS_AGENT_ENABLE_{feature.upper()}"
    return os.getenv(env_key, "false").lower() == "true"

# Available features
FEATURES = {
    "auto_execution": "Enable automatic execution of rebalancing strategies",
    "market_condition_monitoring": "Enable market condition assessment",
    "risk_management": "Enable risk-based decision making",
    "portfolio_drift_analysis": "Enable portfolio drift analysis",
    "gas_optimization": "Enable gas fee optimization",
    "retry_mechanism": "Enable transaction retry mechanism"
}

def get_enabled_features() -> Dict[str, bool]:
    """Get status of all features"""
    return {feature: is_feature_enabled(feature) for feature in FEATURES}

def get_config_summary() -> Dict[str, Any]:
    """Get a summary of all configuration values"""
    return {
        "monitoring_config": get_monitoring_config(),
        "enabled_features": get_enabled_features(),
        "risk_profiles": list(DEFAULT_MONITORING_CONFIG["risk_profiles"].keys()),
        "environment_variables": {
            key: value for key, value in os.environ.items() 
            if key.startswith("AUTONOMOUS_AGENT_")
        }
    }
