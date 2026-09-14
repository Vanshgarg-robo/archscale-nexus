from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from app.models import (
    Organization, Project, Stakeholder, ProjectStakeholder,
    Task, Dependency, Approval, Decision, ChangeRequest,
    Vendor, Risk, ActionItem, Meeting, Notification,
    AuditEvent, HealthSnapshot, Issue, Conversation,
    AdminAuditLog, AdminNotification,
)
from app.models.enums import (
    StakeholderRole, TaskStatus, TaskPriority, RelationshipType,
    ApprovalStatus, ChangeRequestStatus, RiskCategory, RiskSeverity,
    ProjectStatus, HealthStatus, NotificationType, IssueSeverity,
    IssueStatus, VendorStatus, UserRole,
)
from app.models.user import User
from app.services.auth_service import hash_password


async def is_seeded(db: AsyncSession) -> bool:
    result = await db.execute(select(Organization).limit(1))
    return result.scalar_one_or_none() is not None


async def seed_demo_data(db: AsyncSession) -> dict:
    if await is_seeded(db):
        return {"status": "already_seeded"}

    now = datetime.now(timezone.utc)

    # 1. Organization
    org = Organization(
        name="ArchScale Design Studio",
        domain="archscale.io",
        subscription_tier="enterprise",
        description="Premier architecture, interior design, and construction intelligence studio specializing in high-end luxury residential & commercial developments.",
    )
    db.add(org)
    await db.flush()

    # 2. Project
    project = Project(
        organization_id=org.id,
        name="The Lumina Pavilion & Penthouse Residence",
        description="Comprehensive architecture and interior redesign of a 5,500 sq ft luxury penthouse villa featuring open-concept kitchen, custom Italian Calacatta marble, Lutron smart automation, acoustic ceilings, and structural facade modifications.",
        status=ProjectStatus.IN_PROGRESS,
        health_score=62.0,
        health_status=HealthStatus.AT_RISK,
        start_date=now - timedelta(days=45),
        target_end_date=now + timedelta(days=120),
        location="Sector 42, Golf Course Road, Gurgaon, NCR",
        budget=12500000.00,
    )
    db.add(project)
    await db.flush()

    # 3. Stakeholders
    stakeholders_data = [
        ("Rajiv Mehra", "rajiv@client.com", "+91-98765-43210", StakeholderRole.CLIENT, "Property Owner / Principal Client", 85.0),
        ("Ananya Sharma", "ananya@archscale.io", "+91-98765-43211", StakeholderRole.ARCHITECT, "Lead Principal Architect", 94.0),
        ("Vikram Patel", "vikram@archscale.io", "+91-98765-43212", StakeholderRole.INTERIOR_DESIGNER, "Senior Interior Designer", 78.0),
        ("Suresh Kumar", "suresh@structeng.com", "+91-98765-43213", StakeholderRole.STRUCTURAL_ENGINEER, "Principal Structural Consultant", 68.0),
        ("Priya Nair", "priya@elecdesign.com", "+91-98765-43214", StakeholderRole.ELECTRICAL_ENGINEER, "Lead Electrical & MEP Engineer", 75.0),
        ("Deepak Singh", "deepak@buildpro.com", "+91-98765-43215", StakeholderRole.CONTRACTOR, "General Contractor — BuildPro Ltd", 88.0),
        ("Amit Gupta", "amit@furnishcraft.com", "+91-98765-43216", StakeholderRole.VENDOR, "Director — FurnishCraft Custom Millwork", 52.0),
        ("Sanjay Kapoor", "sanjay@marbletech.com", "+91-98765-43217", StakeholderRole.VENDOR, "Sales VP — MarbleTech Natural Stone", 48.0),
        ("Arjun Reddy", "arjun@archscale.io", "+91-98765-43218", StakeholderRole.PROJECT_MANAGER, "Senior Project Director", 96.0),
        ("Mohan Das", "mohan@buildpro.com", "+91-98765-43219", StakeholderRole.SITE_SUPERVISOR, "Senior Field Site Supervisor", 74.0),
        ("Rahul Verma", "rahul@smarthome.io", "+91-98765-43220", StakeholderRole.ELECTRICAL_ENGINEER, "Smart Home & Automation Specialist", 62.0),
        ("Neha Joshi", "neha@acousticdesign.com", "+91-98765-43221", StakeholderRole.INTERIOR_DESIGNER, "Acoustics & Lighting Consultant", 60.0),
    ]

    stakeholders = []
    for name, email, phone, role, title, influence in stakeholders_data:
        s = Stakeholder(
            organization_id=org.id, name=name, email=email, phone=phone,
            role=role, title=title, influence_score=influence,
        )
        db.add(s)
        stakeholders.append(s)
    await db.flush()

    # 4. Pre-seeded Users for all RBAC roles (Password: password123)
    users_data = [
        ("admin@archscale.io", "Alexander Wright", "admin", None, "+1 (555) 234-5678"),
        ("analyst@archscale.io", "Aria Chen", "analyst", None, "+1 (555) 345-6789"),
        ("operator@archscale.io", "Marcus Vance", "operator", None, "+1 (555) 456-7890"),
        ("viewer@archscale.io", "Elena Rostova", "viewer", None, "+1 (555) 567-8901"),
        ("arjun@archscale.io", "Arjun Reddy", "project_manager", stakeholders[8].id, "+91-98765-43218"),
        ("ananya@archscale.io", "Ananya Sharma", "architect", stakeholders[1].id, "+91-98765-43211"),
        ("priya@elecdesign.com", "Priya Nair", "engineer", stakeholders[4].id, "+91-98765-43214"),
        ("deepak@buildpro.com", "Deepak Singh", "contractor", stakeholders[5].id, "+91-98765-43215"),
        ("rajiv@client.com", "Rajiv Mehra", "client", stakeholders[0].id, "+91-98765-43210"),
        ("amit@furnishcraft.com", "Amit Gupta", "vendor", stakeholders[6].id, "+91-98765-43216"),
        ("mohan@buildpro.com", "Mohan Das", "site_supervisor", stakeholders[9].id, "+91-98765-43219"),
    ]

    common_hashed_pw = hash_password("password123")
    for email, full_name, role, stk_id, phone in users_data:
        uname = email.split("@")[0]
        user = User(
            organization_id=org.id,
            email=email,
            username=uname,
            mobile_no=phone,
            hashed_password=common_hashed_pw,
            full_name=full_name,
            role=role,
            stakeholder_id=stk_id,
            is_active=True,
            is_superadmin=(role == "admin"),
        )
        db.add(user)
    await db.flush()

    # 5. Project Stakeholder Assignments with Responsibilities & Authority
    resp_matrix = {
        0: ("Client sign-offs, budget amendments, luxury finish approvals", True),
        1: ("Master architectural plan, spatial geometry, municipal compliance, facade integration", True),
        2: ("Interior elevations, mood boards, bespoke FF&E, soft finishes, joinery details", False),
        3: ("Structural slab load calculations, shear wall integrity, core drilling clearances", True),
        4: ("Sub-station feeds, DB schedules, floor trench conduit routing, low-voltage circuits", False),
        5: ("Civil execution, dry construction, masonry, subcontractor management, timeline adherence", False),
        6: ("Custom cabinetry fabrication, carcass joinery, hardware delivery, on-site fit-out", False),
        7: ("Imported marble slab procurement, dry-lay inspection, resin polishing, transport", False),
        8: ("Cross-functional coordination, critical path monitoring, risk mitigation, executive reporting", True),
        9: ("Daily site logistics, trade coordination, quality inspection, safety protocols", False),
        10: ("Lutron lighting keypads, KNX bus topology, motorized shading, audio-video rack", False),
        11: ("Acoustic baffle placement, reverberation analysis, cove illumination levels", False),
    }

    for idx, s in enumerate(stakeholders):
        resp, auth = resp_matrix[idx]
        ps = ProjectStakeholder(
            project_id=project.id,
            stakeholder_id=s.id,
            responsibility_areas=resp,
            approval_authority=auth,
        )
        db.add(ps)
    await db.flush()

    # 6. Tasks (54 Realistic Construction & Architecture Tasks)
    # format: (title, assignee_idx, status, priority, progress, start_offset, end_offset, est_days)
    tasks_catalog = [
        # Phase 1: Planning & Pre-Construction
        ("Site Survey & As-Built 3D Laser Scan", 9, TaskStatus.COMPLETED, TaskPriority.HIGH, 100, -45, -40, 5),
        ("Architectural Master Plan & Spatial Schematics", 1, TaskStatus.COMPLETED, TaskPriority.CRITICAL, 100, -42, -32, 10),
        ("Structural Load & Shear Wall Engineering Report", 3, TaskStatus.COMPLETED, TaskPriority.CRITICAL, 100, -38, -28, 10),
        ("Interior Design Concept & Material Palette", 2, TaskStatus.COMPLETED, TaskPriority.HIGH, 100, -35, -22, 13),
        ("Demolition of Non-Load Bearing Partitions", 5, TaskStatus.COMPLETED, TaskPriority.HIGH, 100, -40, -33, 7),
        ("Debris Disposal & Site Environmental Clearance", 9, TaskStatus.COMPLETED, TaskPriority.MEDIUM, 100, -33, -30, 3),

        # Phase 2: Structural & Core MEP
        ("Balcony Slab Structural Carbon Fiber Reinforcement", 3, TaskStatus.COMPLETED, TaskPriority.CRITICAL, 100, -30, -18, 12),
        ("HVAC Chilled Water Piping & VRF Duct Rough-in", 4, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, 75, -20, None, 14),
        ("Sanitary Plumbing Core Channels & Waste Stacks", 5, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, 80, -22, None, 12),
        ("Main Electrical Distribution Board (DB) Installation", 4, TaskStatus.COMPLETED, TaskPriority.HIGH, 100, -25, -12, 13),
        ("Floor Trench Conduit Routing for Central Kitchen", 4, TaskStatus.BLOCKED, TaskPriority.CRITICAL, 35, -10, None, 8),
        ("Living Room Floor Conduit Channeling", 4, TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, 60, -12, None, 6),
        ("Smart Home KNX Low-Voltage Backbone Cabling", 10, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, 50, -15, None, 10),

        # Phase 3: Kitchen & Wet Areas (Crucial coordination zone)
        ("Kitchen Architectural Layout Revision Rev-C2", 1, TaskStatus.IN_PROGRESS, TaskPriority.CRITICAL, 70, -8, None, 6),
        ("Kitchen Island Plumbing & Water Purifier Inlets", 5, TaskStatus.BLOCKED, TaskPriority.HIGH, 20, -5, None, 5),
        ("Kitchen Central Island Electrical Trenching", 4, TaskStatus.BLOCKED, TaskPriority.CRITICAL, 15, -4, None, 7),
        ("Kitchen Sub-Floor Screed & Waterproofing Membrane", 5, TaskStatus.BLOCKED, TaskPriority.HIGH, 0, None, None, 6),
        ("Kitchen Quartz Waterfall Countertop Fabrication", 6, TaskStatus.ON_HOLD, TaskPriority.HIGH, 10, -3, None, 14),
        ("Custom Kitchen Cabinetry Carcass Millwork", 6, TaskStatus.ON_HOLD, TaskPriority.HIGH, 25, -6, None, 20),
        ("Kitchen Exhaust Chimney Hood Ductwork", 5, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 4),

        # Phase 4: Flooring, Partitions & Ceilings
        ("Living & Dining Room Floor Leveling Screed", 5, TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, 85, -14, None, 6),
        ("Calacatta Gold Marble Slab Sourcing & Port Clearance", 7, TaskStatus.ON_HOLD, TaskPriority.CRITICAL, 30, -12, None, 18),
        ("Dry-Lay Inspection of Marble Slabs at Warehouse", 2, TaskStatus.NOT_STARTED, TaskPriority.HIGH, 0, None, None, 3),
        ("Living Room Marble Flooring Installation", 5, TaskStatus.NOT_STARTED, TaskPriority.HIGH, 0, None, None, 15),
        ("Bedrooms Engineered Oak Wood Flooring", 5, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 10),
        ("Moisture Barrier Underlayment for Master Bedroom", 5, TaskStatus.NOT_STARTED, TaskPriority.LOW, 0, None, None, 3),
        ("Gypsum Ceiling Framing & Drop Down Levels", 5, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, 40, -10, None, 12),
        ("Acoustic Baffle Installation in Home Theater", 11, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 8),
        ("Linear Diffuser Slots & AC Return Air Cutouts", 4, TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, 45, -7, None, 5),
        ("False Ceiling Drywall Boarding & Plaster Finish", 5, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 9),

        # Phase 5: Lighting, Automation & Finishes
        ("Recessed Architectural Downlight Housing Fixation", 4, TaskStatus.NOT_STARTED, TaskPriority.HIGH, 0, None, None, 6),
        ("Indirect Cove LED Strip Light Installation", 10, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 5),
        ("Lutron Palladiom Keypad Faceplate Termination", 10, TaskStatus.NOT_STARTED, TaskPriority.HIGH, 0, None, None, 4),
        ("Wall Primer & Anti-Crack Skim Coating", 5, TaskStatus.NOT_STARTED, TaskPriority.LOW, 0, None, None, 7),
        ("Bespoke Textured Wall Finish — Italian Stucco", 2, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 8),
        ("Master Bedroom Fluted Wall Paneling Fabrication", 6, TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, 35, -8, None, 12),

        # Phase 6: Glazing, Doors & Windows
        ("Acoustic Double-Glazed Sliding Window Replacement", 5, TaskStatus.COMPLETED, TaskPriority.HIGH, 100, -28, -16, 12),
        ("Frameless Glass Railing for Panoramic Terrace", 5, TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, 50, -10, None, 8),
        ("Concealed Pivot Entry Door Engineering & Core", 6, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, 65, -12, None, 14),
        ("Flush Interior Doors & Magnetic Locks Installation", 6, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 7),

        # Phase 7: Bathrooms & Wet Zones
        ("Master Bathroom Plumbing Diverter Rough-in", 4, TaskStatus.COMPLETED, TaskPriority.HIGH, 100, -24, -14, 10),
        ("Bathroom Shower Floor Sloping & 3-Coat Waterproofing", 5, TaskStatus.COMPLETED, TaskPriority.CRITICAL, 100, -18, -10, 8),
        ("Master Bath Bookmatched Onyx Slab Cladding", 7, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, 40, -6, None, 10),
        ("Sanitary Ware & Dornbracht Fitting Installation", 5, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 5),
        ("Custom Glass Shower Cubicle Enclosure", 6, TaskStatus.NOT_STARTED, TaskPriority.LOW, 0, None, None, 4),

        # Phase 8: Furniture, Landscaping & Handover
        ("Master Walk-in Wardrobe System Fabrication", 6, TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, 40, -14, None, 22),
        ("Dining Table & Custom Credenza Delivery", 6, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 15),
        ("Terrace Decking & Vertical Garden Irrigation", 9, TaskStatus.IN_PROGRESS, TaskPriority.LOW, 30, -8, None, 12),
        ("Smart Home Commissioning & iPad Automation Scenes", 10, TaskStatus.NOT_STARTED, TaskPriority.HIGH, 0, None, None, 6),
        ("Deep Chemical Cleaning & Marble Crystallization", 9, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 4),
        ("Comprehensive Pre-Handover Snagging Audit", 8, TaskStatus.NOT_STARTED, TaskPriority.CRITICAL, 0, None, None, 5),
        ("Client Final Walkthrough & Handover Sign-off", 8, TaskStatus.NOT_STARTED, TaskPriority.CRITICAL, 0, None, None, 2),
        ("As-Built Drawings & Operations Manual Dispatch", 1, TaskStatus.NOT_STARTED, TaskPriority.MEDIUM, 0, None, None, 5),
        ("Post-Handover 30-Day Defect Liability Monitoring", 8, TaskStatus.NOT_STARTED, TaskPriority.LOW, 0, None, None, 30),
    ]

    tasks = []
    for title, stk_idx, status, priority, progress, start_offset, end_offset, est_days in tasks_catalog:
        t = Task(
            project_id=project.id,
            assignee_id=stakeholders[stk_idx].id,
            title=title,
            status=status,
            priority=priority,
            progress=progress,
            due_date=now + timedelta(days=est_days + (start_offset or 0) + 20),
            started_at=(now + timedelta(days=start_offset)) if start_offset else None,
            completed_at=(now + timedelta(days=end_offset)) if end_offset else None,
            estimated_days=est_days,
        )
        db.add(t)
        tasks.append(t)
    await db.flush()

    # 7. Dependencies (26 Links Modeling Real Downstream Cascades)
    # (src, tgt, type) -> src depends on tgt
    deps_catalog = [
        (1, 0, RelationshipType.DEPENDS_ON),     # Master Plan depends on Site Survey
        (2, 0, RelationshipType.DEPENDS_ON),     # Structural Report depends on Site Survey
        (3, 1, RelationshipType.DEPENDS_ON),     # Interior Concept depends on Master Plan
        (4, 1, RelationshipType.DEPENDS_ON),     # Demolition depends on Master Plan
        (6, 2, RelationshipType.DEPENDS_ON),     # Balcony Reinforcement depends on Structural Report
        (7, 4, RelationshipType.DEPENDS_ON),     # HVAC Ducting depends on Demolition
        (8, 4, RelationshipType.DEPENDS_ON),     # Sanitary Plumbing depends on Demolition
        (9, 7, RelationshipType.DEPENDS_ON),     # Main DB depends on HVAC Piping
        (10, 13, RelationshipType.DEPENDS_ON),   # Floor Trench Kitchen depends on Kitchen Layout Rev-C2
        (11, 10, RelationshipType.DEPENDS_ON),   # Living room conduit depends on Floor Trench Kitchen
        (12, 9, RelationshipType.DEPENDS_ON),    # KNX Cabling depends on Main DB
        (13, 1, RelationshipType.DEPENDS_ON),    # Kitchen Layout Rev-C2 depends on Master Plan
        (14, 13, RelationshipType.DEPENDS_ON),   # Kitchen Plumbing depends on Kitchen Layout Rev-C2
        (15, 10, RelationshipType.DEPENDS_ON),   # Kitchen Island Electrical depends on Floor Trench Kitchen
        (16, 15, RelationshipType.DEPENDS_ON),   # Kitchen Sub-floor screed depends on Kitchen Island Electrical
        (17, 13, RelationshipType.DEPENDS_ON),   # Waterfall Countertop depends on Kitchen Layout Rev-C2
        (18, 16, RelationshipType.DEPENDS_ON),   # Kitchen Cabinetry depends on Kitchen Sub-floor screed
        (20, 11, RelationshipType.DEPENDS_ON),   # Living room screed depends on Floor conduit
        (22, 21, RelationshipType.DEPENDS_ON),   # Dry-lay inspection depends on Marble port clearance
        (23, 22, RelationshipType.DEPENDS_ON),   # Marble floor install depends on Dry-lay inspection
        (26, 7, RelationshipType.DEPENDS_ON),    # Gypsum ceiling framing depends on HVAC duct rough-in
        (29, 26, RelationshipType.DEPENDS_ON),   # False ceiling boarding depends on Gypsum ceiling framing
        (30, 29, RelationshipType.DEPENDS_ON),   # Recessed downlights depend on False ceiling boarding
        (32, 12, RelationshipType.DEPENDS_ON),   # Lutron keypads depend on KNX cabling
        (42, 41, RelationshipType.DEPENDS_ON),   # Onyx slab cladding depends on Shower waterproofing
        (48, 32, RelationshipType.DEPENDS_ON),   # Smart home commissioning depends on Lutron keypads
    ]

    for src_idx, tgt_idx, rel_type in deps_catalog:
        d = Dependency(
            source_id=tasks[src_idx].id,
            target_id=tasks[tgt_idx].id,
            relationship_type=rel_type,
        )
        db.add(d)
    await db.flush()

    # 8. Approvals (18 Governance Sign-Offs across Client, Architect, PM, Vendor)
    # (title, task_idx, req_stk_idx, appr_stk_idx, status, type, due_offset)
    approvals_catalog = [
        ("Kitchen Island Relocation Drawing Rev-C2", 13, 1, 0, ApprovalStatus.PENDING, "client_signoff", 2),
        ("Floor Trench Core Drilling Structural Clearance", 10, 4, 3, ApprovalStatus.PENDING, "structural_clearance", -2),
        ("Sub-Station Electrical Load & DB Sanction", 9, 4, 1, ApprovalStatus.APPROVED, "architect_clearance", -18),
        ("Calacatta Gold Marble Slab Dry-Lay Approval", 21, 7, 0, ApprovalStatus.PENDING, "client_finish_approval", 4),
        ("Living Room Acoustic Baffle Ceiling Detail", 27, 11, 1, ApprovalStatus.APPROVED, "architect_design_approval", -10),
        ("Lutron Palladiom Matte Black Keypad Selection", 32, 10, 0, ApprovalStatus.APPROVED, "client_signoff", -15),
        ("Italian Stucco Accent Wall Swatch Approval", 34, 2, 0, ApprovalStatus.PENDING, "client_finish_approval", 5),
        ("Concealed Pivot Entry Door Shop Drawing Sign-off", 38, 6, 1, ApprovalStatus.APPROVED, "architect_shop_drawing", -8),
        ("Master Bath Bookmatched Onyx Slab Layout", 42, 7, 1, ApprovalStatus.PENDING, "architect_design_approval", -1),
        ("Custom Kitchen Quartz Waterfall Detail Approval", 17, 6, 1, ApprovalStatus.PENDING, "architect_shop_drawing", 3),
        ("Balcony Slab Carbon Fiber Anchor Testing Report", 6, 5, 3, ApprovalStatus.APPROVED, "structural_clearance", -20),
        ("Air Conditioning VRF Duct Route Collision Review", 7, 4, 1, ApprovalStatus.APPROVED, "architect_clearance", -16),
        ("FurnishCraft Millwork Progress Payment Mile-2", 18, 6, 8, ApprovalStatus.PENDING, "pm_budget_approval", -3),
        ("Terrace Decking Composite Teak Wood Spec", 47, 9, 0, ApprovalStatus.PENDING, "client_finish_approval", 7),
        ("Overall Budget Contingency Drawdown #02", 13, 8, 0, ApprovalStatus.PENDING, "client_budget_amendment", -1),
        ("Site Health & Fire Life Safety Plan", 0, 9, 8, ApprovalStatus.APPROVED, "pm_governance", -42),
        ("Architectural Master Elevation Sign-off", 1, 1, 0, ApprovalStatus.APPROVED, "client_signoff", -34),
        ("Final Handover Acceptance Protocol Draft", 51, 8, 0, ApprovalStatus.PENDING, "client_signoff", 45),
    ]

    for title, task_idx, req_idx, appr_idx, status, atype, due_offset in approvals_catalog:
        a = Approval(
            project_id=project.id,
            related_task_id=tasks[task_idx].id if task_idx is not None else None,
            requester_id=stakeholders[req_idx].id,
            approver_id=stakeholders[appr_idx].id,
            title=title,
            status=status,
            approval_type=atype,
            due_date=now + timedelta(days=due_offset),
            decided_at=(now + timedelta(days=due_offset - 2)) if status == ApprovalStatus.APPROVED else None,
            notes=f"Governance item registered under protocol {atype}. Requires signature before dependent downstream triggers."
        )
        db.add(a)
    await db.flush()

    # 9. Decisions (12 Documented Architectural & Engineering Decisions)
    decisions_catalog = [
        ("Kitchen Island Central Axis Shifted by 1.2m", "Client requested unobstructed view towards panoramic terrace and 8-seat breakfast bar capacity.", 0, -26),
        ("Italian Calacatta Gold Selected Over Botticino", "Higher luminance reflection and superior veining alignment in grand living salon.", 0, -22),
        ("Carbon Fiber Laminate Reinforcement for Balcony Cantilever", "Avoids heavy steel beam supports below, preserving ground terrace headroom.", 3, -28),
        ("KNX Standard Adopted for Core Lighting & Climate Automation", "Vendor-agnostic protocol ensures 15-year backward compatibility and local relay execution.", 4, -18),
        ("Concealed VRF AC Units Retained Within Drop Bulkheads", "Maintains 11.5 ft clear ceiling height in main lounge without central drop ceiling.", 1, -30),
        ("Floor Conduit Trenching Preferred Over Core-Drilling Slab Sub-Face", "Avoids post-tension cable damage in floor slab as identified by GPR radar scan.", 3, -14),
        ("Acoustic Micro-Perforated Timber Baffles for Media Room", "Targets NRC 0.85 rating for 7.2.4 Dolby Atmos theater calibration.", 11, -12),
        ("Bookmatched Onyx Feature Wall in Master Bathroom", "Selected slab pair #ONX-4812 with integrated LED diffusion back-panel.", 2, -10),
        ("Retain BuildPro Construction as Sole Turnkey General Contractor", "Proven track record in luxury finishes and safety compliance.", 8, -35),
        ("Double Glazed Low-E Acoustic Windows Specified", "Reduces Golf Course Road exterior ambient sound by 38dB.", 1, -25),
        ("Magnetic Architectural Locksets for All Flush Doors", "Zero visible strike plates and silent latching mechanism.", 2, -15),
        ("Zero-VOC Mineral Silicate Paint for Indoor Environmental Quality", "Eliminates paint off-gassing ahead of client moving-in date.", 0, -8),
    ]

    for title, rationale, stk_idx, offset in decisions_catalog:
        d = Decision(
            project_id=project.id,
            decided_by_id=stakeholders[stk_idx].id,
            title=title,
            rationale=rationale,
            decided_at=now + timedelta(days=offset),
        )
        db.add(d)
    await db.flush()

    # 10. Risks (12 Tracked Risks Across Categories)
    risks_catalog = [
        ("Kitchen Redesign Ripple Delay", "Client island shift cascades through conduit rough-in, sub-floor screed, and millwork installation.", RiskCategory.SCHEDULE, RiskSeverity.CRITICAL, 0.85, 9.2, 8),
        ("Calacatta Marble Customs Quarantine Hold", "Container #GS-884 quarantined at Nhava Sheva port awaiting chemical radiation clearance certificates.", RiskCategory.VENDOR, RiskSeverity.HIGH, 0.75, 8.5, 7),
        ("Floor Trench Core Proximity to Post-Tension Tendons", "High-frequency structural risk if diamond core drill penetrates tendon sheath.", RiskCategory.DEPENDENCY, RiskSeverity.CRITICAL, 0.90, 9.5, 3),
        ("Electrical Layout Lead Architect Approval Bottleneck", "Architectural CAD revision Rev-C2 pending sign-off, blocking 3 trades on site.", RiskCategory.APPROVAL, RiskSeverity.HIGH, 0.80, 8.0, 1),
        ("Budget Creep from Luxury Finishes Amendments", "Cumulative cost delta of +11.8% over initial baseline budget due to imported stone & millwork upgrades.", RiskCategory.COORDINATION, RiskSeverity.MEDIUM, 0.60, 6.5, 8),
        ("Labor Scarcity During Festive Season", "General contractor workforce may diminish by 30% during upcoming regional Diwali festival.", RiskCategory.SCHEDULE, RiskSeverity.MEDIUM, 0.55, 5.8, 5),
        ("Smart Automation Bus Interference with High-Voltage Trays", "Low-voltage KNX cable runs must maintain 300mm separation to prevent signal clipping.", RiskCategory.DEPENDENCY, RiskSeverity.MEDIUM, 0.50, 6.0, 4),
        ("Millwork Carcass Moisture Absorption Risk", "High ambient humidity during late monsoon could warp MDF substrates if not AC-conditioned.", RiskCategory.VENDOR, RiskSeverity.MEDIUM, 0.45, 5.5, 6),
        ("HVAC Chilled Water Pipe Hydrostatic Pressure Drop", "Pressure testing revealed minor valve fitting weep on 4th floor manifold.", RiskCategory.COORDINATION, RiskSeverity.LOW, 0.30, 4.0, 4),
        ("Terrace Balcony Glass Railing Wind Load Deflection", "Structural consultant requires 15mm toughened laminated glass with embedded base shoe.", RiskCategory.DEPENDENCY, RiskSeverity.LOW, 0.25, 4.5, 3),
        ("Dornbracht Sanitary Brassware Lead Time", "Plumbing fixtures shipped from Germany have a 6-week factory backlog.", RiskCategory.VENDOR, RiskSeverity.MEDIUM, 0.50, 6.2, 8),
        ("Client Decision Latency on Living Room Stucco Swatches", "Delay in swatch selection may compress the final finish schedule by 8 business days.", RiskCategory.APPROVAL, RiskSeverity.MEDIUM, 0.65, 5.0, 2),
    ]

    for title, desc, cat, sev, prob, impact_score, stk_idx in risks_catalog:
        r = Risk(
            project_id=project.id,
            owner_id=stakeholders[stk_idx].id,
            title=title,
            description=desc,
            category=cat,
            severity=sev,
            probability=prob,
            impact_score=impact_score,
            risk_score=round(prob * impact_score, 1),
        )
        db.add(r)
    await db.flush()

    # 11. Change Requests (4 Major Change Scenarios)
    cr1 = ChangeRequest(
        project_id=project.id,
        owner_id=stakeholders[0].id,
        title="Move Kitchen Island 1.2m Towards Terrace Window",
        description="Shift the central kitchen island 1.2 meters towards the panoramic window to accommodate an 8-seater breakfast bar and integrate waterfall quartz counter edges.",
        reason="Client lifestyle upgrade following 3D VR walkthrough with interior designer.",
        affected_areas={"zones": ["Kitchen", "Dining Salon"], "task_ids": [tasks[10].id, tasks[13].id, tasks[14].id, tasks[15].id, tasks[17].id, tasks[18].id]},
        status=ChangeRequestStatus.UNDER_REVIEW,
        impact_summary="Affects 6 downstream tasks, 4 stakeholders. Requires structural slab scanning, conduit floor channel re-routing, and cabinetry redraw.",
        estimated_delay_days=4,
        risk_level="high",
    )
    db.add(cr1)

    cr2 = ChangeRequest(
        project_id=project.id,
        owner_id=stakeholders[2].id,
        title="Upgrade Living Room Flooring to Heated Calacatta Gold Marble",
        description="Install Schluter-DITRA electric radiant heating mat under imported Calacatta Gold marble flooring slabs in the main reception lounge.",
        reason="Thermal comfort enhancement for winter months requested by homeowner.",
        affected_areas={"zones": ["Living Salon", "Sub-floor"], "task_ids": [tasks[11].id, tasks[20].id, tasks[23].id]},
        status=ChangeRequestStatus.PROPOSED,
        impact_summary="Requires 2.4kW dedicated circuit from main DB and 4-day delay to allow leveling screed curing.",
        estimated_delay_days=5,
        risk_level="medium",
    )
    db.add(cr2)

    cr3 = ChangeRequest(
        project_id=project.id,
        owner_id=stakeholders[1].id,
        title="Acoustic Ceiling Baffle Redesign for Home Cinema",
        description="Incorporate curved felt baffles with hidden perimeter RGBW warm-white lighting cove.",
        reason="Acoustic simulation showed flutter echo near rear projector alcove.",
        affected_areas={"zones": ["Home Theater"], "task_ids": [tasks[27].id, tasks[31].id]},
        status=ChangeRequestStatus.APPROVED,
        impact_summary="Approved with zero budget delta; minor re-sequencing of framing trade.",
        estimated_delay_days=1,
        risk_level="low",
    )
    db.add(cr3)

    cr4 = ChangeRequest(
        project_id=project.id,
        owner_id=stakeholders[10].id,
        title="Lutron Palladiom Matte Black Keypads Integration",
        description="Replace standard modular rocker switches with motorized architectural keypads linked to KNX lighting scenes.",
        reason="Standardization across penthouse master suite and entertainment pavilion.",
        affected_areas={"zones": ["Entire Penthouse"], "task_ids": [tasks[32].id, tasks[48].id]},
        status=ChangeRequestStatus.IMPLEMENTED,
        impact_summary="Fully installed and rough-in verified. Hardware supplied by SmartAutomation Pro.",
        estimated_delay_days=0,
        risk_level="low",
    )
    db.add(cr4)
    await db.flush()

    # 12. Vendors
    v1 = Vendor(
        project_id=project.id, stakeholder_id=stakeholders[6].id,
        name="FurnishCraft Ltd", specialty="Custom luxury architectural millwork & joinery",
        contact_email="orders@furnishcraft.com", contract_status=VendorStatus.ACTIVE,
        contract_value=2400000.00, delivery_deadline=now + timedelta(days=45),
    )
    v2 = Vendor(
        project_id=project.id, stakeholder_id=stakeholders[7].id,
        name="MarbleTech Industries", specialty="Direct import Italian natural marble & quartzite",
        contact_email="sales@marbletech.com", contract_status=VendorStatus.ACTIVE,
        contract_value=1850000.00, delivery_deadline=now + timedelta(days=20),
    )
    v3 = Vendor(
        project_id=project.id, stakeholder_id=stakeholders[10].id,
        name="SmartAutomation Pro", specialty="Lutron & KNX certified home automation integrators",
        contact_email="projects@smartautomation.io", contract_status=VendorStatus.ACTIVE,
        contract_value=950000.00, delivery_deadline=now + timedelta(days=60),
    )
    v4 = Vendor(
        project_id=project.id, stakeholder_id=stakeholders[5].id,
        name="GlassTech Architectural Facades", specialty="Acoustic double glazing & structural glass railings",
        contact_email="info@glasstech.com", contract_status=VendorStatus.ACTIVE,
        contract_value=1100000.00, delivery_deadline=now + timedelta(days=35),
    )
    db.add_all([v1, v2, v3, v4])
    await db.flush()

    # 13. Conversations (Ingested Communications with AI Extraction Data)
    conv1 = Conversation(
        project_id=project.id,
        source_type="whatsapp",
        title="WhatsApp: Kitchen MEP Coordination & Island Relocation",
        raw_content="""[09:15] Rajiv Mehra (Client): Hi team, after reviewing the 3D render with Neha, we've decided: move the kitchen island 1.2 meters towards the terrace window.
[09:18] Ananya Sharma (Architect): Understood Rajiv. Confirmed: We will redraw architectural sheet Rev-C2 by Friday.
[09:22] Priya Nair (Electrical Engineer): Warning: Moving the island impacts floor conduit routing. Risk: Coring concrete slab near beam line could compromise structural tension cables if not scanned first.
[09:25] Deepak Singh (Contractor): Agreed: Pausing kitchen sub-floor screed until scanning is completed. Action item: Schedule GPR concrete scan by Monday.
[09:29] Sanjay Kapoor (Furniture Vendor): Will complete cabinetry carcass fabrication once revised CAD arrives. Deadline: Need CAD by 15th October to avoid millwork delays.""",
        extracted_tasks=[
            {"title": "Redraw architectural sheet Rev-C2", "assignee_hint": "Ananya Sharma", "priority": "critical"},
            {"title": "Schedule GPR concrete slab scan", "assignee_hint": "Deepak Singh", "priority": "high"},
            {"title": "Update floor conduit routing", "assignee_hint": "Priya Nair", "priority": "high"},
        ],
        extracted_decisions=[
            {"title": "Kitchen Island shifted 1.2m towards terrace window", "rationale": "Client aesthetic preference for view and 8-seat breakfast bar", "decided_by_hint": "Rajiv Mehra"}
        ],
        extracted_risks=[
            {"title": "Concrete slab core drilling near post-tension cables", "description": "Potential structural integrity risk if slab is penetrated without radar scan", "severity": "critical"}
        ],
        extracted_action_items=[
            {"title": "Hold kitchen sub-floor screed work", "owner_hint": "Deepak Singh", "deadline_hint": "Immediate"},
            {"title": "Dispatch revised CAD Rev-C2 to FurnishCraft", "owner_hint": "Ananya Sharma", "deadline_hint": "Friday 17:00"}
        ],
        extracted_stakeholders=[
            {"name": "Rajiv Mehra", "role_hint": "Client"},
            {"name": "Ananya Sharma", "role_hint": "Lead Architect"},
            {"name": "Priya Nair", "role_hint": "Electrical Engineer"},
            {"name": "Deepak Singh", "role_hint": "Contractor"},
            {"name": "Sanjay Kapoor", "role_hint": "Vendor"}
        ],
        extracted_deadlines=[
            {"description": "CAD Rev-C2 submission", "date_hint": "Friday 17:00"},
            {"description": "GPR scanning completion", "date_hint": "Monday 11:00"}
        ],
        summary="Client approved shifting kitchen island 1.2m towards window. Electrical engineer warned of post-tension floor tendon conflict. Contractor paused screed until GPR scan completes. Architect drafting Rev-C2.",
    )

    conv2 = Conversation(
        project_id=project.id,
        source_type="meeting_notes",
        title="Weekly Site Coordination Meeting #06",
        raw_content="""Date: 2026-09-08
Attendees: Arjun Reddy (PM), Ananya Sharma (Architect), Priya Nair (MEP), Deepak Singh (Contractor), Suresh Kumar (Structural)

1. Review of Kitchen Island Redesign:
   - Suresh Kumar reviewed GPR radar survey data; cleared a 300mm wide floor channel zone without hitting post-tension cables.
   - Decision: Approved shallow floor trenching methodology.
2. Port Clearance of Marble:
   - Sanjay Kapoor confirmed Calacatta Gold slabs are cleared through customs inspection; warehouse arrival scheduled in 48 hours.
3. Electrical DB Sanction:
   - Priya Nair reported that the 63A 3-phase connection load calculation passed municipal review.
4. Action Items:
   - Deepak to resume kitchen floor screed on Thursday morning.
   - Ananya to inspect marble dry-lay at warehouse on Friday.""",
        extracted_tasks=[
            {"title": "Resume kitchen floor screed", "assignee_hint": "Deepak Singh", "priority": "high"},
            {"title": "Inspect marble dry-lay at warehouse", "assignee_hint": "Ananya Sharma", "priority": "high"},
        ],
        extracted_decisions=[
            {"title": "Approved shallow floor trenching method", "rationale": "GPR radar confirmed safe zone away from tendons", "decided_by_hint": "Suresh Kumar"}
        ],
        extracted_risks=[
            {"title": "Screed curing window tight ahead of cabinet fit-out", "description": "Need 72h cure time before heavy carcass placement", "severity": "medium"}
        ],
        extracted_action_items=[
            {"title": "Prepare dry-lay grid for client inspection", "owner_hint": "Sanjay Kapoor", "deadline_hint": "Thursday evening"}
        ],
        extracted_stakeholders=[
            {"name": "Arjun Reddy", "role_hint": "Project Manager"},
            {"name": "Suresh Kumar", "role_hint": "Structural Engineer"}
        ],
        extracted_deadlines=[
            {"description": "Marble warehouse dry-lay inspection", "date_hint": "Friday 14:00"}
        ],
        summary="Weekly coordination confirmed safe floor trenching path after GPR scan. Marble customs cleared. Kitchen screed scheduled to resume Thursday.",
    )

    conv3 = Conversation(
        project_id=project.id,
        source_type="email",
        title="Email: Calacatta Gold Customs Delay & Mitigation Plan",
        raw_content="""From: Sanjay Kapoor (sales@marbletech.com)
To: Arjun Reddy, Ananya Sharma, Rajiv Mehra
Subject: Update: Nhava Sheva Customs Clearance Status — Consignment #GS-884

Dear Arjun & Team,
Following our phone conversation this morning, customs authorities have released 420 sq meters of Calacatta Gold slabs after satisfactory lab assay.
However, transport via sealed container truck will take 3 business days to reach Gurgaon warehouse.
Mitigation Proposal:
We propose prioritizing the entrance foyer and guest powder room dry-lay first so Contractor Deepak Singh can proceed with foyer screeding without losing labor days.
Please confirm acceptance so warehouse crew can stage slabs in installation order.
Best regards,
Sanjay Kapoor, MarbleTech""",
        extracted_tasks=[
            {"title": "Stage foyer marble slabs at warehouse", "assignee_hint": "Sanjay Kapoor", "priority": "medium"},
            {"title": "Prepare foyer screeding layout", "assignee_hint": "Deepak Singh", "priority": "medium"}
        ],
        extracted_decisions=[
            {"title": "Prioritize foyer dry-lay ahead of grand salon", "rationale": "Prevents tiling crew downtime while main slabs are in transit", "decided_by_hint": "Arjun Reddy"}
        ],
        extracted_risks=[
            {"title": "In-transit trucking delay due to interstate border check", "description": "Potential 24h delay in transit", "severity": "low"}
        ],
        extracted_action_items=[
            {"title": "Confirm staging sequence with installer", "owner_hint": "Deepak Singh", "deadline_hint": "Tomorrow morning"}
        ],
        extracted_stakeholders=[
            {"name": "Sanjay Kapoor", "role_hint": "Vendor"},
            {"name": "Rajiv Mehra", "role_hint": "Client"}
        ],
        extracted_deadlines=[
            {"description": "Warehouse truck arrival", "date_hint": "Wednesday 18:00"}
        ],
        summary="Consignment released from port. Truck transit in progress. Agreed to stage and dry-lay foyer slabs first to keep site trades moving.",
    )

    conv4 = Conversation(
        project_id=project.id,
        source_type="transcript",
        title="Client Call Transcript: Smart Lighting & Keypad Sign-Off",
        raw_content="""Rajiv Mehra: Hello Ananya, Arjun. I reviewed the smart lighting samples Vikram brought over yesterday.
Ananya Sharma: Good afternoon Rajiv. How did you feel about the Lutron Palladiom matte black finish versus the brushed brass?
Rajiv Mehra: The matte black is magnificent with the dark fluted oak panelling. We definitely approve the matte black Lutron Palladiom keypads throughout.
Arjun Reddy: Excellent Rajiv. We have recorded that formal approval. Priya, will that alter any of your low-voltage conduit drops?
Priya Nair: No, the Lutron Palladiom keypads utilize the standard 1-gang UK backbox with the 4-core bus cable we've already roughed in. We are 100% good to proceed.
Rajiv Mehra: Perfect. What is our next critical milestone that requires my input?
Arjun Reddy: The revised kitchen island drawing Rev-C2 and the final sign-off on the terrace decking teak stain.
Rajiv Mehra: Send them over by Thursday and I will sign off before the weekend.""",
        extracted_tasks=[
            {"title": "Procure Lutron Palladiom matte black keypads", "assignee_hint": "Rahul Verma", "priority": "medium"},
            {"title": "Send terrace teak stain swatches to Rajiv", "assignee_hint": "Vikram Patel", "priority": "low"}
        ],
        extracted_decisions=[
            {"title": "Lutron Palladiom Matte Black Keypads Approved", "rationale": "Flawless aesthetic pairing with dark fluted wall paneling", "decided_by_hint": "Rajiv Mehra"}
        ],
        extracted_risks=[],
        extracted_action_items=[
            {"title": "Submit Rev-C2 and decking samples to client", "owner_hint": "Arjun Reddy", "deadline_hint": "Thursday"}
        ],
        extracted_stakeholders=[
            {"name": "Rajiv Mehra", "role_hint": "Client"},
            {"name": "Ananya Sharma", "role_hint": "Architect"},
            {"name": "Priya Nair", "role_hint": "Electrical Engineer"}
        ],
        extracted_deadlines=[
            {"description": "Client sign-off on Rev-C2", "date_hint": "Friday end of day"}
        ],
        summary="Client officially signed off on Lutron Palladiom matte black keypads. No wiring adjustments required. Next client action is signing off Rev-C2 kitchen island drawing.",
    )

    db.add_all([conv1, conv2, conv3, conv4])
    await db.flush()

    # 14. Issues
    issue1 = Issue(
        project_id=project.id,
        related_task_id=tasks[10].id,
        reporter_id=stakeholders[4].id,
        assignee_id=stakeholders[1].id,
        title="Kitchen Island floor conduit route overlaps with high-tension floor beam",
        description="Laser scan indicates that direct floor coring would pass within 40mm of structural post-tension strand. Requires revised CAD sheet Rev-C2 with 150mm offset.",
        severity=IssueSeverity.CRITICAL,
        status=IssueStatus.OPEN,
    )
    issue2 = Issue(
        project_id=project.id,
        related_task_id=tasks[7].id,
        reporter_id=stakeholders[9].id,
        assignee_id=stakeholders[4].id,
        title="HVAC ceiling cassette clearance clash with linear LED cove in Salon",
        description="HVAC duct drops 250mm below concrete slab, obstructing recessed linear luminaire slot detail. Requires re-routing through adjacent corridor bulkhead.",
        severity=IssueSeverity.HIGH,
        status=IssueStatus.IN_PROGRESS,
    )
    issue3 = Issue(
        project_id=project.id,
        related_task_id=tasks[21].id,
        reporter_id=stakeholders[7].id,
        assignee_id=stakeholders[8].id,
        title="Customs port quarantine demurrage surcharge notice",
        description="Port terminal issued secondary inspection delay notice; resolved via emergency customs broker expedite.",
        severity=IssueSeverity.MEDIUM,
        status=IssueStatus.RESOLVED,
    )
    db.add_all([issue1, issue2, issue3])
    await db.flush()

    # 15. Meetings & Action Items
    m1 = Meeting(
        project_id=project.id,
        title="Weekly Multi-Disciplinary Coordination Meeting #06",
        date=now - timedelta(days=3),
        summary="In-depth review of the Kitchen Island relocation impact cascade, marble delivery staging, and structural floor scanning clearance. Lead Architect tasked with finalizing Rev-C2 by Friday.",
        attendee_ids={"ids": [s.id for s in stakeholders[:8]]},
    )
    db.add(m1)
    await db.flush()

    act1 = ActionItem(
        project_id=project.id,
        owner_id=stakeholders[1].id,
        meeting_id=m1.id,
        title="Finalize and release architectural drawing sheet Rev-C2 for client sign-off",
        due_date=now + timedelta(days=2),
    )
    act2 = ActionItem(
        project_id=project.id,
        owner_id=stakeholders[5].id,
        meeting_id=m1.id,
        title="Stage floor screeding crew and materials for immediate deployment post-inspection",
        due_date=now + timedelta(days=3),
    )
    act3 = ActionItem(
        project_id=project.id,
        owner_id=stakeholders[7].id,
        meeting_id=m1.id,
        title="Setup dry-lay lighting rig in warehouse for client Calacatta Gold inspection",
        due_date=now + timedelta(days=4),
    )
    db.add_all([act1, act2, act3])
    await db.flush()

    # 16. Notifications (8 Realistic Coordination Alerts)
    notifs_catalog = [
        (stakeholders[1].id, NotificationType.APPROVAL_REQUIRED, "Approval Required: Kitchen Layout Rev-C2", "Client Rajiv Mehra requested sign-off on revised drawing Rev-C2 to unblock electrical trenching."),
        (stakeholders[4].id, NotificationType.BLOCKER_DETECTED, "Blocker: Floor Conduit Rough-in Paused", "Kitchen electrical trenching blocked pending structural scan clearance and Rev-C2 sign-off."),
        (stakeholders[0].id, NotificationType.CHANGE_IMPACT, "Change Impact Notice: Kitchen Island Shift", "Your requested 1.2m island relocation triggered a +4 day critical path schedule delta across 6 tasks."),
        (stakeholders[8].id, NotificationType.RISK_ESCALATION, "Critical Risk Alert: Floor Trench Tension Tendons", "Structural risk escalated to Critical severity. GPR radar clearance mandated before floor coring."),
        (stakeholders[5].id, NotificationType.DEADLINE_APPROACHING, "Upcoming Milestone: Gypsum Framing Inspection", "Living salon gypsum ceiling framing inspection scheduled in 4 calendar days."),
        (stakeholders[6].id, NotificationType.DEPENDENCY_FAILURE, "Dependency Alert: Kitchen Cabinetry Hold", "FurnishCraft carcass millwork fabrication held pending revised CAD Rev-C2 transmission."),
        (stakeholders[7].id, NotificationType.GENERAL, "Port Clearance Milestone Achieved", "Calacatta Gold marble consignment cleared Nhava Sheva port and en-route to Gurgaon."),
        (stakeholders[9].id, NotificationType.BLOCKER_DETECTED, "Field Blocker: Screeding Halted", "Kitchen sub-floor screed suspended by site supervisor until MEP floor trenching is complete."),
    ]

    for recipient_id, ntype, title, message in notifs_catalog:
        n = Notification(
            project_id=project.id,
            recipient_id=recipient_id,
            notification_type=ntype,
            title=title,
            message=message,
            is_read=False,
        )
        db.add(n)
    await db.flush()

    # 17. Health Snapshots (7 Historical Points Showing Project Health Trend)
    for i in range(7):
        base_score = 88 - (i * 4.2) + (i % 2) * 1.5
        status = HealthStatus.HEALTHY if base_score >= 75 else (HealthStatus.AT_RISK if base_score >= 50 else HealthStatus.CRITICAL)
        hs = HealthSnapshot(
            project_id=project.id,
            score=round(base_score, 1),
            status=status,
            overdue_tasks=max(0, i - 2),
            pending_approvals=3 + i,
            blocker_count=max(1, i - 1),
            risk_count=4 + i,
            dependency_failures=max(0, i - 3),
            created_at=now - timedelta(days=7 * (6 - i)),
        )
        db.add(hs)
    await db.flush()

    # 18. Audit Events
    audit_events = [
        ("change_request_created", "change_request", cr1.id, stakeholders[0].id, "Client submitted Kitchen Island Redesign request", {"title": cr1.title, "status": cr1.status.value}),
        ("approval_decision", "approval", 3, stakeholders[1].id, "Lead Architect approved Electrical Sub-Station Single Line Diagram", {"decision": "approved"}),
        ("decision_recorded", "decision", 1, stakeholders[0].id, "Client and Architect finalized 1.2m kitchen island relocation", {"rationale": "Ergonomic and view enhancement"}),
        ("issue_escalated", "issue", issue1.id, stakeholders[4].id, "Electrical Engineer flagged structural post-tension clash", {"severity": "critical"}),
    ]

    for etype, ent_type, ent_id, actor_id, desc, changes in audit_events:
        ae = AuditEvent(
            project_id=project.id,
            actor_id=actor_id,
            event_type=etype,
            entity_type=ent_type,
            entity_id=ent_id,
            description=desc,
            changes=changes,
        )
        db.add(ae)
    await db.flush()

    # 19. Admin Audit Logs & Notifications
    admin_user = await db.execute(select(User).where(User.role == "admin").limit(1))
    admin_obj = admin_user.scalar_one_or_none()
    admin_id = admin_obj.id if admin_obj else 1

    admin_audit_data = [
        ("system_initialized", "system", None, "127.0.0.1", "success", {"version": "1.0.0", "module": "admin"}),
        ("user_created", "user", 2, "192.168.1.10", "success", {"email": "analyst@archscale.io", "role": "analyst"}),
        ("role_assigned", "role", 3, "192.168.1.10", "success", {"role": "operator", "user": "Marcus Vance"}),
        ("radar_scan_triggered", "radar", None, "10.0.0.5", "success", {"frequency": "high", "nodes_responding": 4}),
        ("security_policy_updated", "system", None, "127.0.0.1", "success", {"mfa_enforced": True, "session_timeout_min": 30}),
    ]
    for action, rtype, rid, ip, st, det in admin_audit_data:
        db.add(AdminAuditLog(
            user_id=admin_id, action=action, resource_type=rtype,
            resource_id=rid, ip_address=ip, status=st, details=det,
        ))

    admin_notifs = [
        ("security", "Security Audit Completed", "All user roles and access tokens validated with zero anomalies detected.", False),
        ("system", "Radar Node Cluster Synced", "All primary and secondary radar arrays reporting healthy telemetry.", False),
        ("user", "New Operators Provisioned", "Operator Marcus Vance has been activated on the live telemetry stream.", True),
    ]
    for ntype, title, msg, is_r in admin_notifs:
        db.add(AdminNotification(
            user_id=admin_id, notification_type=ntype, title=title,
            message=msg, is_read=is_r,
        ))
    await db.flush()

    return {
        "status": "seeded",
        "organization_id": org.id,
        "project_id": project.id,
        "users": len(users_data),
        "stakeholders": len(stakeholders),
        "tasks": len(tasks),
        "dependencies": len(deps_catalog),
        "approvals": len(approvals_catalog),
        "decisions": len(decisions_catalog),
        "risks": len(risks_catalog),
        "conversations": 4,
        "change_requests": 4,
    }
