from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.deps import get_session, get_current_user, verify_project_access
from app.models.user import User
from app.services.memory_service import query_project_memory

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryQueryRequest(BaseModel):
    project_id: int
    query: str


@router.post("/search")
async def search_memory(
    data: MemoryQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(data.project_id, current_user, db)
    return await query_project_memory(db, data.project_id, data.query)
