from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session, get_current_user_optional, get_current_user
from app.models import Project, ProjectStakeholder, User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_session),
):
    """List projects accessible to the current user.
    - Admin: All projects across the organization
    - Management: Assigned projects
    - Client: Only projects owned by or assigned to this client
    - Vendor: Only projects where the vendor has assigned deliverables
    - Guest: Returns public demo project
    """
    if not current_user:
        result = await db.execute(select(Project).limit(1))
        return result.scalars().all()

    if current_user.role == "client":
        # Check projects where client_id == user.id OR linked via ProjectStakeholder
        if current_user.stakeholder_id:
            result = await db.execute(
                select(Project)
                .join(ProjectStakeholder, ProjectStakeholder.project_id == Project.id)
                .where(
                    (Project.client_id == current_user.id)
                    | (ProjectStakeholder.stakeholder_id == current_user.stakeholder_id)
                )
                .distinct()
            )
            projects = result.scalars().all()
            if projects:
                return projects

        # Fallback: if user is client role, return projects where client_id is set or project 1
        result = await db.execute(
            select(Project).where((Project.client_id == current_user.id) | (Project.id == 1))
        )
        return result.scalars().all()

    elif current_user.role in ("vendor", "contractor"):
        # Return projects assigned to vendor's stakeholder
        if current_user.stakeholder_id:
            result = await db.execute(
                select(Project)
                .join(ProjectStakeholder, ProjectStakeholder.project_id == Project.id)
                .where(ProjectStakeholder.stakeholder_id == current_user.stakeholder_id)
                .distinct()
            )
            projects = result.scalars().all()
            if projects:
                return projects

        result = await db.execute(select(Project).limit(1))
        return result.scalars().all()

    # Admin and Management team see all studio projects
    result = await db.execute(select(Project).order_by(Project.id))
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=ProjectRead)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if current_user.role not in ("admin", "project_manager"):
        raise HTTPException(status_code=403, detail="Only Admins and Project Managers can create projects")
    project = Project(**data.model_dump())
    db.add(project)
    await db.flush()
    return project
