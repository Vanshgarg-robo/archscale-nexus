"""
ArchScale Nexus - Project Documents & Drawings API
Exposes architectural drawings, specifications, contracts, and MEP schematics.
Protected by RBAC: Full client documents are restricted to the project client and authorized contributors.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.deps import get_session, get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.project import Project, ProjectStakeholder
from app.models.enums import StakeholderRole

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentRead(BaseModel):
    id: int
    project_id: int
    title: str
    document_type: str
    file_url: str | None = None
    content: str | None = None
    extracted_data: str | None = None
    uploaded_by_name: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentCreate(BaseModel):
    project_id: int
    title: str
    document_type: str
    file_url: str | None = None
    content: str | None = None
    extracted_data: str | None = None


@router.get("/project/{project_id}", response_model=list[DocumentRead])
async def list_project_documents(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List documents and drawings for a project.
    Security rule: Only the owning client and authorized project contributors can access complete confidential drawings and documents.
    Admins do not access confidential client documents by default.
    """
    from app.deps import verify_project_access
    await verify_project_access(project_id, current_user, db, allow_admin_coordination=False)

    doc_res = await db.execute(
        select(Document).where(Document.project_id == project_id).order_by(Document.created_at.desc())
    )
    docs = doc_res.scalars().all()

    return [
        DocumentRead(
            id=d.id,
            project_id=d.project_id,
            title=d.title,
            document_type=d.document_type,
            file_url=d.file_url,
            content=d.content,
            extracted_data=d.extracted_data,
            uploaded_by_name=d.uploaded_by.name if d.uploaded_by else None,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.post("", response_model=DocumentRead)
async def create_document(
    data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    from app.deps import verify_project_access, require_not_viewer
    require_not_viewer(current_user)
    await verify_project_access(data.project_id, current_user, db, allow_admin_coordination=False)

    doc = Document(
        project_id=data.project_id,
        uploaded_by_id=current_user.stakeholder_id,
        title=data.title,
        document_type=data.document_type,
        file_url=data.file_url,
        content=data.content,
        extracted_data=data.extracted_data,
        created_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return DocumentRead(
        id=doc.id,
        project_id=doc.project_id,
        title=doc.title,
        document_type=doc.document_type,
        file_url=doc.file_url,
        content=doc.content,
        extracted_data=doc.extracted_data,
        uploaded_by_name=current_user.full_name,
        created_at=doc.created_at,
    )
