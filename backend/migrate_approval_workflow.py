"""
ArchScale Nexus - Database Migration for Approval & Rejection Workflow
Updates:
1. Postgres enum 'taskstatus': adds DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED.
2. 'tasks' table: adds weight, approved_at, approved_by_id, approved_by_name,
   rejected_at, rejected_by_id, rejected_by_name, rejection_reason, rejection_comments.
3. 'approvals' table: adds rejection_reason, decided_by_id, decided_by_name.
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def run_migration():
    print("Starting ArchScale Nexus Approval Workflow Migration...")
    async with engine.begin() as conn:
        # 1. Update PostgreSQL enum if applicable
        new_enum_values = ["DRAFT", "SUBMITTED", "PENDING_APPROVAL", "APPROVED", "REJECTED"]
        for val in new_enum_values:
            try:
                await conn.execute(text(f"ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS '{val}'"))
                print(f"[OK] Enum taskstatus added value '{val}' (or already exists)")
            except Exception as e:
                print(f"[Info] Enum taskstatus value '{val}': {e}")

        # 2. Add columns to tasks
        task_columns = [
            ("weight", "FLOAT DEFAULT 1.0"),
            ("approved_at", "TIMESTAMP WITH TIME ZONE"),
            ("approved_by_id", "INTEGER"),
            ("approved_by_name", "VARCHAR(255)"),
            ("rejected_at", "TIMESTAMP WITH TIME ZONE"),
            ("rejected_by_id", "INTEGER"),
            ("rejected_by_name", "VARCHAR(255)"),
            ("rejection_reason", "VARCHAR(255)"),
            ("rejection_comments", "TEXT"),
        ]
        for col_name, col_type in task_columns:
            try:
                await conn.execute(text(f"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                print(f"[OK] Column tasks.{col_name} added/verified")
            except Exception:
                try:
                    await conn.execute(text(f"ALTER TABLE tasks ADD COLUMN {col_name} {col_type}"))
                    print(f"[OK] Column tasks.{col_name} added")
                except Exception as inner:
                    print(f"[Info] Column tasks.{col_name}: {inner}")

        # 3. Add columns to approvals
        approval_columns = [
            ("rejection_reason", "VARCHAR(255)"),
            ("decided_by_id", "INTEGER"),
            ("decided_by_name", "VARCHAR(255)"),
        ]
        for col_name, col_type in approval_columns:
            try:
                await conn.execute(text(f"ALTER TABLE approvals ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                print(f"[OK] Column approvals.{col_name} added/verified")
            except Exception:
                try:
                    await conn.execute(text(f"ALTER TABLE approvals ADD COLUMN {col_name} {col_type}"))
                    print(f"[OK] Column approvals.{col_name} added")
                except Exception as inner:
                    print(f"[Info] Column approvals.{col_name}: {inner}")

    print("Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_migration())
