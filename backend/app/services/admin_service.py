from datetime import datetime, timezone
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.organization import Organization
from app.services.auth_service import hash_password
import math


async def list_users(
    db: AsyncSession,
    organization_id: int,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    role_filter: str | None = None,
    status_filter: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> dict:
    query = select(User).where(User.organization_id == organization_id)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term),
                User.username.ilike(search_term),
            )
        )

    if role_filter:
        query = query.where(User.role == role_filter)

    if status_filter == "active":
        query = query.where(User.is_active == True)
    elif status_filter == "inactive":
        query = query.where(User.is_active == False)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    sort_column = getattr(User, sort_by, User.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    total_pages = max(1, math.ceil(total / page_size))

    return {
        "users": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    organization_id: int,
    email: str,
    password: str,
    full_name: str,
    role: str = "viewer",
    username: str | None = None,
) -> User:
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")

    if username:
        existing_username = await db.execute(select(User).where(User.username == username))
        if existing_username.scalar_one_or_none():
            raise ValueError("Username already taken")

    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        organization_id=organization_id,
    )
    db.add(user)
    await db.flush()
    return user


async def update_user(
    db: AsyncSession,
    user: User,
    email: str | None = None,
    username: str | None = None,
    full_name: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    avatar_url: str | None = None,
) -> User:
    if email is not None and email != user.email:
        existing = await db.execute(select(User).where(User.email == email, User.id != user.id))
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")
        user.email = email

    if username is not None and username != user.username:
        existing = await db.execute(select(User).where(User.username == username, User.id != user.id))
        if existing.scalar_one_or_none():
            raise ValueError("Username already taken")
        user.username = username

    if full_name is not None:
        user.full_name = full_name
    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
    if avatar_url is not None:
        user.avatar_url = avatar_url

    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return user


async def delete_user(db: AsyncSession, user: User) -> None:
    await db.delete(user)
    await db.flush()


async def toggle_user_status(db: AsyncSession, user: User) -> User:
    user.is_active = not user.is_active
    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return user


async def reset_user_password(db: AsyncSession, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    user.refresh_token_hash = None
    user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return user


async def get_users_by_role_count(db: AsyncSession, organization_id: int) -> dict[str, int]:
    result = await db.execute(
        select(User.role, func.count(User.id))
        .where(User.organization_id == organization_id)
        .group_by(User.role)
    )
    return {role: count for role, count in result.all()}


async def get_user_stats(db: AsyncSession, organization_id: int) -> dict:
    total_result = await db.execute(
        select(func.count(User.id)).where(User.organization_id == organization_id)
    )
    total = total_result.scalar() or 0

    active_result = await db.execute(
        select(func.count(User.id)).where(
            User.organization_id == organization_id,
            User.is_active == True,
        )
    )
    active = active_result.scalar() or 0

    return {"total": total, "active": active}
