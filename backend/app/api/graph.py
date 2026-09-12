from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session
from app.models import Task, Dependency, Stakeholder, Approval, ChangeRequest, Risk, Vendor, ProjectStakeholder
from app.models.enums import RelationshipType

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/{project_id}")
async def get_graph_data(project_id: int, db: AsyncSession = Depends(get_session)):
    task_result = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = task_result.scalars().all()

    stakeholder_result = await db.execute(
        select(ProjectStakeholder).where(ProjectStakeholder.project_id == project_id)
    )
    assignments = stakeholder_result.scalars().all()

    task_ids = [t.id for t in tasks]
    dep_result = await db.execute(select(Dependency).where(Dependency.source_id.in_(task_ids)))
    deps = dep_result.scalars().all()

    approval_result = await db.execute(select(Approval).where(Approval.project_id == project_id))
    approvals = approval_result.scalars().all()

    vendor_result = await db.execute(select(Vendor).where(Vendor.project_id == project_id))
    vendors = vendor_result.scalars().all()

    cr_result = await db.execute(select(ChangeRequest).where(ChangeRequest.project_id == project_id))
    change_requests = cr_result.scalars().all()

    nodes = []
    edges = []

    for t in tasks:
        nodes.append({
            "id": f"task-{t.id}",
            "type": "task",
            "label": t.title,
            "status": t.status.value,
            "metadata": {"priority": t.priority.value, "progress": t.progress, "assignee_id": t.assignee_id},
        })

    for a in assignments:
        s = a.stakeholder
        nodes.append({
            "id": f"stakeholder-{s.id}",
            "type": "stakeholder",
            "label": s.name,
            "role": s.role.value,
            "metadata": {"influence": s.influence_score, "email": s.email},
        })

    for v in vendors:
        nodes.append({
            "id": f"vendor-{v.id}",
            "type": "vendor",
            "label": v.name,
            "metadata": {"specialty": v.specialty, "status": v.contract_status.value},
        })

    for cr in change_requests:
        nodes.append({
            "id": f"cr-{cr.id}",
            "type": "change_request",
            "label": cr.title,
            "status": cr.status.value,
            "metadata": {"risk_level": cr.risk_level, "delay": cr.estimated_delay_days},
        })

    edge_id = 1
    for d in deps:
        edges.append({
            "id": f"edge-{edge_id}",
            "source": f"task-{d.source_id}",
            "target": f"task-{d.target_id}",
            "label": d.relationship_type.value.replace("_", " "),
            "relationship_type": d.relationship_type.value,
        })
        edge_id += 1

    for t in tasks:
        if t.assignee_id:
            edges.append({
                "id": f"edge-{edge_id}",
                "source": f"task-{t.id}",
                "target": f"stakeholder-{t.assignee_id}",
                "label": "assigned to",
                "relationship_type": "assigned_to",
            })
            edge_id += 1

    for a in approvals:
        if a.related_task_id:
            edges.append({
                "id": f"edge-{edge_id}",
                "source": f"task-{a.related_task_id}",
                "target": f"stakeholder-{a.approver_id}",
                "label": "requires approval",
                "relationship_type": "requires_approval",
            })
            edge_id += 1

    return {"nodes": nodes, "edges": edges}
