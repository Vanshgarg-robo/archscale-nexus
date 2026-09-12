from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Risk, Task, Approval, Dependency
from app.models.enums import TaskStatus, ApprovalStatus, RiskCategory, RiskSeverity


async def calculate_project_risks(db: AsyncSession, project_id: int) -> list[dict]:
    result = await db.execute(
        select(Risk).where(Risk.project_id == project_id, Risk.is_active == True)
    )
    risks = result.scalars().all()

    for risk in risks:
        risk.risk_score = risk.probability * risk.impact_score
        if risk.risk_score >= 7.5:
            risk.severity = RiskSeverity.CRITICAL
        elif risk.risk_score >= 5.0:
            risk.severity = RiskSeverity.HIGH
        elif risk.risk_score >= 2.5:
            risk.severity = RiskSeverity.MEDIUM
        else:
            risk.severity = RiskSeverity.LOW

    await db.flush()

    return [
        {
            "id": r.id,
            "title": r.title,
            "category": r.category.value,
            "severity": r.severity.value,
            "probability": r.probability,
            "impact_score": r.impact_score,
            "risk_score": r.risk_score,
            "mitigation": r.mitigation,
            "owner_id": r.owner_id,
        }
        for r in risks
    ]


async def assess_schedule_risk(db: AsyncSession, project_id: int) -> dict:
    overdue_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id == project_id,
            Task.status != TaskStatus.COMPLETED,
            Task.status != TaskStatus.CANCELLED,
            Task.due_date < func.now(),
        )
    )
    overdue_count = overdue_result.scalar() or 0

    total_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id == project_id,
            Task.status != TaskStatus.CANCELLED,
        )
    )
    total_count = total_result.scalar() or 1

    ratio = overdue_count / total_count
    if ratio > 0.3:
        severity = "critical"
    elif ratio > 0.15:
        severity = "high"
    elif ratio > 0.05:
        severity = "medium"
    else:
        severity = "low"

    return {
        "category": "schedule",
        "severity": severity,
        "overdue_tasks": overdue_count,
        "total_tasks": total_count,
        "ratio": round(ratio, 2),
    }


async def assess_approval_risk(db: AsyncSession, project_id: int) -> dict:
    pending_result = await db.execute(
        select(func.count(Approval.id)).where(
            Approval.project_id == project_id,
            Approval.status == ApprovalStatus.PENDING,
        )
    )
    pending_count = pending_result.scalar() or 0

    overdue_result = await db.execute(
        select(func.count(Approval.id)).where(
            Approval.project_id == project_id,
            Approval.status == ApprovalStatus.PENDING,
            Approval.due_date < func.now(),
        )
    )
    overdue_count = overdue_result.scalar() or 0

    if overdue_count > 3:
        severity = "critical"
    elif overdue_count > 1:
        severity = "high"
    elif pending_count > 5:
        severity = "medium"
    else:
        severity = "low"

    return {
        "category": "approval",
        "severity": severity,
        "pending_approvals": pending_count,
        "overdue_approvals": overdue_count,
    }


async def get_risk_summary(db: AsyncSession, project_id: int) -> dict:
    risks = await calculate_project_risks(db, project_id)
    schedule = await assess_schedule_risk(db, project_id)
    approval = await assess_approval_risk(db, project_id)

    by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    by_category = {}

    for r in risks:
        by_severity[r["severity"]] = by_severity.get(r["severity"], 0) + 1
        by_category[r["category"]] = by_category.get(r["category"], 0) + 1

    return {
        "total_risks": len(risks),
        "by_severity": by_severity,
        "by_category": by_category,
        "schedule_risk": schedule,
        "approval_risk": approval,
        "risks": risks,
    }
