from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserRegister, UserLogin, TokenResponse,
    RefreshTokenRequest, UserResponse, UserUpdate,
    get_permissions,
)
from app.services.auth_service import (
    register_user, authenticate_user, create_token_pair,
    store_refresh_token, decode_token, get_user_by_id,
    verify_refresh_token, invalidate_refresh_token,
    hash_password,
)

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user and organization."""
    try:
        user = await register_user(
            db=db,
            email=data.email,
            password=data.password,
            full_name=data.full_name,
            organization_name=data.organization_name,
            role=data.role,
        )
        await db.commit()
        await db.refresh(user)

        tokens = create_token_pair(user)
        await store_refresh_token(db, user, tokens["refresh_token"])
        await db.commit()

        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return tokens."""
    user = await authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    tokens = create_token_pair(user)
    await store_refresh_token(db, user, tokens["refresh_token"])
    await db.commit()

    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using a valid refresh token."""
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = await get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    is_valid = await verify_refresh_token(db, user, data.refresh_token)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    tokens = create_token_pair(user)
    await store_refresh_token(db, user, tokens["refresh_token"])
    await db.commit()

    return tokens


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Logout the current user (invalidate refresh token)."""
    await invalidate_refresh_token(db, user)
    await db.commit()
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    org_name = user.organization.name if user.organization else None
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        organization_name=org_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        stakeholder_id=user.stakeholder_id,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


@router.get("/permissions")
async def get_my_permissions(user: User = Depends(get_current_user)):
    """Get the current user's role permissions."""
    return {
        "role": user.role,
        "permissions": get_permissions(user.role),
    }


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile."""
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    # Role changes are admin-only, silently ignored here
    await db.commit()
    await db.refresh(user)

    org_name = user.organization.name if user.organization else None
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        organization_name=org_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        stakeholder_id=user.stakeholder_id,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


# Export routers with both /api/auth and /auth prefixes
api_router = APIRouter(prefix="/api/auth", tags=["Authentication"])
api_router.include_router(router)

direct_router = APIRouter(prefix="/auth", tags=["Authentication"])
direct_router.include_router(router)

# Default router for backwards compatibility
router = api_router
