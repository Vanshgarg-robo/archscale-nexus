"""
ArchScale Nexus - Automated RBAC & Dashboard Verification Test Suite
Tests:
1. Admin Account:
   - GET /api/dashboard/operations -> 200 OK
   - GET /api/dashboard/1 (Client detailed view) -> 403 FORBIDDEN (CONFIDENTIALITY ENFORCED!)
   - GET /api/documents/project/1 -> 403 FORBIDDEN (ADMIN RESTRICTED FROM PRIVATE DRAWINGS)
2. Client Account (rajiv@client.com):
   - GET /api/dashboard/1 (Executive Dashboard) -> 200 OK with full details, milestones, drawings, budget
   - GET /api/documents/project/1 -> 200 OK
   - GET /api/dashboard/operations -> 403 FORBIDDEN
   - GET /api/admin/users -> 403 FORBIDDEN
3. Management Team (arjun@, ananya@, operator@, analyst@, viewer@):
   - GET /api/dashboard/management -> 200 OK
   - GET /api/dashboard/1 -> 403 FORBIDDEN
   - Viewer: is_read_only is True
4. Vendor Team (mohan@, deepak@, amit@, priya@):
   - GET /api/dashboard/vendor -> 200 OK (Isolated deliverables only)
   - GET /api/dashboard/1 -> 403 FORBIDDEN
   - GET /api/dashboard/operations -> 403 FORBIDDEN
"""

import urllib.request
import json
import urllib.error
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"


def login(username_or_email, password="password123"):
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=json.dumps({"username_or_email": username_or_email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data["access_token"]
    except urllib.error.HTTPError as e:
        print(f"Login failed for {username_or_email}: HTTP {e.code}")
        return None


def fetch(path, token, method="GET"):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = None
        return e.code, body


def run_tests():
    print("=" * 80)
    print("ARCHSCALE NEXUS - RBAC & DASHBOARD VISIBILITY SECURITY VERIFICATION")
    print("=" * 80)

    results = []

    # ─────────────────────────────────────────────────────────────────────────
    # 1. ADMIN TESTS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[1] Testing ADMIN: admin@archscale.io")
    admin_token = login("admin@archscale.io")
    assert admin_token, "Admin login failed"

    # Admin should see Operations Dashboard
    st, data = fetch("/api/dashboard/operations", admin_token)
    assert st == 200 and data.get("view") == "admin_operations", f"Admin operations failed: {st}"
    print(f"  [OK] GET /api/dashboard/operations -> 200 OK (view: {data.get('view')}, projects: {data.get('total_projects')})")
    results.append(("Admin: Access Operations Dashboard", True))

    # CRITICAL: Admin MUST NOT see client-only detailed executive project view
    st, data = fetch("/api/dashboard/1", admin_token)
    assert st == 403, f"CRITICAL SECURITY LEAK: Admin could access /api/dashboard/1! Status: {st}"
    print(f"  [OK] GET /api/dashboard/1 -> 403 FORBIDDEN (CONFIDENTIAL CLIENT ISOLATION ENFORCED: {data.get('detail')[:60]}...)")
    results.append(("Admin: Blocked from Client Executive Project Dashboard", True))

    # Admin should not see client confidential documents by default
    st, data = fetch("/api/documents/project/1", admin_token)
    assert st == 403, f"Admin could access confidential client documents! Status: {st}"
    print(f"  [OK] GET /api/documents/project/1 -> 403 FORBIDDEN (Client confidential drawings protected)")
    results.append(("Admin: Blocked from Client Confidential Documents", True))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. CLIENT TESTS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[2] Testing CLIENT: rajiv@client.com")
    client_token = login("rajiv@client.com")
    assert client_token, "Client login failed"

    # Client CAN see complete Executive Project Dashboard
    st, data = fetch("/api/dashboard/1", client_token)
    assert st == 200 and data.get("view") == "client_executive", f"Client dashboard failed: {st}"
    print(f"  [OK] GET /api/dashboard/1 -> 200 OK (view: {data.get('view')}, completion: {data.get('progress', {}).get('display_completed')})")
    print(f"    - Milestones count: {len(data.get('milestones', []))}")
    print(f"    - Documents count: {len(data.get('documents', []))}")
    print(f"    - Budget spent: {data.get('budget_breakdown', {}).get('formatted_spent')}")
    results.append(("Client: Access Complete Executive Project Details", True))

    # Client CAN see documents
    st, data = fetch("/api/documents/project/1", client_token)
    assert st == 200 and len(data) > 0, f"Client documents failed: {st}"
    print(f"  [OK] GET /api/documents/project/1 -> 200 OK ({len(data)} drawings & specifications retrieved)")
    results.append(("Client: Access Project Architectural Drawings", True))

    # Client CANNOT see Operations Dashboard
    st, data = fetch("/api/dashboard/operations", client_token)
    assert st == 403, f"Client accessed admin operations! Status: {st}"
    print(f"  [OK] GET /api/dashboard/operations -> 403 FORBIDDEN")
    results.append(("Client: Blocked from Operations Dashboard", True))

    # Client CANNOT see Admin Users
    st, data = fetch("/api/admin/users", client_token)
    assert st == 403, f"Client accessed admin users! Status: {st}"
    print(f"  [OK] GET /api/admin/users -> 403 FORBIDDEN")
    results.append(("Client: Blocked from Admin Suite", True))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. MANAGEMENT TEAM TESTS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[3] Testing MANAGEMENT TEAM:")
    mgmt_users = [
        ("arjun@archscale.io", "project_manager"),
        ("ananya@archscale.io", "architect"),
        ("analyst@archscale.io", "analyst"),
        ("operator@archscale.io", "operator"),
        ("viewer@archscale.io", "viewer"),
    ]
    for email, role in mgmt_users:
        token = login(email)
        assert token, f"Login failed for {email}"

        # Management dashboard access
        st, data = fetch("/api/dashboard/management", token)
        assert st == 200 and data.get("view") == "management", f"Failed for {email}: {st}"
        is_ro = data.get("user", {}).get("is_read_only")
        if role == "viewer":
            assert is_ro is True, "Viewer must be read-only"
        print(f"  [OK] {email} ({role}) -> 200 OK (view: management, read_only: {is_ro}, tasks: {len(data.get('assigned_tasks', []))})")

        # Must NOT see client confidential dashboard
        st, _ = fetch("/api/dashboard/1", token)
        assert st == 403, f"Security leak: {email} accessed client dashboard! Status: {st}"
        print(f"    - Blocked from client executive dashboard: 403 FORBIDDEN")

    results.append(("Management Team: Access Management Dashboard & Blocked from Client Executive", True))
    results.append(("Viewer: Enforced Read-Only Mode", True))

    # ─────────────────────────────────────────────────────────────────────────
    # 4. VENDOR / PARTNER USERS TESTS
    # ─────────────────────────────────────────────────────────────────────────
    print("\n[4] Testing VENDOR / PARTNER USERS:")
    vendor_users = [
        ("mohan@buildpro.com", "site_supervisor / contractor"),
        ("deepak@buildpro.com", "contractor"),
        ("amit@furnishcraft.com", "vendor"),
        ("priya@elecdesign.com", "engineer"),
    ]
    for email, role in vendor_users:
        token = login(email)
        assert token, f"Login failed for {email}"

        st, data = fetch("/api/dashboard/vendor", token)
        assert st == 200 and data.get("view") == "vendor", f"Failed for {email}: {st}"
        print(f"  [OK] {email} ({role}) -> 200 OK (view: vendor, deliverables: {len(data.get('assigned_deliverables', []))})")

        # Must NOT see client confidential dashboard
        st, _ = fetch("/api/dashboard/1", token)
        assert st == 403, f"Security leak: {email} accessed client dashboard! Status: {st}"

        # Must NOT see admin operations
        st, _ = fetch("/api/dashboard/operations", token)
        assert st == 403, f"Security leak: {email} accessed operations! Status: {st}"
        print(f"    - Blocked from client executive view & admin operations: 403 FORBIDDEN")

    results.append(("Vendor Partners: Isolated Deliverables View & Blocked from Client Confidential", True))

    print("\n" + "=" * 80)
    print("ALL RBAC & DASHBOARD SECURITY TESTS PASSED WITH ZERO ANOMALIES!")
    print("=" * 80)


if __name__ == "__main__":
    run_tests()
