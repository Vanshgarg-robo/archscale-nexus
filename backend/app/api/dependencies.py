from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session
from app.models import Dependency
from app.schemas.dependency import DependencyCreate, DependencyRead
from app.services.dependency_service import get_downstream_chain, get_upstream_chain, get_critical_path

router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])


@router.get("/project/{project_id}")
async def list_dependencies(project_id: int, db: AsyncSession = Depends(get_session)):
    from app.models import Task
    task_result = await db.execute(select(Task.id).where(Task.project_id == project_id))
    task_ids = [r[0] for r in task_result.all()]

    result = await db.execute(select(Dependency).where(Dependency.source_id.in_(task_ids)))
    deps = result.scalars().all()

    return [
        {
            "id": d.id,
            "source_id": d.source_id,
            "target_id": d.target_id,
            "relationship_type": d.relationship_type.value,
            "source_task_title": d.source_task.title if d.source_task else None,
            "target_task_title": d.target_task.title if d.target_task else None,
        }
        for d in deps
    ]


@router.get("/downstream/{task_id}")
async def downstream_chain(task_id: int, db: AsyncSession = Depends(get_session)):
    return await get_downstream_chain(db, task_id)


@router.get("/upstream/{task_id}")
async def upstream_chain(task_id: int, db: AsyncSession = Depends(get_session)):
    return await get_upstream_chain(db, task_id)


@router.get("/critical-path/{project_id}")
async def critical_path(project_id: int, db: AsyncSession = Depends(get_session)):
    return await get_critical_path(db, project_id)


@router.post("")
async def create_dependency(data: DependencyCreate, db: AsyncSession = Depends(get_session)):
    dep = Dependency(**data.model_dump())
    db.add(dep)
    await db.flush()
    return {"id": dep.id, "source_id": dep.source_id, "target_id": dep.target_id}
