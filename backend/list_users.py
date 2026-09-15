"""
ArchScale Nexus - User Directory & Password Management Utility
Run from backend directory:
    python list_users.py
    python list_users.py --reset-password <email> <new_password>
"""
import asyncio
import sys
from app.database import async_session
from app.models.user import User
from app.services.auth_service import hash_password
from sqlalchemy import select


async def list_all_users():
    async with async_session() as db:
        res = await db.execute(select(User).order_by(User.id))
        users = res.scalars().all()
        print("\n" + "=" * 95)
        print(f"{'ID':<4} | {'Email':<25} | {'Username':<15} | {'Role':<16} | {'Full Name':<20}")
        print("=" * 95)
        for u in users:
            print(f"{u.id:<4} | {u.email:<25} | {u.username or '—':<15} | {u.role:<16} | {u.full_name or '—':<20}")
        print("=" * 95)
        print("Note: Pre-seeded demo accounts (IDs 1-11) use password: password123")
        print("Passwords in the database are cryptographically hashed with bcrypt for security.\n")


async def reset_password(email: str, new_pass: str):
    async with async_session() as db:
        res = await db.execute(select(User).where((User.email == email) | (User.username == email)))
        user = res.scalar_one_or_none()
        if not user:
            print(f"[Error] No user found with email or username: {email}")
            return
        user.hashed_password = hash_password(new_pass)
        await db.commit()
        print(f"[Success] Password for '{user.email}' ({user.username}) successfully updated to: {new_pass}")


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "--reset-password":
        asyncio.run(reset_password(sys.argv[2], sys.argv[3]))
    else:
        asyncio.run(list_all_users())
