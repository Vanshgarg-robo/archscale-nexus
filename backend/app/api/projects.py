from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session, get_current_user, verify_project_access
from app.models import Project, ProjectStakeholder, User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List projects accessible to the current user.
    - Admin: All projects across the organization
    - Management: Assigned projects or studio portfolio
    - Client: Strictly only projects owned by or assigned to this client
    - Vendor / Contractor: Strictly only projects where the vendor has assigned deliverables
    """
    if current_user.is_superadmin or current_user.role == "admin":
        result = await db.execute(select(Project).order_by(Project.id))
        return result.scalars().all()

    if current_user.role == "client":
        conditions = [Project.client_id == current_user.id]
        if current_user.stakeholder_id:
            conditions.append(ProjectStakeholder.stakeholder_id == current_user.stakeholder_id)

        query = (
            select(Project)
            .outerjoin(ProjectStakeholder, ProjectStakeholder.project_id == Project.id)
            .where(*conditions if len(conditions) == 1 else [conditions[0] | conditions[1]])
            .distinct()
            .order_by(Project.id)
        )
        result = await db.execute(query)
        return result.scalars().all()

    if current_user.stakeholder_id:
        result = await db.execute(
            select(Project)
            .join(ProjectStakeholder, ProjectStakeholder.project_id == Project.id)
            .where(ProjectStakeholder.stakeholder_id == current_user.stakeholder_id)
            .distinct()
            .order_by(Project.id)
        )
        return result.scalars().all()

    # Operations & platform oversight without specific stakeholder profile (analyst, operator, viewer)
    result = await db.execute(select(Project).order_by(Project.id))
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    project = await verify_project_access(project_id, current_user, db)
    return project


@router.post("", response_model=ProjectRead)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if current_user.role not in ("admin", "project_manager") and not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Only Admins and Project Managers can create projects")
    project = Project(**data.model_dump())
    db.add(project)
    await db.commit()
    return project
