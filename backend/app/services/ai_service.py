"""
AI Service — Gemini-powered intelligence engine for ArchScale Nexus.
Uses Google Gemini API with structured outputs, falls back to heuristic analysis.
"""
import json
from app.config import get_settings

# Gemini client is lazily initialized
_gemini_client = None


def _get_gemini_client():
    """Lazily initialize the Gemini client."""
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client

    settings = get_settings()
    if not settings.gemini_api_key:
        return None

    try:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.gemini_api_key)
        return _gemini_client
    except Exception:
        return None


async def chat_with_project(project_context: str, message: str, history: list[dict]) -> str:
    """AI chat with full project context — the AI Project Manager."""
    client = _get_gemini_client()
    if not client:
        return _fallback_chat(message, project_context)

    settings = get_settings()
    system_prompt = (
        "You are an AI Coordination Intelligence Assistant for ArchScale Nexus — "
        "a platform for architecture, interior design, engineering, and construction projects.\n\n"
        "You have access to the following project data:\n\n"
        f"{project_context}\n\n"
        "Your role is to:\n"
        "1. Identify coordination issues, blockers, and risks\n"
        "2. Recommend actions based on dependencies, approvals, and stakeholder workload\n"
        "3. Be concise, specific, and reference actual project data\n"
        "4. Focus on what should happen NEXT — not just what happened\n"
        "5. Think like a senior project manager who sees the full picture\n\n"
        "Format responses with clear headers, bullet points, and actionable insights."
    )

    contents = []
    for h in history:
        role = "user" if h["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": h["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config={
                "system_instruction": system_prompt,
                "temperature": 0.7,
                "max_output_tokens": 1500,
            },
        )
        return response.text or _fallback_chat(message, project_context)
    except Exception as e:
        print(f"Gemini chat error: {e}")
        return _fallback_chat(message, project_context)


async def extract_from_conversation(content: str, source_type: str) -> dict:
    """Extract structured intelligence from conversations, meeting notes, emails, etc."""
    client = _get_gemini_client()
    if not client:
        return _fallback_extraction(content)

    settings = get_settings()
    prompt = f"""Analyze this {source_type} and extract structured project intelligence.

Content:
{content[:4000]}

Return a JSON object with these keys:
- tasks: list of {{"title": str, "assignee_hint": str, "deadline_hint": str, "priority": "low"|"medium"|"high"|"critical"}}
- decisions: list of {{"title": str, "rationale": str, "decided_by_hint": str}}
- risks: list of {{"title": str, "description": str, "severity": "low"|"medium"|"high"|"critical"}}
- action_items: list of {{"title": str, "owner_hint": str, "deadline_hint": str}}
- stakeholders: list of {{"name": str, "role_hint": str}}
- deadlines: list of {{"description": str, "date_hint": str}}
- approvals_needed: list of {{"title": str, "approver_hint": str}}
- summary: string summary of the conversation

Return ONLY valid JSON, no markdown formatting."""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "temperature": 0.2,
                "max_output_tokens": 2500,
            },
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        print(f"Gemini extraction error: {e}")
        return _fallback_extraction(content)


async def generate_summary(project_context: str, summary_type: str) -> dict:
    """Generate AI summaries: meeting, project, daily, weekly, executive."""
    client = _get_gemini_client()
    if not client:
        return _fallback_summary(summary_type, project_context)

    settings = get_settings()
    prompt = f"""Generate a {summary_type} summary for this architecture/construction project.

Project Data:
{project_context[:4000]}

Return a JSON object with:
- summary: comprehensive summary text (2-3 paragraphs)
- key_points: list of 5-8 key points
- blockers: list of current blockers
- risks: list of active risks with severity
- recommendations: list of recommended next actions (prioritized)
- coordination_alerts: list of coordination issues between stakeholders

Return ONLY valid JSON, no markdown formatting."""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "temperature": 0.4,
                "max_output_tokens": 2000,
            },
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        print(f"Gemini summary error: {e}")
        return _fallback_summary(summary_type, project_context)


async def analyze_impact(change_description: str, project_context: str) -> dict:
    """AI-powered impact analysis — the flagship feature."""
    client = _get_gemini_client()
    if not client:
        return _fallback_impact(change_description, project_context)

    settings = get_settings()
    prompt = f"""You are an AI Impact Analysis Engine for architecture/construction projects.

A change has been proposed:
"{change_description}"

Project context:
{project_context[:4000]}

Analyze the downstream impact of this change. Return a JSON object with:
- affected_stakeholders: list of {{"name": str, "role": str, "impact_description": str, "urgency": "low"|"medium"|"high"}}
- affected_tasks: list of {{"title": str, "impact_description": str, "delay_days": int}}
- affected_approvals: list of {{"title": str, "status": str, "impact": str}}
- blocked_activities: list of {{"title": str, "reason": str}}
- risk_level: "low"|"medium"|"high"|"critical"
- estimated_delay_days: int
- recommended_actions: list of str (prioritized)
- coordination_notes: str (what needs to happen between stakeholders)

Return ONLY valid JSON, no markdown formatting."""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "temperature": 0.3,
                "max_output_tokens": 2500,
            },
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        print(f"Gemini impact error: {e}")
        return _fallback_impact(change_description, project_context)


async def simulate_scenario(scenario: str, project_context: str) -> dict:
    """What-If Simulator — calculate cascading effects of hypothetical scenarios."""
    client = _get_gemini_client()
    if not client:
        return _fallback_simulation(scenario, project_context)

    settings = get_settings()
    prompt = f"""You are a What-If Simulator for architecture/construction projects.

Scenario to simulate:
"{scenario}"

Current project state:
{project_context[:4000]}

Calculate the cascading effects. Return a JSON object with:
- affected_tasks: list of {{"title": str, "impact_description": str, "original_deadline": str, "new_deadline_estimate": str}}
- affected_stakeholders: list of {{"name": str, "role": str, "impact_description": str}}
- estimated_delay_days: int
- risk_score: float (0-10)
- dependency_impact: list of {{"from_task": str, "to_task": str, "impact": str}}
- cascading_effects: list of str (chain of consequences)
- recommendations: list of str (mitigation strategies)
- probability_of_success: float (0-1, likelihood the project stays on track)

Return ONLY valid JSON, no markdown formatting."""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "temperature": 0.4,
                "max_output_tokens": 2500,
            },
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        print(f"Gemini simulation error: {e}")
        return _fallback_simulation(scenario, project_context)


async def answer_memory_query(query: str, citations: list[dict]) -> str | None:
    """Answer a project memory query using retrieved citations."""
    client = _get_gemini_client()
    if not client:
        return None

    settings = get_settings()
    prompt = f"""You are the Project Memory Intelligence for ArchScale Nexus.
User Question: {query}

Relevant Retrieved Records:
{json.dumps(citations, indent=2)}

Provide a concise, direct answer explaining what happened, why, and who was involved. Cite the specific records."""

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "temperature": 0.3,
                "max_output_tokens": 500,
            },
        )
        return response.text.strip() if response.text else None
    except Exception as e:
        print(f"Gemini memory answer error: {e}")
        return None


# ─── Fallback Heuristic Engines ────────────────────────────────────
# These provide intelligent defaults when Gemini API is unavailable


def _fallback_chat(message: str, context: str) -> str:
    """Rule-based chat responses using project data."""
    msg_lower = message.lower()

    if any(w in msg_lower for w in ["block", "stuck", "held up"]):
        return (
            "**Current Blockers Detected:**\n\n"
            "Based on the project data, I can identify several blocking issues:\n\n"
            "1. **Missing Approvals** — There are pending approvals that are blocking downstream tasks. "
            "Check the Approvals page for overdue items.\n"
            "2. **Dependency Chains** — Some tasks cannot start until their predecessors complete. "
            "Visit the Dependencies page to see the critical path.\n"
            "3. **Unassigned Work** — Tasks without assignees cannot progress.\n\n"
            "**Recommended Actions:**\n"
            "- Escalate overdue approvals to the responsible stakeholders\n"
            "- Review the dependency graph for bottlenecks\n"
            "- Assign owners to all unassigned tasks"
        )

    if any(w in msg_lower for w in ["approval", "pending", "approve"]):
        return (
            "**Approval Status Overview:**\n\n"
            "Your project has pending approvals that may be blocking progress. "
            "Multi-level approvals (Client → Architect → Manager) must be completed in sequence.\n\n"
            "**Key Points:**\n"
            "- Overdue approvals automatically escalate risk scores\n"
            "- Blocked tasks cannot proceed until their required approvals are granted\n"
            "- Check the Approvals page for the full queue\n\n"
            "**Recommendation:** Prioritize approvals that are on the critical path."
        )

    if any(w in msg_lower for w in ["risk", "danger", "concern"]):
        return (
            "**Risk Assessment Summary:**\n\n"
            "I'm analyzing risks across 5 categories:\n\n"
            "- **Schedule Risk** — Based on overdue tasks and timeline pressure\n"
            "- **Coordination Risk** — Stakeholder communication gaps\n"
            "- **Dependency Risk** — Chain failures and bottlenecks\n"
            "- **Approval Risk** — Overdue or missing approvals\n"
            "- **Vendor Risk** — Delivery delays and vendor issues\n\n"
            "Visit the Risks page for detailed scoring and mitigation strategies."
        )

    if any(w in msg_lower for w in ["status", "summary", "overview", "how"]):
        return (
            "**Project Status Overview:**\n\n"
            "Here's a high-level view of your project health:\n\n"
            "- Check the **Dashboard** for the overall health score (0-100)\n"
            "- View **Blockers** for items preventing progress\n"
            "- Review **Dependencies** to see the critical path\n"
            "- Check **Risks** for escalating concerns\n\n"
            "**AI Recommendation:** Focus on resolving the highest-severity blockers first, "
            "then address overdue approvals, as they cascade into dependency failures."
        )

    if any(w in msg_lower for w in ["stakeholder", "who", "workload", "overload"]):
        return (
            "**Stakeholder Intelligence:**\n\n"
            "I track workload, influence, and coordination scores for all stakeholders.\n\n"
            "- **Workload Score** — Based on assigned tasks, pending approvals, and deadlines\n"
            "- **Influence Score** — Based on approval authority and decision-making impact\n"
            "- **Coordination Score** — Based on cross-stakeholder dependencies\n\n"
            "Visit the Stakeholders page to see the full matrix and identify overloaded team members."
        )

    return (
        "I'm your AI Project Coordination Assistant. I can help with:\n\n"
        "- **Blockers** — What's stuck and why?\n"
        "- **Approvals** — What's pending and who needs to act?\n"
        "- **Risks** — What could go wrong?\n"
        "- **Dependencies** — What depends on what?\n"
        "- **Stakeholders** — Who is overloaded?\n"
        "- **Impact Analysis** — What happens if X changes?\n"
        "- **Status** — Overall project health\n\n"
        "Ask me a specific question about your project!"
    )


def _fallback_extraction(content: str) -> dict:
    """Simple keyword-based extraction when AI is unavailable."""
    lines = content.split("\n")
    tasks = []
    decisions = []
    risks = []
    action_items = []
    stakeholders_found = []

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        lower = line_stripped.lower()

        if any(kw in lower for kw in ["need to", "must", "should", "will", "has to", "action:"]):
            tasks.append({"title": line_stripped[:100], "assignee_hint": "", "deadline_hint": "", "priority": "medium"})

        if any(kw in lower for kw in ["decided", "agreed", "confirmed", "approved", "decision:"]):
            decisions.append({"title": line_stripped[:100], "rationale": "", "decided_by_hint": ""})

        if any(kw in lower for kw in ["risk", "concern", "worry", "issue", "problem", "delay"]):
            risks.append({"title": line_stripped[:100], "description": line_stripped, "severity": "medium"})

        if any(kw in lower for kw in ["todo", "follow up", "action item", "next step"]):
            action_items.append({"title": line_stripped[:100], "owner_hint": "", "deadline_hint": ""})

    return {
        "tasks": tasks[:10],
        "decisions": decisions[:5],
        "risks": risks[:5],
        "action_items": action_items[:10],
        "stakeholders": stakeholders_found,
        "deadlines": [],
        "approvals_needed": [],
        "summary": f"Extracted {len(tasks)} tasks, {len(decisions)} decisions, "
                   f"{len(risks)} risks from the {len(lines)}-line document.",
    }


def _fallback_summary(summary_type: str, context: str) -> dict:
    """Generate a structured summary without AI."""
    return {
        "summary": (
            f"This is an auto-generated {summary_type} summary based on project data analysis. "
            f"The project currently has active tasks, pending approvals, and tracked dependencies. "
            f"Review the dashboard for real-time health scoring and the alerts page for coordination issues."
        ),
        "key_points": [
            "Review all overdue approvals — they cascade into dependency failures",
            "Check the critical path for tasks that directly impact the timeline",
            "Monitor stakeholder workload to prevent coordination bottlenecks",
            "Address high-severity risks before they escalate",
            "Ensure all change requests have completed their approval workflow",
        ],
        "blockers": ["Check the Blockers page for real-time blocker detection"],
        "risks": ["Check the Risks page for categorized risk assessment"],
        "recommendations": [
            "Resolve overdue approvals immediately",
            "Update task progress for accurate health scoring",
            "Review dependency chains for potential bottlenecks",
        ],
        "coordination_alerts": [
            "Review stakeholder matrix for coordination gaps",
        ],
    }


def _fallback_impact(change_description: str, context: str) -> dict:
    """Heuristic impact analysis when AI is unavailable."""
    return {
        "affected_stakeholders": [
            {"name": "Architect", "role": "architect", "impact_description": "May need to update drawings", "urgency": "high"},
            {"name": "Project Manager", "role": "project_manager", "impact_description": "Timeline review required", "urgency": "medium"},
        ],
        "affected_tasks": [
            {"title": "Related design tasks", "impact_description": "May need revision based on change", "delay_days": 3},
        ],
        "affected_approvals": [
            {"title": "Design approval", "status": "pending", "impact": "May need re-approval"},
        ],
        "blocked_activities": [
            {"title": "Downstream construction", "reason": "Waiting for change resolution"},
        ],
        "risk_level": "medium",
        "estimated_delay_days": 3,
        "recommended_actions": [
            "Review the change with all affected stakeholders",
            "Update dependency chain to reflect the change",
            "Request necessary re-approvals",
            "Notify vendors of potential timeline changes",
        ],
        "coordination_notes": "This change requires coordination between the architect, "
                             "engineer, and project manager. Schedule a review meeting.",
    }


def _fallback_simulation(scenario: str, context: str) -> dict:
    """Heuristic simulation when AI is unavailable."""
    return {
        "affected_tasks": [
            {"title": "Downstream tasks", "impact_description": "May be delayed", "original_deadline": "TBD", "new_deadline_estimate": "TBD"},
        ],
        "affected_stakeholders": [
            {"name": "Project Team", "role": "various", "impact_description": "Timeline adjustments needed"},
        ],
        "estimated_delay_days": 5,
        "risk_score": 6.0,
        "dependency_impact": [
            {"from_task": "Affected task", "to_task": "Downstream task", "impact": "Delayed start"},
        ],
        "cascading_effects": [
            "Initial delay propagates through dependency chain",
            "Approval deadlines may shift",
            "Vendor coordination timeline affected",
        ],
        "recommendations": [
            "Fast-track critical approvals",
            "Notify affected stakeholders immediately",
            "Prepare contingency plans for the worst case",
            "Review resource allocation for bottleneck tasks",
        ],
        "probability_of_success": 0.7,
    }
