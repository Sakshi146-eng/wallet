from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routes import wallet, agent, tx, auth
from app.services.rebalance import router as rebalance_router
from app.routes.execution import router as execution_router
from app.routes.autonomous_agent import router as autonomous_agent_router
from app.db.mongo import setup_database
from app.services.startup import initialize_startup_services, shutdown_startup_services

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    await setup_database()
    print("Database setup complete")
    
    # Initialize autonomous agent service
    print("Initializing autonomous agent service...")
    await initialize_startup_services()
    print("Autonomous agent service initialized")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    print("Shutting down autonomous agent service...")
    await shutdown_startup_services()
    print("Autonomous agent service shut down")

app = FastAPI(
    title="AI Crypto Wallet Assistant",
    description="Backend for AI-powered crypto wallet assistant using FastAPI, LangChain, and Groq.",
    version="0.1.0",
    lifespan=lifespan
)

#cors middleware is established so that fe can connect with be
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

app.include_router(execution_router, tags=["Execution"])
app.include_router(wallet.router, prefix="/wallet", tags=["Wallet"])
app.include_router(agent.router, prefix="/agent", tags=["AI Agent"])
app.include_router(tx.router, prefix="/transaction", tags=["Transaction"])
app.include_router(rebalance_router)
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(autonomous_agent_router, tags=["Autonomous Agent"])

@app.get("/")
def root():
    return {"status": "Backend running", "message": "Crypto Wallet Assistant API"}