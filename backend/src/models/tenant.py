from sqlalchemy import Column, String, Boolean, DateTime, JSON
from src.db.base import Base
from sqlalchemy.sql import func
import uuid

class Tenant(Base):
    __tablename__ = "tenants"

    # Core पहचान (identity)
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)

    # Lifecycle
    status = Column(String, default="active")  # active, trial, suspended, deleted

    # Billing
    plan = Column(String, default="free")
    subscription_id = Column(String)  # e.g. Stripe subscription
    billing_email = Column(String)
    trial_ends_at = Column(DateTime)

    # Config / Feature flags
    settings = Column(JSON, default={})

    # Metadata
    country = Column(String)
    timezone = Column(String)

    # Security / soft delete
    is_deleted = Column(Boolean, default=False)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())