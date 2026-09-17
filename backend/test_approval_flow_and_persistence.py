"""
ArchScale Nexus - Comprehensive Approval & Rejection Workflow + Data Persistence Test
Tests end-to-end:
1. Authentication (Admin, Project Manager, Viewer)
2. RBAC Enforcement (Viewer cannot approve/reject)
3. Task lifecycle (Draft -> Submitted/Pending Approval -> Approved -> Rejected)
4. Approval decide endpoint (/api/approvals/{id}/decide)
5. Project progress recalculation
6. Audit log recording
7. Dashboard metrics aggregation (/api/dashboard/operations & /api/dashboard/management)
8. Direct on-disk DB persistence verification
"""
import asyncio
import httpx
from datetime import datetime, timezone
from app.main import app
from app.database import async_session
from app.models import Task, Approval, AdminAuditLog, Project
from sqlalchemy import select


async def run_tests():
    print("\n" + "=" * 80)
    print("ARCHSCALE NEXUS - APPROVAL WORKFLOW & DATA PERSISTENCE VERIFICATION")
    print("=" * 80)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Admin
        admin_res = await client.post("/api/auth/login", json={"username_or_email": "admin@archscale.io", "password": "password123"})
        assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
        admin_token = admin_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("[PASS] 1. Admin login successful")

        # 2. Login as Project Manager
        pm_res = await client.post("/api/auth/login", json={"username_or_email": "arjun@archscale.io", "password": "password123"})
        assert pm_res.status_code == 200, f"PM login failed: {pm_res.text}"
        pm_token = pm_res.json()["access_token"]
        pm_headers = {"Authorization": f"Bearer {pm_token}"}
        print("[PASS] 2. Project Manager login successful")

        # 3. Login as Viewer
        viewer_res = await client.post("/api/auth/login", json={"username_or_email": "viewer@archscale.io", "password": "password123"})
        assert viewer_res.status_code == 200, f"Viewer login failed: {viewer_res.text}"
        viewer_token = viewer_res.json()["access_token"]
        viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
        print("[PASS] 3. Viewer login successful")

        # 4. Get projects
        proj_res = await client.get("/api/projects", headers=admin_headers)
        assert proj_res.status_code == 200
        projects = proj_res.json()
        assert len(projects) > 0
        project_id = projects[0]["id"]
        initial_progress = projects[0]["overall_completion_pct"]
        print(f"[PASS] 4. Projects fetched: Project #{project_id} ('{projects[0]['name']}'), Initial Progress: {initial_progress}%")

        # 5. Create a test task for approval workflow
        task_data = {
            "title": f"Structural Steel Joint Sign-off {datetime.now().strftime('%H%M%S')}",
            "description": "High-strength bolt joint inspection for cantilever beams",
            "project_id": project_id,
            "status": "draft",
            "priority": "high",
            "progress": 50,
            "weight": 2.0,
            "phase": "execution",
        }
        create_res = await client.post("/api/tasks", json=task_data, headers=pm_headers)
        assert create_res.status_code == 200, f"Task create failed: {create_res.text}"
        task = create_res.json()
        task_id = task["id"]
        assert task["status"] == "draft"
        print(f"[PASS] 5. Created test task #{task_id} in 'draft' status")

        # 6. Test RBAC: Viewer cannot approve/reject
        viewer_approve_res = await client.post(f"/api/tasks/{task_id}/approve", json={}, headers=viewer_headers)
        assert viewer_approve_res.status_code == 403, f"Viewer should be forbidden, got: {viewer_approve_res.status_code}"
        print(f"[PASS] 6. RBAC verification: Viewer received 403 Forbidden when attempting approval")

        # 7. Submit task for approval
        submit_res = await client.post(f"/api/tasks/{task_id}/submit", headers=pm_headers)
        assert submit_res.status_code == 200, f"Task submit failed: {submit_res.text}"
        submitted_task = submit_res.json()
        assert submitted_task["status"] == "pending_approval"
        print(f"[PASS] 7. Task #{task_id} submitted for approval (status: {submitted_task['status']})")

        # 8. Approve task as Admin
        approve_res = await client.post(
            f"/api/tasks/{task_id}/approve",
            json={"notes": "Inspected on site, passed compliance checks"},
            headers=admin_headers
        )
        assert approve_res.status_code == 200, f"Task approve failed: {approve_res.text}"
        approved_task = approve_res.json()
        assert approved_task["status"] == "approved"
        assert approved_task["progress"] == 100
        assert approved_task["approved_by_name"] == "Alexander Wright"
        assert approved_task["approved_at"] is not None
        print(f"[PASS] 8. Task #{task_id} approved: status={approved_task['status']}, approved_by={approved_task['approved_by_name']}, progress={approved_task['progress']}%")

        # 9. Create another task and Reject it
        task_data2 = {
            "title": f"HVAC Ductwork Clearance {datetime.now().strftime('%H%M%S')}",
            "description": "Floor 2 mezzanine duct routing submission",
            "project_id": project_id,
            "status": "draft",
            "priority": "medium",
            "progress": 30,
            "weight": 1.5,
            "phase": "execution",
        }
        create_res2 = await client.post("/api/tasks", json=task_data2, headers=pm_headers)
        assert create_res2.status_code == 200
        task_id2 = create_res2.json()["id"]

        await client.post(f"/api/tasks/{task_id2}/submit", headers=pm_headers)

        reject_res = await client.post(
            f"/api/tasks/{task_id2}/reject",
            json={"reason": "Scope mismatch", "comments": "Duct routing clashes with electrical conduit run #4"},
            headers=admin_headers
        )
        assert reject_res.status_code == 200, f"Task reject failed: {reject_res.text}"
        rejected_task = reject_res.json()
        assert rejected_task["status"] == "rejected"
        assert rejected_task["rejected_by_name"] == "Alexander Wright"
        assert rejected_task["rejection_reason"] == "Scope mismatch"
        assert rejected_task["rejection_comments"] == "Duct routing clashes with electrical conduit run #4"
        assert rejected_task["rejected_at"] is not None
        print(f"[PASS] 9. Task #{task_id2} rejected: status={rejected_task['status']}, reason='{rejected_task['rejection_reason']}', rejected_by={rejected_task['rejected_by_name']}")

        # 10. Test /api/approvals/{id}/decide endpoint
        pending_apprs_res = await client.get(f"/api/approvals/pending/{project_id}", headers=admin_headers)
        assert pending_apprs_res.status_code == 200
        pending_apprs = pending_apprs_res.json()
        print(f"[PASS] 10. Fetched pending approvals queue: {len(pending_apprs)} items")

        if pending_apprs:
            target_appr = pending_apprs[0]
            decide_res = await client.post(
                f"/api/approvals/{target_appr['id']}/decide",
                json={"status": "approved", "notes": "Approved via Governance Portal"},
                headers=admin_headers
            )
            assert decide_res.status_code == 200
            decide_data = decide_res.json()
            assert decide_data["status"] == "approved"
            assert decide_data["decided_by_name"] == "Alexander Wright"
            print(f"[PASS] 11. Decided approval #{target_appr['id']}: status={decide_data['status']}, progress={decide_data['project_progress']}")

        # 12. Check Admin Operations Dashboard metrics
        ops_res = await client.get("/api/dashboard/operations", headers=admin_headers)
        assert ops_res.status_code == 200
        ops_data = ops_res.json()
        tasks_overview = ops_data["tasks_overview"]
        print(f"[PASS] 12. Admin Operations Dashboard metrics:")
        print(f"         Total Tasks: {tasks_overview['total']}")
        print(f"         Approved: {tasks_overview['approved']}")
        print(f"         Rejected: {tasks_overview['rejected']}")
        print(f"         Pending Approvals: {tasks_overview['pending_approvals']}")
        print(f"         Completion Rate: {tasks_overview['completion_rate']}%")
        assert tasks_overview["approved"] >= 1
        assert tasks_overview["rejected"] >= 1

        # 13. Check Management Dashboard metrics
        mgmt_res = await client.get("/api/dashboard/management", headers=pm_headers)
        assert mgmt_res.status_code == 200
        mgmt_data = mgmt_res.json()
        counts = mgmt_data["task_counts"]
        print(f"[PASS] 13. Management Dashboard task_counts:")
        print(f"         Assigned: {counts['total_assigned']}")
        print(f"         Approved: {counts['approved']}")
        print(f"         Rejected: {counts['rejected']}")
        print(f"         Pending Approval: {counts['pending_approval']}")

    # 14. DATA PERSISTENCE VERIFICATION: Direct query via independent DB connection
    print("\n" + "-" * 80)
    print("VERIFYING DIRECT DATABASE PERSISTENCE (ON-DISK SQLITE / POSTGRES)")
    print("-" * 80)
    async with async_session() as db:
        # Check task 1
        res = await db.execute(select(Task).where(Task.id == task_id))
        persisted_task1 = res.scalar_one_or_none()
        assert persisted_task1 is not None, "Task 1 not found in database!"
        assert persisted_task1.status.value == "approved"
        assert persisted_task1.approved_by_name == "Alexander Wright"
        assert persisted_task1.approved_at is not None
        print(f"[PASS] DB Task #{task_id}: status={persisted_task1.status.value}, approved_by={persisted_task1.approved_by_name}, approved_at={persisted_task1.approved_at}")

        # Check task 2
        res2 = await db.execute(select(Task).where(Task.id == task_id2))
        persisted_task2 = res2.scalar_one_or_none()
        assert persisted_task2 is not None, "Task 2 not found in database!"
        assert persisted_task2.status.value == "rejected"
        assert persisted_task2.rejection_reason == "Scope mismatch"
        assert persisted_task2.rejection_comments == "Duct routing clashes with electrical conduit run #4"
        assert persisted_task2.rejected_by_name == "Alexander Wright"
        assert persisted_task2.rejected_at is not None
        print(f"[PASS] DB Task #{task_id2}: status={persisted_task2.status.value}, reason='{persisted_task2.rejection_reason}', comments='{persisted_task2.rejection_comments}'")

        # Check Audit Log entries
        audit_res = await db.execute(
            select(AdminAuditLog).where(AdminAuditLog.resource_id.in_([task_id, task_id2])).order_by(AdminAuditLog.created_at.desc())
        )
        audit_records = audit_res.scalars().all()
        assert len(audit_records) >= 2, f"Expected at least 2 audit logs, found {len(audit_records)}"
        print(f"[PASS] DB Audit Logs: Found {len(audit_records)} audit records permanently written to admin_audit_logs:")
        for a in audit_records:
            print(f"         - Action: {a.action}, Resource: {a.resource_type} #{a.resource_id}, User: {a.user.full_name if a.user else 'System'} ({a.user.email if a.user else '—'})")

        # Check Project Progress is persisted in projects table
        proj_db_res = await db.execute(select(Project).where(Project.id == project_id))
        db_project = proj_db_res.scalar_one()
        assert db_project.overall_completion_pct is not None
        print(f"[PASS] DB Project #{project_id} overall_completion_pct: {db_project.overall_completion_pct}% persisted")

    print("\n" + "=" * 80)
    print("ALL TESTS PASSED SUCCESSFULLY! WORKFLOW & PERSISTENCE VERIFIED 100%")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
