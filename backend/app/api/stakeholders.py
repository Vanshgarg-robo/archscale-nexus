from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session, get_current_user, verify_project_access
from app.models import Stakeholder, ProjectStakeholder, User
from app.schemas.stakeholder import StakeholderCreate, StakeholderRead, StakeholderMatrix, StakeholderWorkload
from app.services.stakeholder_service import get_stakeholder_matrix, get_stakeholder_workloads

router = APIRouter(prefix="/api/stakeholders", tags=["stakeholders"])


@router.get("/project/{project_id}", response_model=list[StakeholderRead])
async def list_stakeholders(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ProjectStakeholder).where(ProjectStakeholder.project_id == project_id)
    )
    assignments = result.scalars().all()
    return [a.stakeholder for a in assignments]


@router.get("/matrix/{project_id}")
async def stakeholder_matrix(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
    matrix = await get_stakeholder_matrix(db, project_id)
    return [m.model_dump() for m in matrix]


@router.get("/workload/{project_id}")
async def stakeholder_workloads(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
    workloads = await get_stakeholder_workloads(db, project_id)
    return [w.model_dump() for w in workloads]


@router.get("/{stakeholder_id}", response_model=StakeholderRead)
async def get_stakeholder(
    stakeholder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Stakeholder).where(Stakeholder.id == stakeholder_id))
    stakeholder = result.scalar_one_or_none()
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    return stakeholder
