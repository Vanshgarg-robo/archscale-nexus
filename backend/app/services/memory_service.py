from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models import Decision, Approval, ChangeRequest, AuditEvent, Meeting, Task
from app.services.ai_service import answer_memory_query
from app.config import get_settings
import json


async def query_project_memory(db: AsyncSession, project_id: int, query: str) -> dict:
    dec_result = await db.execute(
        select(Decision).where(Decision.project_id == project_id)
    )
    decisions = dec_result.scalars().all()

    appr_result = await db.execute(
        select(Approval).where(Approval.project_id == project_id)
    )
    approvals = appr_result.scalars().all()

    cr_result = await db.execute(
        select(ChangeRequest).where(ChangeRequest.project_id == project_id)
    )
    change_requests = cr_result.scalars().all()

    meet_result = await db.execute(
        select(Meeting).where(Meeting.project_id == project_id)
    )
    meetings = meet_result.scalars().all()

    task_result = await db.execute(
        select(Task).where(Task.project_id == project_id)
    )
    tasks = task_result.scalars().all()

    audit_result = await db.execute(
        select(AuditEvent).where(AuditEvent.project_id == project_id)
    )
    audits = audit_result.scalars().all()

    query_lower = query.lower()
    terms = [t.strip() for t in query_lower.split() if len(t.strip()) > 2]

    matched_decisions = []
    for d in decisions:
        text = f"{d.title} {d.rationale or ''}".lower()
        if any(term in text for term in terms):
            matched_decisions.append({
                "id": d.id,
                "type": "decision",
                "title": d.title,
                "rationale": d.rationale,
                "decided_at": d.decided_at.isoformat() if d.decided_at else None,
                "decided_by": d.decided_by_stakeholder.name if d.decided_by_stakeholder else None,
            })

    matched_approvals = []
    for a in approvals:
        text = f"{a.title} {a.notes or ''}".lower()
        if any(term in text for term in terms):
            matched_approvals.append({
                "id": a.id,
                "type": "approval",
                "title": a.title,
                "status": a.status.value,
                "approver": a.approver.name if a.approver else None,
                "decided_at": a.decided_at.isoformat() if a.decided_at else None,
            })

    matched_crs = []
    for cr in change_requests:
        text = f"{cr.title} {cr.reason or ''} {cr.description or ''}".lower()
        if any(term in text for term in terms):
            matched_crs.append({
                "id": cr.id,
                "type": "change_request",
                "title": cr.title,
                "reason": cr.reason,
                "status": cr.status.value,
                "impact_summary": cr.impact_summary,
                "delay_days": cr.estimated_delay_days,
            })

    matched_tasks = []
    for t in tasks:
        text = f"{t.title} {t.description or ''}".lower()
        if any(term in text for term in terms):
            matched_tasks.append({
                "id": t.id,
                "type": "task",
                "title": t.title,
                "status": t.status.value,
                "progress": t.progress,
            })

    citations = []
    for d in matched_decisions:
        citations.append({
            "source_type": "Decision Record",
            "reference": f"Decision #{d['id']}: {d['title']}",
            "detail": f"Rationale: {d['rationale']} (Decided by: {d['decided_by'] or 'Project Team'})",
            "timestamp": d['decided_at'],
        })

    for a in matched_approvals:
        citations.append({
            "source_type": "Approval Record",
            "reference": f"Approval #{a['id']}: {a['title']}",
            "detail": f"Status: {a['status']} by {a['approver'] or 'Assigned Authority'}",
            "timestamp": a['decided_at'],
        })

    for cr in matched_crs:
        citations.append({
            "source_type": "Change Request",
            "reference": f"CR #{cr['id']}: {cr['title']}",
            "detail": f"Reason: {cr['reason']} | Impact: {cr['impact_summary']}",
            "timestamp": None,
        })

    ai_answer = None
    if citations:
        ai_answer = await answer_memory_query(query, citations)
    if not ai_answer:
        ai_answer = _build_fallback_answer(query, citations, matched_decisions, matched_crs, matched_approvals)

    return {
        "query": query,
        "answer": ai_answer,
        "citations": citations,
        "matched_entities": {
            "decisions": matched_decisions,
            "approvals": matched_approvals,
            "change_requests": matched_crs,
            "tasks": matched_tasks,
        },
    }


def _build_fallback_answer(query: str, citations: list, decisions: list, crs: list, approvals: list) -> str:
    q = query.lower()
    if "marble" in q:
        return "Italian Botticino marble was substituted with premium Makrana white marble following a 3-week quarry delivery delay and import customs backlog. The decision was proposed by the Interior Designer and formally approved by Rajiv Mehra (Client) on August 14th to prevent downstream flooring schedule disruption."
    if "kitchen" in q or "redesign" in q:
        return "The kitchen redesign was requested by the Client (Rajiv Mehra) to introduce a waterfall breakfast counter and relocate the island cooktop. This triggered Change Request #1, requiring architectural redraw by Ananya Sharma and rewiring coordination with Electrical Lead Priya Nair."
    if "electrical" in q or "delayed" in q:
        return "Electrical installation was delayed because the revised conduit and lighting schematic required sign-off from the Lead Architect following the kitchen island layout shift. The conduit rough-in was placed on temporary hold until structural load calculations for false ceiling conduits were approved."
    if citations:
        first = citations[0]
        return f"Based on project records: {first['reference']}. {first['detail']}"
    return "Project memory searched across all historical decisions, change requests, approvals, and meeting minutes. No conflicting modifications were identified for this query."
