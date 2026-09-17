import asyncio
from app.database import async_session
from app.models import User
from app.services.auth_service import hash_password, verify_password
from sqlalchemy import select

async def main():
    async with async_session() as s:
        res = await s.execute(select(User))
        users = res.scalars().all()
        for u in users:
            pw_ok = verify_password("password123", u.hashed_password)
            print(f"ID={u.id} | Email={u.email} | Role={u.role} | PwOK={pw_ok}")
            if not pw_ok:
                u.hashed_password = hash_password("password123")
                print(f"Reset {u.email} password to password123")
        await s.commit()

if __name__ == "__main__":
    asyncio.run(main())
