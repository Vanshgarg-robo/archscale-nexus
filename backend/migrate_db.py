"""
Database Migration Script:
Adds missing columns to projects table on PostgreSQL / SQLite.
"""

import asyncio
from sqlalchemy import text
from app.database import engine


async def run_migration():
    async with engine.begin() as conn:
        project_cols = [
            ("client_id", "INTEGER"),
            ("overall_completion_pct", "FLOAT DEFAULT 0.0"),
            ("design_completion_pct", "FLOAT DEFAULT 0.0"),
            ("planning_completion_pct", "FLOAT DEFAULT 0.0"),
            ("execution_completion_pct", "FLOAT DEFAULT 0.0"),
            ("documentation_completion_pct", "FLOAT DEFAULT 0.0"),
        ]
        for col_name, col_type in project_cols:
            try:
                await conn.execute(text(f"ALTER TABLE projects ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                print(f"[Success] Added or verified column: {col_name}")
            except Exception as e:
                try:
                    await conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}"))
                    print(f"[Success] Added column: {col_name}")
                except Exception as inner:
                    print(f"[Info] Column {col_name} note: {inner}")

        # Also ensure documents table exists
        from app.database import Base
        await conn.run_sync(Base.metadata.create_all)
        print("[Success] Verified Base.metadata.create_all")


if __name__ == "__main__":
    asyncio.run(run_migration())
