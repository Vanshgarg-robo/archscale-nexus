import httpx
import json

base_url = "http://127.0.0.1:8000"

print("--- 1. Testing Login ---")
login_res = httpx.post(f"{base_url}/auth/login", json={"email": "arjun@archscale.io", "password": "password123"})
print("Login Status:", login_res.status_code)
if login_res.status_code != 200:
    print("Login error:", login_res.text)
    exit(1)

token_data = login_res.json()
token = token_data.get("access_token")
user = token_data.get("user", {})
print(f"Logged in user: {user.get('full_name')} ({user.get('email')}) - Role: {user.get('role')}")

headers = {"Authorization": f"Bearer {token}"}

print("\n--- 2. Getting Projects ---")
proj_res = httpx.get(f"{base_url}/api/projects", headers=headers)
print("Projects Status:", proj_res.status_code)
projects = proj_res.json()
print(f"Projects count: {len(projects)}")
project_id = projects[0]["id"]
print(f"Active project: ID={project_id}, Name='{projects[0]['name']}'")

print("\n--- 3. Testing Demo Pipeline /api/demo/kitchen-redesign ---")
demo_res = httpx.post(f"{base_url}/api/demo/kitchen-redesign", headers=headers, timeout=30)
print("Demo Pipeline Status:", demo_res.status_code)
if demo_res.status_code == 200:
    data = demo_res.json()
    print("Demo Pipeline status:", data.get("status"))
    steps = data.get("demo_steps", [])
    print(f"Steps executed: {len(steps)}")
    for s in steps:
        print(f"  - Step {s['step']}: {s['title']}")
else:
    print("Demo Pipeline Error:", demo_res.text)

print(f"\n--- 4. Testing All Module Endpoints (Project ID: {project_id}) ---")
test_cases = [
    ("GET", f"/api/dashboard/{project_id}", None),
    ("GET", f"/api/stakeholders/project/{project_id}", None),
    ("GET", f"/api/stakeholders/matrix/{project_id}", None),
    ("GET", f"/api/stakeholders/workload/{project_id}", None),
    ("GET", f"/api/tasks/project/{project_id}", None),
    ("GET", f"/api/dependencies/project/{project_id}", None),
    ("GET", f"/api/dependencies/critical-path/{project_id}", None),
    ("GET", f"/api/approvals/pending/{project_id}", None),
    ("GET", f"/api/approvals/history/{project_id}", None),
    ("GET", f"/api/change-requests/project/{project_id}", None),
    ("GET", f"/api/risks/project/{project_id}", None),
    ("GET", f"/api/risks/summary/{project_id}", None),
    ("GET", f"/api/health/{project_id}", None),
    ("GET", f"/api/health/history/{project_id}", None),
    ("GET", f"/api/blockers/{project_id}", None),
    ("GET", f"/api/notifications/project/{project_id}", None),
    ("GET", f"/api/conversations/{project_id}", None),
    ("GET", f"/api/graph/{project_id}", None),
    ("POST", "/api/memory/search", {"query": "Calacatta marble", "project_id": project_id}),
    ("POST", "/api/impact/analyze", {"change_description": "Move kitchen island 4 feet north", "project_id": project_id}),
    ("POST", "/api/ai/simulate", {"scenario": "Vendor delivery is delayed by 7 days", "project_id": project_id}),
    ("POST", "/api/ai/chat", {"message": "What is blocking installation?", "project_id": project_id}),
    ("POST", "/api/ai/summarize", {"summary_type": "executive", "project_id": project_id}),
]

all_passed = True
for method, path, body in test_cases:
    try:
        if method == "GET":
            r = httpx.get(f"{base_url}{path}", headers=headers, timeout=20)
        else:
            r = httpx.post(f"{base_url}{path}", headers=headers, json=body, timeout=20)
        
        status_symbol = "[PASS]" if r.status_code in (200, 201) else "[FAIL]"
        print(f"{status_symbol} {method} {path} -> {r.status_code}")
        if r.status_code not in (200, 201):
            all_passed = False
            print("   Error detail:", r.text[:200])
    except Exception as e:
        all_passed = False
        print(f"[ERROR] {method} {path} -> EXCEPTION: {e}")

print("\n--- Summary ---")
print("All endpoints passed:", all_passed)
