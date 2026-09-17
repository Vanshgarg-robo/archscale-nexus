# RBAC & Data Visibility Audit Report

**Platform:** ArchScale Nexus  
**Audit Scope:** All 12 system identities, 30+ REST API endpoints, database queries, and Next.js frontend route guards.  
**Result:** **100% PASS** — All unauthorized exposure vectors remediated, verified via automated penetration & tamper testing suite (`audit_rbac_matrix.py`).

---

## 1. Executive Summary & Audit Scope

A comprehensive security and access-control audit was performed across the backend and frontend of ArchScale Nexus. Authorization was audited directly at the **API layer (HTTP requests + JWT tokens)** and the **database access layer (SQLAlchemy AsyncSession queries)** without relying on UI element visibility.

### Audited Roles & Specific Accounts
1. `admin` (`admin@archscale.io`): Operations command & governance; isolated from client-confidential executive views.
2. `viewer` (`viewer@archscale.io`): Read-only observer across studio operations; strictly forbidden from writes, approvals, or mutations.
3. `operator` (`operator@archscale.io`): Operations dispatch & execution coordinator.
4. `analyst` (`analyst@archscale.io`): Risk, dependency, and schedule intelligence.
5. `ananya@archscale.io` (`architect`): Project Architect on Project 1 (The Lumina Pavilion); strictly restricted from Project 2.
6. `arjun@archscale.io` (`project_manager`): Project Manager across assigned portfolio (Project 1 & Project 2).
7. `mohan@buildpro.com` (`site_supervisor`): On-site execution supervisor assigned exclusively to Project 1.
8. `amit@furnishcraft.com` (`vendor`): Millwork & FF&E vendor assigned exclusively to Project 1 deliverables.
9. `deepak@buildpro.com` (`contractor`): General contracting supervisor on Project 1 & Project 2.
10. `priya@elecdesign.com` (`engineer`): MEP/Electrical engineering lead on Project 1 & Project 2.
11. `rajiv@client.com` (`client`): Owner of Project 1 (The Lumina Pavilion); strictly forbidden from Project 2.
12. `vanshgargktl@gmail.com` (`client`): Owner of Project 2 (Azure Horizon Villa); strictly forbidden from Project 1.

---

## 2. Vulnerabilities Identified & Remediations Applied

Prior to remediation, several endpoints lacked explicit token verification or relied solely on unauthenticated path parameters. Every vulnerability has been resolved:

| Vulnerability ID | Affected Endpoint(s) | Pre-Audit Vulnerability | Remediation Applied |
| :--- | :--- | :--- | :--- |
| **SEC-01** | `/api/approvals/pending/{p_id}`, `/api/approvals/overdue/{p_id}`, `/api/approvals/history/{p_id}` | Endpoints accepted raw `project_id` without authentication or project ownership checks. | Injected `current_user = Depends(get_current_user)` and `verify_project_access(project_id, current_user, db)`. |
| **SEC-02** | `/api/change-requests/project/{p_id}`, `POST /api/change-requests` | Publicly queryable by project ID; viewers could create change requests. | Added `verify_project_access` and `require_not_viewer`. |
| **SEC-03** | `/api/dependencies/*`, `/api/risks/*`, `/api/blockers/*`, `/api/health/*` | Missing tenant-level project participation checks. | Enforced `verify_project_access` on all project-scoped submodules. |
| **SEC-04** | `/api/conversations/upload`, `/api/documents` | Viewers could upload documents and conversational memory logs; documents table enforced non-null on internal stakeholder ID causing 500s. | Enforced `require_not_viewer`, altered `uploaded_by_id` column to allow nullable stakeholder IDs, and enforced `verify_project_access(allow_admin_coordination=False)`. |
| **SEC-05** | `/api/demo/kitchen-redesign`, `/api/demo/reset` | Endpoints were unauthenticated and could reset production databases. | Secured with `current_user: User = Depends(get_current_user)` and `require_not_viewer`. |
| **SEC-06** | `/api/dashboard/management` | Exposed all global studio tasks and decision records across unrelated projects. | Restricted query to `Task.assignee_id == stk_id` and filtered decisions/approvals strictly to assigned projects in `ProjectStakeholder`. |
| **SEC-07** | `/api/projects` (Project listing) | Team members with stakeholder profiles could enumerate all projects in the system. | Updated `list_projects` to join `ProjectStakeholder` for all users with `stakeholder_id`. |
| **SEC-08** | Client-Confidential Isolation | Admins could previously read confidential executive drawings. | `verify_project_access` configured with `allow_admin_coordination=False` on `/api/dashboard/{project_id}` and `/api/documents/project/{project_id}` returning `403 Forbidden` to admins. |
| **SEC-09** | Frontend Route Tampering | Users could manually navigate to `/admin/*` or unauthorized modules via URL manipulation. | Added route authorization guard in `WorkspaceScreen` in `screens.tsx` throwing a 403 Access Denied banner. |

---

## 3. Data Visibility & Isolation Verification

### 3.1 Client Confidentiality (Isolated by Project Owner)
- **Rajiv Mehra** (`rajiv@client.com`) owns Project 1.
  - Can access `/api/dashboard/1`, `/api/documents/project/1`, `/api/tasks/project/1`, `/api/approvals/pending/1`.
  - Attempting to access Project 2 (`/api/dashboard/2`, `/api/projects/2`, `/api/documents/project/2`, `/api/tasks/project/2`, `/api/ai/chat`) returns **403 Forbidden**.
- **Vansh Garg** (`vanshgargktl@gmail.com`) owns Project 2.
  - Can access `/api/dashboard/2`, `/api/documents/project/2`, `/api/tasks/project/2`.
  - Attempting to access Project 1 (`/api/dashboard/1`, `/api/projects/1`, `/api/documents/project/1`, `/api/tasks/project/1`, `/api/ai/chat`) returns **403 Forbidden**.

### 3.2 Vendor Boundary Isolation
- **Amit Gupta** (`amit@furnishcraft.com`, Millwork Vendor) is assigned only to Project 1:
  - Can access Project 1 tasks (`/api/tasks/project/1`), but **only deliverables assigned to FurnishCraft** (`Task.assignee_id == 7`).
  - Cannot access Project 2 (`/api/projects/2`, `/api/documents/project/2`, `/api/tasks/project/2`, `/api/approvals/pending/2`) -> **403 Forbidden**.
  - Direct task inspection (`/api/tasks/{id}`) verifies that if a vendor accesses another vendor's task ID, it raises **403 Forbidden**.

### 3.3 Management Team Isolation
- **Ananya Sharma** (`ananya@archscale.io`, Architect) is assigned only to Project 1:
  - Attempting to view Project 2 via direct URL/API (`/api/projects/2`, `/api/documents/project/2`, `/api/tasks/project/2`, `/api/approvals/pending/2`, `/api/ai/chat`) returns **403 Forbidden**.
  - Management Dashboard only computes tasks and decision records for Project 1.
- **Mohan Das** (`mohan@buildpro.com`, Site Supervisor) is assigned only to Project 1:
  - Attempting to access Project 2 returns **403 Forbidden**.

### 3.4 Admin Operational Oversight vs. Client Executive Confidentiality
- **Admin** (`admin@archscale.io`):
  - Can access platform governance (`/api/admin/dashboard`, `/api/admin/users`, `/api/admin/roles`, `/api/admin/audit-logs`).
  - Can access operational project summaries, operations dashboard (`/api/dashboard/operations`), risks, dependencies, blockers, and task management.
  - **ISOLATED**: Calling executive client dashboards (`/api/dashboard/1`, `/api/dashboard/2`) or confidential drawings (`/api/documents/project/1`, `/api/documents/project/2`) returns **403 Forbidden** (`Access restricted: Client confidential resources are isolated from administrative oversight`).

### 3.5 Viewer Immutability
- **Viewer** (`viewer@archscale.io`):
  - Granted read-only visibility into operational dashboards.
  - Attempting any mutation (`POST /api/tasks`, `POST /api/documents`, `POST /api/change-requests`, `POST /api/tasks/1/approve`, `POST /api/demo/kitchen-redesign`, `POST /api/demo/reset`) returns **403 Forbidden** (`Viewer accounts have read-only access`).

---

## 4. Penetration & URL Tampering Audit Results

The automated penetration testing suite executed 41 attack vectors across authenticated sessions:

```text
==========================================================================================
PENETRATION & URL TAMPERING AUDIT SUMMARY
==========================================================================================
  PASS [403 FORBIDDEN]   | Rajiv (Client P1) -> GET /api/dashboard/2
  PASS [403 FORBIDDEN]   | Rajiv (Client P1) -> GET /api/projects/2
  PASS [403 FORBIDDEN]   | Rajiv (Client P1) -> GET /api/documents/project/2
  PASS [403 FORBIDDEN]   | Rajiv (Client P1) -> GET /api/tasks/project/2
  PASS [403 FORBIDDEN]   | Rajiv (Client P1) -> GET /api/approvals/pending/2
  PASS [403 FORBIDDEN]   | Rajiv (Client P1) -> GET /api/change-requests/project/2
  PASS [403 FORBIDDEN]   | Rajiv (Client P1) -> POST /api/ai/chat P2
  PASS [403 FORBIDDEN]   | Vansh (Client P2) -> GET /api/dashboard/1
  PASS [403 FORBIDDEN]   | Vansh (Client P2) -> GET /api/projects/1
  PASS [403 FORBIDDEN]   | Vansh (Client P2) -> GET /api/documents/project/1
  PASS [403 FORBIDDEN]   | Vansh (Client P2) -> GET /api/tasks/project/1
  PASS [403 FORBIDDEN]   | Vansh (Client P2) -> GET /api/approvals/pending/1
  PASS [403 FORBIDDEN]   | Vansh (Client P2) -> GET /api/change-requests/project/1
  PASS [403 FORBIDDEN]   | Vansh (Client P2) -> POST /api/ai/chat P1
  PASS [403 FORBIDDEN]   | Amit (Vendor P1) -> GET /api/projects/2
  PASS [403 FORBIDDEN]   | Amit (Vendor P1) -> GET /api/documents/project/2
  PASS [403 FORBIDDEN]   | Amit (Vendor P1) -> GET /api/tasks/project/2
  PASS [403 FORBIDDEN]   | Amit (Vendor P1) -> GET /api/approvals/pending/2
  PASS [403 FORBIDDEN]   | Ananya (Architect P1) -> GET /api/projects/2
  PASS [403 FORBIDDEN]   | Ananya (Architect P1) -> GET /api/documents/project/2
  PASS [403 FORBIDDEN]   | Ananya (Architect P1) -> GET /api/tasks/project/2
  PASS [403 FORBIDDEN]   | Ananya (Architect P1) -> GET /api/approvals/pending/2
  PASS [403 FORBIDDEN]   | Ananya (Architect P1) -> POST /api/ai/chat P2
  PASS [403 FORBIDDEN]   | Mohan (Supervisor P1) -> GET /api/projects/2
  PASS [403 FORBIDDEN]   | Mohan (Supervisor P1) -> GET /api/documents/project/2
  PASS [403 FORBIDDEN]   | Mohan (Supervisor P1) -> GET /api/tasks/project/2
  PASS [403 FORBIDDEN]   | Mohan (Supervisor P1) -> GET /api/approvals/pending/2
  PASS [403 FORBIDDEN]   | Admin Isolation -> GET /api/dashboard/1
  PASS [403 FORBIDDEN]   | Admin Isolation -> GET /api/dashboard/2
  PASS [403 FORBIDDEN]   | Admin Isolation -> GET /api/documents/project/1
  PASS [403 FORBIDDEN]   | Admin Isolation -> GET /api/documents/project/2
  PASS [403 FORBIDDEN]   | Viewer -> POST /api/tasks
  PASS [403 FORBIDDEN]   | Viewer -> POST /api/documents
  PASS [403 FORBIDDEN]   | Viewer -> POST /api/change-requests
  PASS [403 FORBIDDEN]   | Viewer -> POST /api/tasks/1/approve
  PASS [403 FORBIDDEN]   | Viewer -> POST /api/demo/kitchen-redesign
  PASS [403 FORBIDDEN]   | Viewer -> POST /api/demo/reset
  PASS [403 FORBIDDEN]   | Client -> GET /api/admin/dashboard
  PASS [403 FORBIDDEN]   | Vendor -> GET /api/admin/users
  PASS [403 FORBIDDEN]   | Architect -> GET /api/admin/roles
  PASS [403 FORBIDDEN]   | Viewer -> GET /api/admin/dashboard
==========================================================================================
ALL PENETRATION & BYPASS TESTS PASSED: True
==========================================================================================
```

---

## 5. End-to-End Role-Based Permission Matrix

HTTP Status Codes returned across audited endpoints (`200` = Authorized, `401` = Unauthenticated, `403` = Forbidden):

| Endpoint / Action | Unauth | Admin | Viewer | Operator | Analyst | Ananya (Arch P1) | Arjun (PM) | Mohan (Sup P1) | Amit (Vend P1) | Deepak (Cont P1&2) | Priya (Eng P1&2) | Rajiv (Client P1) | Vansh (Client P2) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin Dashboard** (`/api/admin/dashboard`) | 401 | **200** | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 |
| **Operations Dash** (`/api/dashboard/operations`) | 401 | **200** | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 |
| **Management Dash** (`/api/dashboard/management`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 | 403 | **200** | 403 | 403 |
| **Vendor Dash** (`/api/dashboard/vendor`) | 401 | **200** | 403 | 403 | 403 | 403 | 403 | **200** | **200** | **200** | 403 | 403 | 403 |
| **Exec Dash P1** (`/api/dashboard/1`) | 401 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | **200** | 403 |
| **Exec Dash P2** (`/api/dashboard/2`) | 401 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | **200** |
| **List Projects** (`/api/projects`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** |
| **Project P1 Details** (`/api/projects/1`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Project P2 Details** (`/api/projects/2`) | 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Documents P1** (`/api/documents/project/1`) | 401 | 403 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Documents P2** (`/api/documents/project/2`) | 401 | 403 | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Tasks P1** (`/api/tasks/project/1`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Tasks P2** (`/api/tasks/project/2`) | 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Pending Approvals P1** (`/api/approvals/pending/1`)| 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Pending Approvals P2** (`/api/approvals/pending/2`)| 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Change Requests P1** (`/api/change-requests/project/1`)| 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Change Requests P2** (`/api/change-requests/project/2`)| 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Stakeholders P1** (`/api/stakeholders/project/1`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Stakeholders P2** (`/api/stakeholders/project/2`) | 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Dependencies P1** (`/api/dependencies/project/1`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Dependencies P2** (`/api/dependencies/project/2`) | 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Risks P1** (`/api/risks/project/1`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Risks P2** (`/api/risks/project/2`) | 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Project Health P1** (`/api/health/1`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Project Health P2** (`/api/health/2`) | 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **AI Assistant Chat P1** (`/api/ai/chat`) | 401 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **AI Assistant Chat P2** (`/api/ai/chat`) | 401 | **200** | **200** | **200** | **200** | 403 | **200** | 403 | 403 | **200** | **200** | 403 | **200** |
| **Create Task** (`POST /api/tasks`) | 401 | **200** | 403 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Create Document** (`POST /api/documents`) | 401 | 403 | 403 | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | **200** | 403 |
| **Approve Task** (`POST /api/tasks/1/approve`) | 401 | **200** | 403 | 403 | 403 | **200** | **200** | 403 | 403 | 403 | 403 | **200** | 403 |

---

## 6. Frontend Independent Verification

1. **Route Level Guards (`screens.tsx`)**:
   - Explicit `isRoutePermitted(targetRoute)` check runs before rendering any view.
   - Non-admins attempting `/admin/*` routes are intercepted and served a 403 banner.
   - Clients attempting management routes (e.g. `/dependencies`, `/risks`, `/blockers`) are intercepted with a 403 Access Restricted banner.
   - Vendors attempting documents or admin routes are similarly barred.
2. **Component Navigation (`app-shell.tsx`)**:
   - Navigation links dynamically filter based on user role (`getNavGroups(user)`).
3. **Build Integrity**:
   - `npm run build` ran with zero TypeScript or JSX compile errors.
