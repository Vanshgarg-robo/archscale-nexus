from datetime import datetime, timedelta, timezone
from typing import Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.models.user import User
from app.models.organization import Organization
import hashlib
import secrets

import bcrypt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def _hash_token(token: str) -> str:
    """Hash a refresh token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create a JWT refresh token."""
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh", "jti": secrets.token_hex(16)})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token. Returns payload or None."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str,
    organization_name: str,
    role: str = "project_manager",
) -> User:
    """Register a new user, creating their organization if needed."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise ValueError("Email already registered")

    # Find or create organization
    org_result = await db.execute(
        select(Organization).where(Organization.name == organization_name)
    )
    org = org_result.scalar_one_or_none()
    if not org:
        org = Organization(name=organization_name, subscription_tier="professional")
        db.add(org)
        await db.flush()

    # Create user
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        organization_id=org.id,
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    """Authenticate a user by email and password."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """Get a user by their ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def store_refresh_token(db: AsyncSession, user: User, refresh_token: str) -> None:
    """Store the hashed refresh token for a user."""
    user.refresh_token_hash = _hash_token(refresh_token)
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()


async def verify_refresh_token(db: AsyncSession, user: User, refresh_token: str) -> bool:
    """Verify a refresh token against the stored hash."""
    if not user.refresh_token_hash:
        return False
    return user.refresh_token_hash == _hash_token(refresh_token)


async def invalidate_refresh_token(db: AsyncSession, user: User) -> None:
    """Invalidate the user's refresh token (logout)."""
    user.refresh_token_hash = None
    await db.flush()


def create_token_pair(user: User) -> dict[str, Any]:
    """Create both access and refresh tokens for a user."""
    settings = get_settings()
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "org_id": user.organization_id,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }
