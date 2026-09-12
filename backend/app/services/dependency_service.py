from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from collections import deque
from app.models import Task, Dependency
from app.models.enums import RelationshipType, TaskStatus


async def get_downstream_chain(db: AsyncSession, task_id: int) -> list[dict]:
    # Find root task to identify project
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    root_task = task_result.scalar_one_or_none()
    if not root_task:
        return []

    # Single query for all tasks of project
    all_tasks_res = await db.execute(select(Task).where(Task.project_id == root_task.project_id))
    tasks_by_id = {t.id: t for t in all_tasks_res.scalars().all()}

    # Single query for all dependencies of project
    all_deps_res = await db.execute(
        select(Dependency).where(
            Dependency.source_id.in_(tasks_by_id.keys()),
            Dependency.relationship_type == RelationshipType.DEPENDS_ON,
        )
    )
    # Downstream: target_id is prerequisite -> source_id depends on target_id
    adj: dict[int, list[int]] = {}
    for dep in all_deps_res.scalars().all():
        adj.setdefault(dep.target_id, []).append(dep.source_id)

    visited = set()
    chain = []
    queue = deque([(task_id, 0)])

    while queue:
        current_id, depth = queue.popleft()
        if current_id in visited:
            continue
        visited.add(current_id)

        task = tasks_by_id.get(current_id)
        if not task:
            continue

        chain.append({
            "task_id": task.id,
            "task_title": task.title,
            "status": task.status.value,
            "depth": depth,
            "assignee_name": task.assignee.name if task.assignee else None,
            "assignee_id": task.assignee_id,
        })

        for next_id in adj.get(current_id, []):
            if next_id not in visited:
                queue.append((next_id, depth + 1))

    return chain


async def get_upstream_chain(db: AsyncSession, task_id: int) -> list[dict]:
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    root_task = task_result.scalar_one_or_none()
    if not root_task:
        return []

    all_tasks_res = await db.execute(select(Task).where(Task.project_id == root_task.project_id))
    tasks_by_id = {t.id: t for t in all_tasks_res.scalars().all()}

    all_deps_res = await db.execute(
        select(Dependency).where(
            Dependency.source_id.in_(tasks_by_id.keys()),
            Dependency.relationship_type == RelationshipType.DEPENDS_ON,
        )
    )
    # Upstream: source_id depends on target_id -> move from source to target
    adj: dict[int, list[int]] = {}
    for dep in all_deps_res.scalars().all():
        adj.setdefault(dep.source_id, []).append(dep.target_id)

    visited = set()
    chain = []
    queue = deque([(task_id, 0)])

    while queue:
        current_id, depth = queue.popleft()
        if current_id in visited:
            continue
        visited.add(current_id)

        task = tasks_by_id.get(current_id)
        if not task:
            continue

        chain.append({
            "task_id": task.id,
            "task_title": task.title,
            "status": task.status.value,
            "depth": depth,
            "assignee_name": task.assignee.name if task.assignee else None,
            "assignee_id": task.assignee_id,
        })

        for next_id in adj.get(current_id, []):
            if next_id not in visited:
                queue.append((next_id, depth + 1))

    return chain


async def detect_cycles(db: AsyncSession, project_id: int) -> list[list[int]]:
    task_result = await db.execute(select(Task.id).where(Task.project_id == project_id))
    task_ids = [r[0] for r in task_result.all()]

    dep_result = await db.execute(
        select(Dependency).where(Dependency.source_id.in_(task_ids))
    )
    deps = dep_result.scalars().all()

    graph = {}
    for d in deps:
        graph.setdefault(d.source_id, []).append(d.target_id)

    cycles = []
    visited = set()
    path = set()
    path_list = []

    def dfs(node):
        visited.add(node)
        path.add(node)
        path_list.append(node)

        for neighbor in graph.get(node, []):
            if neighbor in path:
                cycle_start = path_list.index(neighbor)
                cycles.append(path_list[cycle_start:] + [neighbor])
            elif neighbor not in visited:
                dfs(neighbor)

        path.remove(node)
        path_list.pop()

    for tid in task_ids:
        if tid not in visited:
            dfs(tid)

    return cycles


async def get_critical_path(db: AsyncSession, project_id: int) -> list[dict]:
    task_result = await db.execute(
        select(Task).where(Task.project_id == project_id, Task.status != TaskStatus.COMPLETED)
    )
    tasks = task_result.scalars().all()

    dep_result = await db.execute(
        select(Dependency).where(
            Dependency.source_id.in_([t.id for t in tasks]),
            Dependency.relationship_type == RelationshipType.DEPENDS_ON,
        )
    )
    deps = dep_result.scalars().all()

    task_map = {t.id: t for t in tasks}
    graph = {}
    in_degree = {t.id: 0 for t in tasks}

    for d in deps:
        graph.setdefault(d.target_id, []).append(d.source_id)
        if d.source_id in in_degree:
            in_degree[d.source_id] = in_degree.get(d.source_id, 0) + 1

    longest_path = {}
    for tid in in_degree:
        longest_path[tid] = task_map[tid].estimated_days or 1

    queue = deque([tid for tid, deg in in_degree.items() if deg == 0])
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph.get(node, []):
            if neighbor in in_degree:
                in_degree[neighbor] -= 1
                est = task_map[neighbor].estimated_days or 1
                longest_path[neighbor] = max(longest_path[neighbor], longest_path[node] + est)
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

    if not longest_path:
        return []

    critical_end = max(longest_path, key=longest_path.get)
    critical_tasks = sorted(longest_path.items(), key=lambda x: x[1], reverse=True)[:10]

    return [
        {
            "task_id": tid,
            "task_title": task_map[tid].title if tid in task_map else "",
            "estimated_days": task_map[tid].estimated_days if tid in task_map else 0,
            "cumulative_days": days,
            "status": task_map[tid].status.value if tid in task_map else "",
        }
        for tid, days in critical_tasks
        if tid in task_map
    ]
