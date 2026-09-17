import asyncio
import json
import httpx
from datetime import datetime
import app.services.ai_service
from app.main import app as fastapi_app

# Disable external LLM calls during RBAC testing for instant authorization check
app.services.ai_service._get_gemini_client = lambda: None

USERS = [
    {"email": "admin@archscale.io", "password": "password123", "role": "admin", "name": "Admin"},
    {"email": "viewer@archscale.io", "password": "password123", "role": "viewer", "name": "Viewer"},
    {"email": "operator@archscale.io", "password": "password123", "role": "operator", "name": "Operator"},
    {"email": "analyst@archscale.io", "password": "password123", "role": "analyst", "name": "Analyst"},
    {"email": "ananya@archscale.io", "password": "password123", "role": "architect", "name": "Architect"},
    {"email": "arjun@archscale.io", "password": "password123", "role": "project_manager", "name": "PM"},
    {"email": "mohan@buildpro.com", "password": "password123", "role": "site_supervisor", "name": "Supervisor"},
    {"email": "amit@furnishcraft.com", "password": "password123", "role": "vendor", "name": "Vendor (P1)"},
    {"email": "deepak@buildpro.com", "password": "password123", "role": "contractor", "name": "Contractor"},
    {"email": "priya@elecdesign.com", "password": "password123", "role": "engineer", "name": "Engineer"},
    {"email": "rajiv@client.com", "password": "password123", "role": "client", "name": "Client (P1)"},
    {"email": "vanshgargktl@gmail.com", "password": "password123", "role": "client", "name": "Client (P2)"},
]

async def run_audit():
    print("=== STARTING CONCURRENT RBAC MATRIX AUDIT ===", flush=True)
    transport = httpx.ASGITransport(app=fastapi_app)
    tokens = {}

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login all users concurrently
        async def do_login(u):
            resp = await client.post(
                "/api/auth/login",
                json={"username_or_email": u["email"], "password": u["password"]}
            )
            if resp.status_code == 200:
                return u["email"], resp.json()["access_token"]
            print(f"  [AUTH FAIL] {u['email']}: {resp.status_code}", flush=True)
            return u["email"], None

        login_results = await asyncio.gather(*[do_login(u) for u in USERS])
        for email, token in login_results:
            tokens[email] = token
            print(f"  [AUTH OK] {email}", flush=True)

        test_endpoints = [
            ("Admin Dashboard", "GET", "/api/admin/dashboard", None),
            ("Operations Dash", "GET", "/api/dashboard/operations", None),
            ("Management Dash", "GET", "/api/dashboard/management", None),
            ("Vendor Dash", "GET", "/api/dashboard/vendor", None),
            ("Exec Dash (P1)", "GET", "/api/dashboard/1", None),
            ("Exec Dash (P2)", "GET", "/api/dashboard/2", None),
            ("List Projects", "GET", "/api/projects", None),
            ("Project P1", "GET", "/api/projects/1", None),
            ("Project P2", "GET", "/api/projects/2", None),
            ("Documents P1", "GET", "/api/documents/project/1", None),
            ("Documents P2", "GET", "/api/documents/project/2", None),
            ("Tasks P1", "GET", "/api/tasks/project/1", None),
            ("Tasks P2", "GET", "/api/tasks/project/2", None),
            ("Approvals P1", "GET", "/api/approvals/pending/1", None),
            ("Approvals P2", "GET", "/api/approvals/pending/2", None),
            ("CR P1", "GET", "/api/change-requests/project/1", None),
            ("CR P2", "GET", "/api/change-requests/project/2", None),
            ("Stakeholders P1", "GET", "/api/stakeholders/project/1", None),
            ("Stakeholders P2", "GET", "/api/stakeholders/project/2", None),
            ("Dependencies P1", "GET", "/api/dependencies/project/1", None),
            ("Dependencies P2", "GET", "/api/dependencies/project/2", None),
            ("Risks P1", "GET", "/api/risks/project/1", None),
            ("Risks P2", "GET", "/api/risks/project/2", None),
            ("Health P1", "GET", "/api/health/1", None),
            ("Health P2", "GET", "/api/health/2", None),
            ("AI Chat P1", "POST", "/api/ai/chat", {"project_id": 1, "message": "status", "history": []}),
            ("AI Chat P2", "POST", "/api/ai/chat", {"project_id": 2, "message": "status", "history": []}),
            ("Create Task P1", "POST", "/api/tasks", {
                "project_id": 1, "title": "Audit Task", "trade": "general", "zone": "Zone A", "discipline": "General"
            }),
            ("Create Doc P1", "POST", "/api/documents", {
                "project_id": 1, "title": "Audit Drawing", "document_type": "drawing"
            }),
            ("Approve Task P1", "POST", "/api/tasks/1/approve", {"notes": "Audit approve"}),
        ]

        print("\nEvaluating 30 Endpoints across 12 Roles...", flush=True)
        matrix = {}
        sem = asyncio.Semaphore(3)

        async def evaluate_endpoint(ep_name, method, url, body):
            # Unauth check
            async with sem:
                if method == "GET":
                    unauth_resp = await client.get(url)
                else:
                    unauth_resp = await client.post(url, json=body)
            ep_matrix = {"No Auth": unauth_resp.status_code}

            async def eval_user(u):
                async with sem:
                    token = tokens.get(u["email"])
                    headers = {"Authorization": f"Bearer {token}"}
                    for attempt in range(3):
                        try:
                            if method == "GET":
                                resp = await client.get(url, headers=headers)
                            else:
                                resp = await client.post(url, json=body, headers=headers)
                            return u["email"], resp.status_code
                        except Exception:
                            await asyncio.sleep(0.1)
                    return u["email"], 500

            user_res = await asyncio.gather(*[eval_user(u) for u in USERS])
            for email, status_code in user_res:
                ep_matrix[email] = status_code
            return ep_name, ep_matrix

        # Run each endpoint with gathered users
        for ep_name, method, url, body in test_endpoints:
            name, ep_data = await evaluate_endpoint(ep_name, method, url, body)
            matrix[name] = ep_data
            print(f"  [DONE] {name}", flush=True)

        # 3. Targeted URL Tampering & Pen Tests
        print("\nRunning Targeted Penetration & Bypass Attacks...", flush=True)
        pen_tests_defs = [
            # A: Rajiv (Client P1) attempting Project 2
            ("rajiv@client.com", "GET", "/api/dashboard/2", None, "Rajiv (Client P1) -> GET /api/dashboard/2"),
            ("rajiv@client.com", "GET", "/api/projects/2", None, "Rajiv (Client P1) -> GET /api/projects/2"),
            ("rajiv@client.com", "GET", "/api/documents/project/2", None, "Rajiv (Client P1) -> GET /api/documents/project/2"),
            ("rajiv@client.com", "GET", "/api/tasks/project/2", None, "Rajiv (Client P1) -> GET /api/tasks/project/2"),
            ("rajiv@client.com", "GET", "/api/approvals/pending/2", None, "Rajiv (Client P1) -> GET /api/approvals/pending/2"),
            ("rajiv@client.com", "GET", "/api/change-requests/project/2", None, "Rajiv (Client P1) -> GET /api/change-requests/project/2"),
            ("rajiv@client.com", "POST", "/api/ai/chat", {"project_id": 2, "message": "leak", "history": []}, "Rajiv (Client P1) -> POST /api/ai/chat P2"),
            
            # B: Vansh (Client P2) attempting Project 1
            ("vanshgargktl@gmail.com", "GET", "/api/dashboard/1", None, "Vansh (Client P2) -> GET /api/dashboard/1"),
            ("vanshgargktl@gmail.com", "GET", "/api/projects/1", None, "Vansh (Client P2) -> GET /api/projects/1"),
            ("vanshgargktl@gmail.com", "GET", "/api/documents/project/1", None, "Vansh (Client P2) -> GET /api/documents/project/1"),
            ("vanshgargktl@gmail.com", "GET", "/api/tasks/project/1", None, "Vansh (Client P2) -> GET /api/tasks/project/1"),
            ("vanshgargktl@gmail.com", "GET", "/api/approvals/pending/1", None, "Vansh (Client P2) -> GET /api/approvals/pending/1"),
            ("vanshgargktl@gmail.com", "GET", "/api/change-requests/project/1", None, "Vansh (Client P2) -> GET /api/change-requests/project/1"),
            ("vanshgargktl@gmail.com", "POST", "/api/ai/chat", {"project_id": 1, "message": "leak", "history": []}, "Vansh (Client P2) -> POST /api/ai/chat P1"),

            # C: Amit (Vendor P1) attempting Project 2
            ("amit@furnishcraft.com", "GET", "/api/projects/2", None, "Amit (Vendor P1) -> GET /api/projects/2"),
            ("amit@furnishcraft.com", "GET", "/api/documents/project/2", None, "Amit (Vendor P1) -> GET /api/documents/project/2"),
            ("amit@furnishcraft.com", "GET", "/api/tasks/project/2", None, "Amit (Vendor P1) -> GET /api/tasks/project/2"),
            ("amit@furnishcraft.com", "GET", "/api/approvals/pending/2", None, "Amit (Vendor P1) -> GET /api/approvals/pending/2"),

            # D: Ananya (Architect P1) attempting Project 2 (Assigned Work Isolation)
            ("ananya@archscale.io", "GET", "/api/projects/2", None, "Ananya (Architect P1) -> GET /api/projects/2"),
            ("ananya@archscale.io", "GET", "/api/documents/project/2", None, "Ananya (Architect P1) -> GET /api/documents/project/2"),
            ("ananya@archscale.io", "GET", "/api/tasks/project/2", None, "Ananya (Architect P1) -> GET /api/tasks/project/2"),
            ("ananya@archscale.io", "GET", "/api/approvals/pending/2", None, "Ananya (Architect P1) -> GET /api/approvals/pending/2"),
            ("ananya@archscale.io", "POST", "/api/ai/chat", {"project_id": 2, "message": "leak", "history": []}, "Ananya (Architect P1) -> POST /api/ai/chat P2"),

            # E: Mohan (Site Supervisor P1) attempting Project 2 (Assigned Work Isolation)
            ("mohan@buildpro.com", "GET", "/api/projects/2", None, "Mohan (Supervisor P1) -> GET /api/projects/2"),
            ("mohan@buildpro.com", "GET", "/api/documents/project/2", None, "Mohan (Supervisor P1) -> GET /api/documents/project/2"),
            ("mohan@buildpro.com", "GET", "/api/tasks/project/2", None, "Mohan (Supervisor P1) -> GET /api/tasks/project/2"),
            ("mohan@buildpro.com", "GET", "/api/approvals/pending/2", None, "Mohan (Supervisor P1) -> GET /api/approvals/pending/2"),

            # F: Admin attempting client executive dashboards and drawings
            ("admin@archscale.io", "GET", "/api/dashboard/1", None, "Admin Isolation -> GET /api/dashboard/1"),
            ("admin@archscale.io", "GET", "/api/dashboard/2", None, "Admin Isolation -> GET /api/dashboard/2"),
            ("admin@archscale.io", "GET", "/api/documents/project/1", None, "Admin Isolation -> GET /api/documents/project/1"),
            ("admin@archscale.io", "GET", "/api/documents/project/2", None, "Admin Isolation -> GET /api/documents/project/2"),

            # G: Viewer attempting write operations
            ("viewer@archscale.io", "POST", "/api/tasks", {"project_id": 1, "title": "Illegal Task", "trade": "general", "zone": "A", "discipline": "Gen"}, "Viewer -> POST /api/tasks"),
            ("viewer@archscale.io", "POST", "/api/documents", {"project_id": 1, "title": "Illegal Doc", "document_type": "drawing"}, "Viewer -> POST /api/documents"),
            ("viewer@archscale.io", "POST", "/api/change-requests", {"project_id": 1, "title": "Illegal CR", "owner_id": 1}, "Viewer -> POST /api/change-requests"),
            ("viewer@archscale.io", "POST", "/api/tasks/1/approve", {"notes": "Illegal approve"}, "Viewer -> POST /api/tasks/1/approve"),
            ("viewer@archscale.io", "POST", "/api/demo/kitchen-redesign", {}, "Viewer -> POST /api/demo/kitchen-redesign"),
            ("viewer@archscale.io", "POST", "/api/demo/reset", {}, "Viewer -> POST /api/demo/reset"),

            # H: Non-admin roles attempting Admin portal endpoints
            ("rajiv@client.com", "GET", "/api/admin/dashboard", None, "Client -> GET /api/admin/dashboard"),
            ("amit@furnishcraft.com", "GET", "/api/admin/users", None, "Vendor -> GET /api/admin/users"),
            ("ananya@archscale.io", "GET", "/api/admin/roles", None, "Architect -> GET /api/admin/roles"),
            ("viewer@archscale.io", "GET", "/api/admin/dashboard", None, "Viewer -> GET /api/admin/dashboard"),
        ]

        async def run_pen_test(email, m, u, b, label):
            async with sem:
                token = tokens[email]
                headers = {"Authorization": f"Bearer {token}"}
                for attempt in range(3):
                    try:
                        if m == "GET":
                            r = await client.get(u, headers=headers)
                        else:
                            r = await client.post(u, json=b, headers=headers)
                        return {
                            "test": label,
                            "status": r.status_code,
                            "passed": r.status_code == 403,
                        }
                    except Exception:
                        await asyncio.sleep(0.1)
                return {
                    "test": label,
                    "status": 500,
                    "passed": False,
                }

        pen_results = await asyncio.gather(*[run_pen_test(*p) for p in pen_tests_defs])

        print("\n" + "=" * 90, flush=True)
        print("PENETRATION & URL TAMPERING AUDIT SUMMARY", flush=True)
        print("=" * 90, flush=True)
        all_passed = True
        for pt in pen_results:
            tag = "PASS [403 FORBIDDEN]" if pt["passed"] else f"FAIL [{pt['status']}]"
            if not pt["passed"]:
                all_passed = False
            print(f"  {tag:22} | {pt['test']}", flush=True)

        print("\n" + "=" * 90, flush=True)
        print(f"ALL PENETRATION & BYPASS TESTS PASSED: {all_passed}", flush=True)
        print("=" * 90, flush=True)

        with open("audit_results.json", "w") as f:
            json.dump({"matrix": matrix, "pen_results": pen_results, "all_passed": all_passed}, f, indent=2)
        print("\nSuccessfully exported audit_results.json!", flush=True)

if __name__ == "__main__":
    asyncio.run(run_audit())
