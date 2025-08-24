# Autonomous Agent Mode - 24/7 Portfolio Monitoring & Auto-Execution

## Overview

The Autonomous Agent Mode is a new feature that runs continuously in the background to monitor wallet portfolios and automatically execute rebalancing strategies when market conditions and portfolio drift meet predefined criteria.

**This mode is completely separate from your existing chatbot + execution pipeline and does not interfere with any tested features.**

## How It Works

### 1. **Continuous Monitoring**
- Runs 24/7 in the background
- Monitors configured wallets at specified intervals (default: every 15 minutes)
- Assesses market conditions every 5 minutes
- Tracks portfolio drift from target allocations

### 2. **Intelligent Decision Making**
- Analyzes portfolio drift percentage
- Considers market risk conditions
- Respects user-defined risk profiles (conservative, balanced, aggressive)
- Applies daily trading limits to prevent excessive activity

### 3. **Automatic Execution**
- Can automatically execute rebalancing when conditions are met
- Or just provide suggestions (configurable per wallet)
- Integrates with existing execution infrastructure
- Logs all decisions and actions for transparency

## Key Features

### **Risk Management**
- **Conservative Profile**: Higher drift thresholds, fewer daily trades
- **Balanced Profile**: Standard thresholds and trade limits
- **Aggressive Profile**: Lower drift thresholds, more frequent trading
- Market risk assessment to avoid actions during high volatility

### **Portfolio Drift Analysis**
- Calculates percentage drift from target allocations
- Urgency levels: low, medium, high, critical
- Minimum portfolio value requirements
- Configurable drift thresholds per wallet

### **Market Condition Monitoring**
- Volatility assessment
- Trend direction analysis
- Volume spike detection
- Correlation breakdown monitoring
- Risk scoring (0-100 scale)

### **Trading Controls**
- Daily trade limits per wallet
- Minimum trade amounts
- Slippage tolerance settings
- Gas price limits
- Retry mechanisms for failed transactions

## API Endpoints

### **Wallet Monitoring Management**
```
POST   /autonomous/monitor/wallet          # Add wallet to monitoring
GET    /autonomous/monitor/wallet/{addr}   # Get monitoring config
PUT    /autonomous/monitor/wallet/{addr}   # Update monitoring config
DELETE /autonomous/monitor/wallet/{addr}   # Remove from monitoring
GET    /autonomous/monitor/wallets         # List all monitored wallets
```

### **Service Control**
```
POST   /autonomous/service/start           # Start autonomous service
POST   /autonomous/service/stop            # Stop autonomous service
POST   /autonomous/service/restart         # Restart service
GET    /autonomous/status                  # Get service status
```

### **Monitoring & Analytics**
```
GET    /autonomous/actions/{wallet}        # Get autonomous actions
GET    /autonomous/executions/{wallet}     # Get execution history
GET    /autonomous/market/conditions       # Get market conditions
GET    /autonomous/analytics/summary       # Get analytics summary
POST   /autonomous/force-check/{wallet}    # Force immediate check
```

## Configuration

### **Wallet Monitoring Configuration**
```json
{
  "wallet_address": "0x...",
  "enabled": true,
  "check_interval_minutes": 15,
  "drift_threshold_percent": 5.0,
  "max_daily_trades": 3,
  "risk_profile": "balanced",
  "auto_execute": false,
  "slippage_tolerance": 1.0,
  "min_portfolio_value_usd": 100.0
}
```

### **Risk Profiles**
- **Conservative**: 8% drift threshold, 2 daily trades, high urgency only
- **Balanced**: 5% drift threshold, 3 daily trades, medium+ urgency
- **Aggressive**: 3% drift threshold, 5 daily trades, all urgency levels

### **Environment Variables**
```bash
# Monitoring intervals
AUTONOMOUS_AGENT_CHECK_INTERVAL_MINUTES=15
AUTONOMOUS_AGENT_MARKET_CHECK_INTERVAL=5

# Drift thresholds
AUTONOMOUS_AGENT_DRIFT_THRESHOLD_PERCENT=5.0

# Daily limits
AUTONOMOUS_AGENT_MAX_DAILY_TRADES=3

# Risk management
AUTONOMOUS_AGENT_RISK_SCORE_THRESHOLD=80

# Portfolio requirements
AUTONOMOUS_AGENT_MIN_PORTFOLIO_VALUE=100.0
AUTONOMOUS_AGENT_MAX_SLIPPAGE=2.0

# Feature flags
AUTONOMOUS_AGENT_ENABLE_AUTO_EXECUTION=true
AUTONOMOUS_AGENT_ENABLE_MARKET_CONDITION_MONITORING=true
AUTONOMOUS_AGENT_ENABLE_RISK_MANAGEMENT=true
```

## Usage Examples

### **1. Enable Autonomous Monitoring for a Wallet**
```bash
curl -X POST "http://localhost:8000/autonomous/monitor/wallet" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x1234...",
    "enabled": true,
    "check_interval_minutes": 15,
    "drift_threshold_percent": 5.0,
    "max_daily_trades": 3,
    "risk_profile": "balanced",
    "auto_execute": false,
    "slippage_tolerance": 1.0,
    "min_portfolio_value_usd": 100.0
  }'
```

### **2. Start the Autonomous Service**
```bash
curl -X POST "http://localhost:8000/autonomous/service/start" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **3. Check Service Status**
```bash
curl -X GET "http://localhost:8000/autonomous/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **4. View Autonomous Actions for a Wallet**
```bash
curl -X GET "http://localhost:8000/autonomous/actions/0x1234..." \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Collections

### **New Collections Added**
- `wallet_monitoring_configs` - Wallet monitoring configurations
- `autonomous_agent_logs` - Autonomous decision logs
- Enhanced `executions` collection with `execution_type: "autonomous"`

### **Existing Collections Enhanced**
- `strategies` - Used for target allocations
- `executions` - Enhanced with autonomous execution tracking
- `wallets` - Portfolio state information

## Integration with Existing Features

### **Preserved Features**
- ✅ All existing chatbot endpoints (`/agent/*`)
- ✅ All existing execution endpoints (`/execution/*`)
- ✅ All existing wallet endpoints (`/wallet/*`)
- ✅ All existing authentication (`/auth/*`)
- ✅ All existing rebalancing services
- ✅ All existing database operations

### **Enhanced Features**
- 🔄 Execution tracking now includes autonomous vs manual distinction
- 🔄 Portfolio analysis enhanced with drift calculations
- 🔄 Risk management integrated with existing strategies

### **New Features**
- 🆕 24/7 autonomous monitoring
- 🆕 Market condition assessment
- 🆕 Automatic portfolio rebalancing
- 🆕 Risk-based decision making
- 🆕 Comprehensive logging and analytics

## Security & Safety

### **Risk Controls**
- Daily trading limits per wallet
- Portfolio value minimums
- Market risk thresholds
- Slippage protection
- Gas price limits

### **User Control**
- Enable/disable per wallet
- Auto-execute vs suggestion-only mode
- Configurable risk profiles
- Immediate service start/stop
- Force check capabilities

### **Transparency**
- All decisions logged with reasoning
- Execution history tracking
- Market condition assessments
- Portfolio drift analysis
- Comprehensive analytics

## Monitoring & Debugging

### **Service Status**
```bash
# Check if service is running
GET /autonomous/status

# View recent autonomous actions
GET /autonomous/actions/{wallet}

# View execution history
GET /autonomous/executions/{wallet}

# Get analytics summary
GET /autonomous/analytics/summary
```

### **Logs**
- All autonomous decisions logged to `autonomous_agent_logs`
- Execution records enhanced with `execution_type: "autonomous"`
- Market condition assessments cached and logged
- Portfolio drift calculations tracked

### **Troubleshooting**
- Service start/stop/restart endpoints
- Force check individual wallets
- View monitoring configurations
- Check feature enablement status

## Performance Considerations

### **Resource Usage**
- Background monitoring tasks run asynchronously
- Market condition checks every 5 minutes
- Wallet monitoring based on individual intervals
- Database queries optimized with proper indexes

### **Scalability**
- Each wallet monitored in separate async task
- Configurable check intervals per wallet
- Background task management
- Graceful error handling and recovery

## Future Enhancements

### **Planned Features**
- Machine learning-based drift prediction
- Advanced market sentiment analysis
- Multi-chain portfolio monitoring
- Social sentiment integration
- Advanced risk modeling

### **Extensibility**
- Plugin-based strategy execution
- Custom risk assessment algorithms
- External data source integration
- Advanced analytics and reporting

## Getting Started

### **1. Start the Backend**
The autonomous agent service starts automatically when the backend starts.

### **2. Configure Wallet Monitoring**
Use the API endpoints to add wallets to autonomous monitoring.

### **3. Start the Service**
Enable the autonomous service to begin monitoring.

### **4. Monitor and Adjust**
Use the analytics endpoints to monitor performance and adjust settings.

## Support

For questions or issues with the autonomous agent mode:
- Check the service status endpoint
- Review autonomous action logs
- Check monitoring configurations
- Use force check for immediate testing

The autonomous agent is designed to be safe, transparent, and user-controlled while providing powerful 24/7 portfolio management capabilities.
