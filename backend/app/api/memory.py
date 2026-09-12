from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.deps import get_session
from app.services.memory_service import query_project_memory

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryQueryRequest(BaseModel):
    project_id: int
    query: str


@router.post("/search")
async def search_memory(data: MemoryQueryRequest, db: AsyncSession = Depends(get_session)):
    return await query_project_memory(db, data.project_id, data.query)
