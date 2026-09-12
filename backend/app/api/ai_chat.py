from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
from app.deps import get_session
from app.models import Task, Dependency, Stakeholder, Approval, ChangeRequest, Risk, Decision, ProjectStakeholder
from app.schemas.ai import ChatRequest, SummaryRequest, SimulationRequest
from app.services.ai_service import chat_with_project, generate_summary, simulate_scenario

router = APIRouter(prefix="/api/ai", tags=["ai"])


async def _build_project_context(db: AsyncSession, project_id: int) -> str:
    from app.models import Project
    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one_or_none()

    task_result = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = task_result.scalars().all()

    stakeholder_result = await db.execute(
        select(ProjectStakeholder).where(ProjectStakeholder.project_id == project_id)
    )
    assignments = stakeholder_result.scalars().all()

    risk_result = await db.execute(select(Risk).where(Risk.project_id == project_id, Risk.is_active == True))
    risks = risk_result.scalars().all()

    approval_result = await db.execute(select(Approval).where(Approval.project_id == project_id))
    approvals = approval_result.scalars().all()

    decision_result = await db.execute(select(Decision).where(Decision.project_id == project_id))
    decisions = decision_result.scalars().all()

    cr_result = await db.execute(select(ChangeRequest).where(ChangeRequest.project_id == project_id))
    change_requests = cr_result.scalars().all()

    context_parts = []
    if project:
        context_parts.append(f"Project: {project.name}\nStatus: {project.status.value}\nHealth: {project.health_score}/100 ({project.health_status.value})\nBudget: ₹{project.budget:,.0f}" if project.budget else f"Project: {project.name}")

    context_parts.append("\nStakeholders:")
    for a in assignments:
        s = a.stakeholder
        context_parts.append(f"- {s.name} ({s.role.value}): {a.responsibility_areas}")

    context_parts.append("\nTasks:")
    for t in tasks:
        assignee = t.assignee.name if t.assignee else "Unassigned"
        context_parts.append(f"- {t.title} [{t.status.value}] Priority:{t.priority.value} Progress:{t.progress}% Assignee:{assignee}")

    context_parts.append("\nRisks:")
    for r in risks:
        context_parts.append(f"- {r.title} [{r.severity.value}] Category:{r.category.value} Score:{r.risk_score}")

    context_parts.append("\nApprovals:")
    for a in approvals:
        approver = a.approver.name if a.approver else "Unknown"
        context_parts.append(f"- {a.title} [{a.status.value}] Approver:{approver}")

    context_parts.append("\nDecisions:")
    for d in decisions:
        context_parts.append(f"- {d.title}: {d.rationale}")

    context_parts.append("\nChange Requests:")
    for cr in change_requests:
        context_parts.append(f"- {cr.title} [{cr.status.value}] Impact:{cr.impact_summary}")

    return "\n".join(context_parts)


@router.post("/chat")
async def chat(data: ChatRequest, db: AsyncSession = Depends(get_session)):
    context = await _build_project_context(db, data.project_id)
    history = [{"role": h.role, "content": h.content} for h in data.history]
    response = await chat_with_project(context, data.message, history)
    return {"response": response}


@router.post("/summarize")
async def summarize(data: SummaryRequest, db: AsyncSession = Depends(get_session)):
    context = await _build_project_context(db, data.project_id)
    result = await generate_summary(context, data.summary_type)
    return result


@router.post("/simulate")
async def simulate(data: SimulationRequest, db: AsyncSession = Depends(get_session)):
    context = await _build_project_context(db, data.project_id)
    result = await simulate_scenario(context, data.scenario)
    return result
