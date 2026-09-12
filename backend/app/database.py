from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import get_settings

settings = get_settings()

db_url = settings.database_url
# Automatically adapt PostgreSQL URLs for asyncpg driver
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Strip parameters not supported by asyncpg (such as channel_binding)
if "channel_binding=" in db_url:
    import re
    db_url = re.sub(r'[?&]channel_binding=[^&]*', '', db_url)
    if "?" not in db_url and "&" in db_url:
        db_url = db_url.replace("&", "?", 1)

if db_url.startswith("sqlite"):
    engine = create_async_engine(
        db_url,
        echo=settings.debug,
        poolclass=NullPool,
        connect_args={"check_same_thread": False, "timeout": 30},
    )
else:
    engine = create_async_engine(
        db_url,
        echo=settings.debug,
        pool_size=20,
        max_overflow=10,
        connect_args={"statement_cache_size": 0},
    )

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
