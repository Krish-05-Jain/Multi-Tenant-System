import uuid
from sqlalchemy import (
    Column, String, ForeignKey, DateTime, Boolean,
    UniqueConstraint
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.src.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    email = Column(String, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="user")  # admin, user, etc.

    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)

    # Relationships
    tenant = relationship("Tenant", backref="users")

    # Status & lifecycle
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_user_email_per_tenant"),
    )