from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session
from app.models import Task
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("/project/{project_id}", response_model=list[TaskRead])
async def list_tasks(project_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = result.scalars().all()
    return [
        TaskRead(
            **{c.key: getattr(t, c.key) for c in Task.__table__.columns},
            assignee_name=t.assignee.name if t.assignee else None,
        )
        for t in tasks
    ]


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(task_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskRead(
        **{c.key: getattr(task, c.key) for c in Task.__table__.columns},
        assignee_name=task.assignee.name if task.assignee else None,
    )


@router.post("", response_model=TaskRead)
async def create_task(data: TaskCreate, db: AsyncSession = Depends(get_session)):
    task = Task(**data.model_dump())
    db.add(task)
    await db.flush()
    return TaskRead(
        **{c.key: getattr(task, c.key) for c in Task.__table__.columns},
        assignee_name=task.assignee.name if task.assignee else None,
    )


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(task_id: int, data: TaskUpdate, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    await db.flush()
    return TaskRead(
        **{c.key: getattr(task, c.key) for c in Task.__table__.columns},
        assignee_name=task.assignee.name if task.assignee else None,
    )
