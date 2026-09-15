"""
ArchScale Nexus - Seed Documents & Project Progress
Updates existing database records with standardized progress engine metrics
and architectural drawings & documents for Project 1.
"""

import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.database import async_session
from app.models.project import Project
from app.models.user import User
from app.models.document import Document
from app.models.stakeholder import Stakeholder


async def seed_documents_and_progress():
    async with async_session() as db:
        # 1. Fetch Project 1
        res = await db.execute(select(Project).where(Project.id == 1))
        project = res.scalar_one_or_none()
        if not project:
            print("[Error] Project 1 not found")
            return

        # 2. Find client user (Rajiv Mehra)
        client_res = await db.execute(select(User).where(User.email == "rajiv@client.com"))
        client_user = client_res.scalar_one_or_none()
        client_id = client_user.id if client_user else None

        # 3. Update project with standardized progress percentages & client_id
        project.client_id = client_id
        project.overall_completion_pct = 68.0
        project.design_completion_pct = 92.0
        project.planning_completion_pct = 85.0
        project.execution_completion_pct = 54.0
        project.documentation_completion_pct = 70.0
        print(f"[Success] Updated Project 1: overall=68.0%, client_id={client_id}")

        # 4. Check existing documents
        doc_count_res = await db.execute(select(Document).where(Document.project_id == 1))
        existing_docs = doc_count_res.scalars().all()

        if not existing_docs:
            # Fetch architect stakeholder for uploader
            stk_res = await db.execute(select(Stakeholder).where(Stakeholder.email == "ananya@archscale.io"))
            architect_stk = stk_res.scalar_one_or_none()
            arch_id = architect_stk.id if architect_stk else None

            sample_docs = [
                (
                    "A-101: Master Architectural Floor Plans & Penthouse Elevations",
                    "Architectural Drawing",
                    "https://assets.archscale.io/drawings/lumina-a101-master-floorplan.dwg",
                    "Full master layout with spatial partitioning, balcony cantilever details, double-height living room section, and terrace pool structural tie-ins.",
                    "Drawing Number: A-101 | Rev: C | Scale: 1:50 | Approved by Municipal Authority & Lead Architect",
                ),
                (
                    "I-204: Calacatta Marble Millwork & Bespoke Joinery Schedules",
                    "Interior Specification",
                    "https://assets.archscale.io/specs/lumina-i204-calacatta-millwork.pdf",
                    "Detailed fabrication schedules for Italian Calacatta Oro marble kitchen island, custom fluted walnut cabinetry, and bronze hardware integration.",
                    "Specification Code: SPEC-CALA-04 | Thickness: 20mm bookmatched | Lead Supplier: MarbleTech & FurnishCraft",
                ),
                (
                    "E-302: Lutron HomeWorks Automation & Architectural Lighting Schematics",
                    "Electrical Schematic",
                    "https://assets.archscale.io/drawings/lumina-e302-lutron-automation.dwg",
                    "Complete line schematic for centralized Lutron HomeWorks QSX processor, 0-10V dimming panels, scene keypads, and motorized shade circuits.",
                    "System: Lutron QSX | Zones: 48 | Keypads: 16 Palladiom | Tested: SmartHome Systems Certified",
                ),
                (
                    "M-401: VRV Air Conditioning & Acoustic Ceiling Duct Layout",
                    "MEP Drawing",
                    "https://assets.archscale.io/drawings/lumina-m401-vrv-ducts.dwg",
                    "Daikin VRV IV multi-split ducted system layout with concealed low-noise linear slot diffusers and acoustic damper attenuation sections.",
                    "Capacity: 18 HP | Indoor Units: 8 Concealed | Static Pressure: 50 Pa | Acoustic Rating: NC-28",
                ),
                (
                    "S-105: Structural Cantilever Balcony & Facade Engineering Report",
                    "Engineering Report",
                    "https://assets.archscale.io/reports/lumina-s105-cantilever-structural.pdf",
                    "Structural finite-element stress analysis for the extended 3.5-meter cantilever terrace with post-tensioned tendon anchor verification.",
                    "Load Rating: 4.5 kN/sqm live load | Structural Safety Factor: 2.25 | Certified by Suresh Kumar PE",
                ),
                (
                    "C-001: General Contractor Milestone Agreement & Payment Schedule",
                    "Contract Document",
                    "https://assets.archscale.io/contracts/lumina-c001-buildpro-agreement.pdf",
                    "Primary construction contract detailing 5 milestone deliverables, defect liability period of 24 months, and retainage release terms.",
                    "Contract Value: ₹8,450,000 | Retention: 5% | Contractor: BuildPro Construction Ltd",
                ),
            ]

            for title, dtype, url, content, extracted in sample_docs:
                db.add(Document(
                    project_id=1,
                    uploaded_by_id=arch_id,
                    title=title,
                    document_type=dtype,
                    file_url=url,
                    content=content,
                    extracted_data=extracted,
                    created_at=datetime.now(timezone.utc),
                ))
            print(f"[Success] Seeded {len(sample_docs)} architectural drawings and specifications.")
        else:
            print(f"[Info] {len(existing_docs)} documents already exist.")

        await db.commit()
        print("[Done] Phase 4 database updates committed successfully.")


if __name__ == "__main__":
    asyncio.run(seed_documents_and_progress())
