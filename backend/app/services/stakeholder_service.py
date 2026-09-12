from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Stakeholder, Task, Approval, ProjectStakeholder, Risk
from app.models.enums import TaskStatus, ApprovalStatus
from app.schemas.stakeholder import StakeholderMatrix, StakeholderWorkload


async def get_stakeholder_matrix(db: AsyncSession, project_id: int) -> list[StakeholderMatrix]:
    result = await db.execute(
        select(ProjectStakeholder).where(ProjectStakeholder.project_id == project_id)
    )
    assignments = result.scalars().all()

    matrix = []
    for assignment in assignments:
        stakeholder = assignment.stakeholder

        task_count_result = await db.execute(
            select(func.count(Task.id)).where(
                Task.assignee_id == stakeholder.id,
                Task.project_id == project_id
            )
        )
        task_count = task_count_result.scalar() or 0

        approval_count_result = await db.execute(
            select(func.count(Approval.id)).where(
                Approval.approver_id == stakeholder.id,
                Approval.status == ApprovalStatus.PENDING,
                Approval.project_id == project_id
            )
        )
        approval_count = approval_count_result.scalar() or 0

        risk_count_result = await db.execute(
            select(func.count(Risk.id)).where(
                Risk.owner_id == stakeholder.id,
                Risk.project_id == project_id,
                Risk.is_active == True
            )
        )
        risk_count = risk_count_result.scalar() or 0

        matrix.append(StakeholderMatrix(
            stakeholder=stakeholder,
            assigned_tasks_count=task_count,
            pending_approvals_count=approval_count,
            active_risks_count=risk_count,
            responsibility_areas=assignment.responsibility_areas,
        ))

    return matrix


async def get_stakeholder_workloads(db: AsyncSession, project_id: int) -> list[StakeholderWorkload]:
    result = await db.execute(
        select(ProjectStakeholder).where(ProjectStakeholder.project_id == project_id)
    )
    assignments = result.scalars().all()

    workloads = []
    for assignment in assignments:
        s = assignment.stakeholder

        total_result = await db.execute(
            select(func.count(Task.id)).where(Task.assignee_id == s.id, Task.project_id == project_id)
        )
        total = total_result.scalar() or 0

        completed_result = await db.execute(
            select(func.count(Task.id)).where(
                Task.assignee_id == s.id, Task.project_id == project_id, Task.status == TaskStatus.COMPLETED
            )
        )
        completed = completed_result.scalar() or 0

        overdue_result = await db.execute(
            select(func.count(Task.id)).where(
                Task.assignee_id == s.id, Task.project_id == project_id,
                Task.status != TaskStatus.COMPLETED, Task.due_date < func.now()
            )
        )
        overdue = overdue_result.scalar() or 0

        approval_result = await db.execute(
            select(func.count(Approval.id)).where(
                Approval.approver_id == s.id, Approval.status == ApprovalStatus.PENDING, Approval.project_id == project_id
            )
        )
        pending = approval_result.scalar() or 0

        score = (total * 10) + (overdue * 25) + (pending * 15)

        workloads.append(StakeholderWorkload(
            stakeholder_id=s.id,
            name=s.name,
            role=s.role,
            total_tasks=total,
            completed_tasks=completed,
            overdue_tasks=overdue,
            pending_approvals=pending,
            workload_score=min(score, 100.0),
        ))

    return workloads


async def update_influence_scores(db: AsyncSession, project_id: int) -> None:
    result = await db.execute(
        select(ProjectStakeholder).where(ProjectStakeholder.project_id == project_id)
    )
    assignments = result.scalars().all()

    for assignment in assignments:
        s = assignment.stakeholder

        task_result = await db.execute(
            select(func.count(Task.id)).where(Task.assignee_id == s.id, Task.project_id == project_id)
        )
        task_count = task_result.scalar() or 0

        approval_result = await db.execute(
            select(func.count(Approval.id)).where(Approval.approver_id == s.id, Approval.project_id == project_id)
        )
        approval_count = approval_result.scalar() or 0

        decision_weight = 20 if assignment.approval_authority else 0
        score = min(100, (task_count * 8) + (approval_count * 12) + decision_weight + 20)
        s.influence_score = score

    await db.flush()
