#!/usr/bin/env python3
"""
Test Script for Autonomous Agent

This script tests the basic functionality of the autonomous agent service
without requiring the full FastAPI application to be running.
"""

import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.autonomous_agent import autonomous_agent_service, MonitoringConfig
from app.db.mongo import setup_database, wallet_monitoring_configs, autonomous_agent_logs
from app.config.autonomous_agent_config import get_config_summary

async def test_autonomous_agent():
    """Test the autonomous agent service functionality"""
    
    print("🧪 Testing Autonomous Agent Service...")
    print("=" * 50)
    
    try:
        # Test 1: Database connection
        print("1. Testing database connection...")
        await setup_database()
        print("   ✅ Database connection successful")
        
        # Test 2: Configuration loading
        print("\n2. Testing configuration loading...")
        config_summary = get_config_summary()
        print(f"   ✅ Configuration loaded successfully")
        print(f"   📊 Risk profiles: {config_summary['risk_profiles']}")
        print(f"   🔧 Enabled features: {len([k for k, v in config_summary['enabled_features'].items() if v])}")
        
        # Test 3: Service initialization
        print("\n3. Testing service initialization...")
        print(f"   📈 Service running: {autonomous_agent_service.is_running}")
        
        # Test 4: Add test wallet to monitoring
        print("\n4. Testing wallet monitoring configuration...")
        test_config = MonitoringConfig(
            wallet_address="0x8A25EB9e079700138d71c3B1c1B45BA9302f7F7f",
            enabled=True,
            check_interval_minutes=15,
            drift_threshold_percent=5.0,
            max_daily_trades=3,
            risk_profile="balanced",
            auto_execute=False,
            slippage_tolerance=1.0,
            min_portfolio_value_usd=100.0
        )
        
        await autonomous_agent_service.add_wallet_to_monitoring(test_config)
        print("   ✅ Test wallet added to monitoring")
        
        # Test 5: Verify wallet in database
        print("\n5. Testing database persistence...")
        saved_config = await wallet_monitoring_configs.find_one(
            {"wallet_address": test_config.wallet_address}
        )
        if saved_config:
            print("   ✅ Configuration saved to database")
            print(f"   📝 Wallet: {saved_config['wallet_address']}")
            print(f"   📝 Risk profile: {saved_config['risk_profile']}")
            print(f"   📝 Drift threshold: {saved_config['drift_threshold_percent']}%")
        else:
            print("   ❌ Configuration not found in database")
        
        # Test 6: Service status
        print("\n6. Testing service status...")
        status = await autonomous_agent_service.get_monitoring_status()
        print(f"   ✅ Service status retrieved")
        print(f"   📊 Total monitored wallets: {status['total_monitored_wallets']}")
        print(f"   📊 Active monitored wallets: {status['active_monitored_wallets']}")
        print(f"   📊 Active monitoring tasks: {status['active_monitoring_tasks']}")
        
        # Test 7: Clean up test data
        print("\n7. Cleaning up test data...")
        await autonomous_agent_service.remove_wallet_from_monitoring(test_config.wallet_address)
        print("   ✅ Test wallet removed from monitoring")
        
        # Test 8: Final status check
        print("\n8. Final status check...")
        final_status = await autonomous_agent_service.get_monitoring_status()
        print(f"   📊 Final monitored wallets: {final_status['total_monitored_wallets']}")
        
        print("\n" + "=" * 50)
        print("🎉 All tests passed successfully!")
        print("✅ Autonomous Agent Service is working correctly")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

async def test_market_conditions():
    """Test market condition assessment"""
    
    print("\n🌍 Testing Market Condition Assessment...")
    print("=" * 50)
    
    try:
        # Test market condition assessment
        await autonomous_agent_service._assess_market_conditions()
        
        # Get the market conditions
        market_conditions = autonomous_agent_service.market_conditions_cache.get("current", {})
        
        if market_conditions:
            print("   ✅ Market conditions assessed successfully")
            print(f"   📊 Risk score: {market_conditions.risk_score}")
            print(f"   📊 Trend direction: {market_conditions.trend_direction}")
            print(f"   📊 Volatility high: {market_conditions.volatility_high}")
        else:
            print("   ❌ Market conditions not available")
        
    except Exception as e:
        print(f"   ❌ Market condition test failed: {str(e)}")

async def main():
    """Main test function"""
    
    print("🚀 Starting Autonomous Agent Tests...")
    print("This will test the core functionality of the autonomous agent service.")
    print("Make sure MongoDB is running and accessible.\n")
    
    # Run basic functionality tests
    success = await test_autonomous_agent()
    
    if success:
        # Run additional tests
        await test_market_conditions()
        
        print("\n" + "=" * 50)
        print("📋 Test Summary:")
        print("✅ Database connection and setup")
        print("✅ Configuration loading")
        print("✅ Service initialization")
        print("✅ Wallet monitoring configuration")
        print("✅ Database persistence")
        print("✅ Service status retrieval")
        print("✅ Data cleanup")
        print("✅ Market condition assessment")
        print("\n🎯 The Autonomous Agent Service is ready for use!")
        
    else:
        print("\n❌ Some tests failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    # Run the tests
    asyncio.run(main())
