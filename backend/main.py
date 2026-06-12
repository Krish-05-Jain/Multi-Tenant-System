from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from src.db.session import engine
from src.db.base import Base
from sqlalchemy import text
from src.middleware.tenant import tenant_middleware
from src.api.routes import router as api_router

# Import models to register them with metadata before creating tables
from src.models.tenant import Tenant
from src.models.user import User
from src.models.project import Project

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Error initializing database tables: {e}")

app = FastAPI(title="Multi-Tenant SaaS Platform")

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apply tenant scoping middleware to all request flows
app.middleware("http")(tenant_middleware)

# Register routers
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"Hello": "SaaS Platform Admin API"}

@app.get("/health")
def health():
    return {"status": "OK"}

@app.get("/db-test")
def db_test():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            return {"status": "connected", "result": [row[0] for row in result]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/tenant-data")
def tenant_data(request: Request):
    return {
        "message": "Tenant scoped data",
        "tenant_id": request.state.tenant_id
    }