from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session
from app.models import Project
from app.schemas.project import ProjectCreate, ProjectRead

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Project))
    projects = result.scalars().all()
    return projects


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=ProjectRead)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_session)):
    project = Project(**data.model_dump())
    db.add(project)
    await db.flush()
    return project
