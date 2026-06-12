from fastapi import APIRouter, Depends, HTTPException, status, Request, WebSocket, WebSocketDisconnect, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from fastapi.security import OAuth2PasswordBearer
import jwt # jose jwt
from src.db.session import SessionLocal
from src.models.tenant import Tenant
from src.models.user import User
from src.models.project import Project
from src.core.security import hash_password, verify_password, create_access_token, decode_access_token

# Import core integration services
from src.services.cache import cache_service
from src.services.storage import storage_service
from src.services.payment import payment_service
from src.services.websocket import ws_manager

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas
class TenantRegisterSchema(BaseModel):
    tenant_name: str
    tenant_slug: str
    admin_email: str
    admin_password: str

class TenantResponseSchema(BaseModel):
    id: str
    name: str
    slug: str
    class Config:
        from_attributes = True

class UserSignupSchema(BaseModel):
    email: str
    password: str

class UserResponseSchema(BaseModel):
    id: str
    email: str
    role: str
    tenant_id: str
    is_active: bool
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponseSchema

class ProjectCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "To Do"

class ProjectResponseSchema(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    tenant_id: str
    class Config:
        from_attributes = True

class BillingOrderRequest(BaseModel):
    plan_name: str
    amount: float

class PaymentVerifyRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str

# Helper to verify JWT and retrieve the current user, enforcing tenant matching
async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id: str = payload.get("sub")
    token_tenant_id: str = payload.get("tenant_id")
    
    if not user_id or not token_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Verify request matches tenant
    req_tenant_id = request.state.tenant_id
    if req_tenant_id:
        tenant = db.query(Tenant).filter(Tenant.slug == req_tenant_id).first()
        if not tenant or tenant.id != token_tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant mismatch. You are accessing a different workspace."
            )
            
    user = db.query(User).filter(User.id == user_id, User.tenant_id == token_tenant_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is deactivated"
        )
        
    return user


# PUBLIC PLATFORM APIS

@router.post("/tenants/register", response_model=TenantResponseSchema)
def register_tenant(data: TenantRegisterSchema, db: Session = Depends(get_db)):
    # Check if slug is unique
    existing_tenant = db.query(Tenant).filter(Tenant.slug == data.tenant_slug).first()
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain/Slug is already taken"
        )
        
    # Create Tenant
    new_tenant = Tenant(
        name=data.tenant_name,
        slug=data.tenant_slug.lower().strip()
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    
    # Create Admin User
    hashed_pwd = hash_password(data.admin_password)
    admin_user = User(
        email=data.admin_email,
        password=hashed_pwd,
        role="admin",
        tenant_id=new_tenant.id,
        is_verified=True
    )
    db.add(admin_user)
    db.commit()
    
    return new_tenant

@router.get("/tenants/check-slug/{slug}")
def check_slug(slug: str, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.slug == slug.lower().strip()).first()
    return {"available": tenant is None, "tenant_name": tenant.name if tenant else None}


# TENANT-SCOPED APIS (Require tenant domain or X-Tenant-Id header)

@router.post("/auth/signup", response_model=UserResponseSchema)
def signup_user(request: Request, data: UserSignupSchema, db: Session = Depends(get_db)):
    tenant_slug = request.state.tenant_id
    if not tenant_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant scope required to sign up"
        )
        
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant workspace not found"
        )
        
    # Check if email taken under this tenant
    existing_user = db.query(User).filter(User.tenant_id == tenant.id, User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered in this workspace"
        )
        
    # Create standard user
    hashed_pwd = hash_password(data.password)
    new_user = User(
        email=data.email,
        password=hashed_pwd,
        role="user",
        tenant_id=tenant.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/auth/login", response_model=TokenResponse)
def login_user(request: Request, data: UserResponseSchema, db: Session = Depends(get_db)):
    # Standard sign in schema check is handled via body fields
    pass

# We duplicate login endpoints logic for cleaner execution
@router.post("/auth/login")
def login_user_override(request: Request, data: dict, db: Session = Depends(get_db)):
    tenant_slug = request.state.tenant_id
    if not tenant_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant scope required to log in"
        )
        
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant workspace not found"
        )
        
    user = db.query(User).filter(User.tenant_id == tenant.id, User.email == data.get("email")).first()
    if not user or not verify_password(data.get("password"), user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role, "tenant_id": user.tenant_id}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "tenant_id": user.tenant_id,
            "is_active": user.is_active
        }
    }

@router.get("/auth/me", response_model=UserResponseSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# PROJECTS (Tenant Isolated Data)

@router.get("/projects", response_model=List[ProjectResponseSchema])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Strict tenant isolation
    projects = db.query(Project).filter(Project.tenant_id == current_user.tenant_id).all()
    return projects

@router.post("/projects", response_model=ProjectResponseSchema)
def create_project(
    data: ProjectCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_project = Project(
        title=data.title,
        description=data.description,
        status=data.status,
        tenant_id=current_user.tenant_id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Invalidate analytics cache
    cache_service.delete(f"analytics:{current_user.tenant_id}")
    
    # Broadcast real-time WebSockets event
    import asyncio
    asyncio.create_task(
        ws_manager.broadcast_to_tenant(current_user.tenant_id, {
            "event": "project_created",
            "project_id": new_project.id,
            "title": new_project.title,
            "status": new_project.status
        })
    )
    
    return new_project

@router.put("/projects/{project_id}", response_model=ProjectResponseSchema)
def update_project(
    project_id: str,
    data: ProjectCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == current_user.tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.title = data.title
    project.description = data.description
    project.status = data.status
    
    db.commit()
    db.refresh(project)
    
    # Invalidate analytics cache
    cache_service.delete(f"analytics:{current_user.tenant_id}")
    
    # Broadcast status change
    import asyncio
    asyncio.create_task(
        ws_manager.broadcast_to_tenant(current_user.tenant_id, {
            "event": "project_updated",
            "project_id": project.id,
            "title": project.title,
            "status": project.status
        })
    )
    
    return project

@router.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == current_user.tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    # Invalidate analytics cache
    cache_service.delete(f"analytics:{current_user.tenant_id}")
    
    # Broadcast deletion
    import asyncio
    asyncio.create_task(
        ws_manager.broadcast_to_tenant(current_user.tenant_id, {
            "event": "project_deleted",
            "project_id": project_id
        })
    )
    
    return {"message": "Project deleted successfully"}


# TENANT ADMIN MANAGEMENT APIS

@router.get("/admin/users", response_model=List[UserResponseSchema])
def admin_list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace administrators can view user list"
        )
        
    users = db.query(User).filter(User.tenant_id == current_user.tenant_id).all()
    return users

@router.put("/admin/users/{user_id}/toggle-active")
def admin_toggle_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace administrators can edit users"
        )
        
    user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
        
    user.is_active = not user.is_active
    db.commit()
    
    # Invalidate analytics cache
    cache_service.delete(f"analytics:{current_user.tenant_id}")
    
    return {"message": f"User status changed. Active: {user.is_active}"}

@router.get("/admin/analytics")
def admin_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace administrators can view analytics"
        )
    
    # REDIS CACHE GET
    cache_key = f"analytics:{current_user.tenant_id}"
    cached_data = cache_service.get(cache_key)
    if cached_data:
        return cached_data
        
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    users_count = db.query(User).filter(User.tenant_id == current_user.tenant_id).count()
    projects = db.query(Project).filter(Project.tenant_id == current_user.tenant_id).all()
    projects_count = len(projects)
    
    todo_count = sum(1 for p in projects if p.status == "To Do")
    in_progress_count = sum(1 for p in projects if p.status == "In Progress")
    done_count = sum(1 for p in projects if p.status == "Done")
    
    analytics_data = {
        "tenant_name": tenant.name,
        "tenant_slug": tenant.slug,
        "plan": tenant.plan,
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        "users_count": users_count,
        "projects_count": projects_count,
        "project_statuses": {
            "todo": todo_count,
            "in_progress": in_progress_count,
            "done": done_count
        }
    }
    
    # REDIS CACHE SET for 30 seconds
    cache_service.set(cache_key, analytics_data, expire_seconds=30)
    
    return analytics_data


# REALTIME WEBSOCKET ROUTE

@router.websocket("/ws/{tenant_slug}")
async def websocket_endpoint(websocket: WebSocket, tenant_slug: str, db: Session = Depends(get_db)):
    # Look up tenant in database
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if not tenant:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await ws_manager.connect(tenant.id, websocket)
    try:
        while True:
            # Maintain connection and listen for ping/pong or state messages
            data = await websocket.receive_json()
            await ws_manager.broadcast_to_tenant(tenant.id, {
                "event": "client_broadcast",
                "sender": "client",
                "payload": data
            })
    except WebSocketDisconnect:
        ws_manager.disconnect(tenant.id, websocket)


# RAZORPAY BILLING ROUTES

@router.post("/billing/create-order")
def create_billing_order(
    data: BillingOrderRequest,
    current_user: User = Depends(get_current_user)
):
    order_info = payment_service.create_subscription_order(
        tenant_id=current_user.tenant_id,
        plan_name=data.plan_name,
        amount_in_rupees=data.amount
    )
    return order_info

@router.post("/billing/verify-signature")
def verify_billing_signature(
    data: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = payment_service.verify_payment_signature(
        razorpay_order_id=data.order_id,
        razorpay_payment_id=data.payment_id,
        razorpay_signature=data.signature
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Razorpay cryptographic signature check failed"
        )
    
    # Upgrade Tenant billing plan
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    tenant.plan = "premium"
    db.commit()
    
    # Invalidate cache
    cache_service.delete(f"analytics:{current_user.tenant_id}")
    
    return {"status": "success", "message": "Tenant successfully upgraded to premium plan"}


# SUPABASE ASSET UPLOAD ROUTE

@router.post("/assets/upload")
async def upload_asset(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    contents = await file.read()
    url = storage_service.upload_file(
        tenant_id=current_user.tenant_id,
        bucket_name="tenant-files",
        file_path=file.filename,
        file_bytes=contents,
        content_type=file.content_type
    )
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase upload connection failed"
        )
    return {"url": url, "filename": file.filename}
