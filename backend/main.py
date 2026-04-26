from fastapi import FastAPI, Request, HTTPException
from src.db.session import engine
from sqlalchemy import text
from src.middleware.tenant import tenant_middleware

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

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
    


app.middleware("http")(tenant_middleware)

@app.get("/tenant-data")
def tenant_data(request: Request):
    return {
        "message": "Tenant scoped data",
        "tenant_id": request.state.tenant_id
    }