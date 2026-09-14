export interface Organization {
  id: number;
  name: string;
  domain: string | null;
  subscription_tier: string;
  description: string | null;
}

export interface Project {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  status: string;
  health_score: number;
  health_status: string;
  start_date: string | null;
  target_end_date: string | null;
  location: string | null;
  budget: number | null;
  created_at: string | null;
}

export interface Stakeholder {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  title: string | null;
  avatar_url: string | null;
  influence_score: number;
  workload_score: number;
}

export interface Task {
  id: number;
  project_id: number;
  assignee_id: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_days: number | null;
  assignee_name: string | null;
}

export interface Dependency {
  id: number;
  source_id: number;
  target_id: number;
  relationship_type: string;
  source_task_title: string | null;
  target_task_title: string | null;
}

export interface Approval {
  id: number;
  title: string;
  approval_type: string;
  status: string;
  requester_name: string | null;
  approver_name: string | null;
  approver_id: number;
  due_date: string | null;
  is_overdue: boolean;
  days_overdue: number;
  related_task_id: number | null;
  change_request_id: number | null;
  created_at: string | null;
}

export interface ChangeRequest {
  id: number;
  title: string;
  description: string | null;
  reason: string | null;
  status: string;
  affected_areas: Record<string, unknown> | null;
  impact_summary: string | null;
  estimated_delay_days: number | null;
  risk_level: string | null;
  created_at: string | null;
}

export interface Risk {
  id: number;
  title: string;
  description: string | null;
  category: string;
  severity: string;
  probability: number;
  impact_score: number;
  risk_score: number;
  mitigation: string | null;
  owner_id: number | null;
}

export interface BlockerAlert {
  id: number;
  title: string;
  blocker_type: string;
  reason: string;
  owner_name: string | null;
  owner_id: number | null;
  affected_task_id: number | null;
  affected_task_title: string | null;
  severity: string;
  created_at: string | null;
}

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string | null;
}

export interface HealthData {
  project_id: number;
  score: number;
  status: string;
  overdue_tasks: number;
  pending_approvals: number;
  blocker_count: number;
  risk_count: number;
  dependency_failures: number;
}

export interface Decision {
  id: number;
  title: string;
  rationale: string | null;
  decided_by: string | null;
  decided_at: string | null;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  status?: string;
  role?: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relationship_type: string;
}

export interface DashboardData {
  health: HealthData;
  pending_approvals: Approval[];
  blockers: BlockerAlert[];
  risks: {
    total_risks: number;
    by_severity: Record<string, number>;
    by_category: Record<string, number>;
    risks: Risk[];
  };
  recent_decisions: Decision[];
  stakeholder_activity: Stakeholder[];
  recommendations: string[];
  task_summary: {
    total: number;
    completed: number;
    in_progress: number;
    blocked: number;
    completion_rate: number;
  };
  change_requests: ChangeRequest[];
}

export interface StakeholderWorkload {
  stakeholder_id: number;
  name: string;
  role: string;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  pending_approvals: number;
  workload_score: number;
}

export interface StakeholderMatrixItem {
  stakeholder: Stakeholder;
  assigned_tasks_count: number;
  pending_approvals_count: number;
  active_risks_count: number;
  responsibility_areas: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SimulationResult {
  affected_tasks: Array<{ title: string; impact_description: string }>;
  affected_stakeholders: Array<{ name: string; role: string; impact_description: string }>;
  estimated_delay_days: number;
  risk_score: number;
  dependency_impact: Array<{ from_task: string; to_task: string; impact: string }>;
  recommendations: string[];
}

export interface ExtractionResult {
  tasks: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
  action_items: Array<Record<string, unknown>>;
  stakeholders: Array<Record<string, unknown>>;
  deadlines: Array<Record<string, unknown>>;
  summary: string;
}

export interface User {
  id: number;
  email: string;
  username: string | null;
  mobile_no: string | null;
  full_name: string;
  role: string;
  organization_id: number;
  organization_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_superadmin?: boolean;
  stakeholder_id?: number | null;
  created_at?: string | null;
  last_login_at?: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string | null;
  mobile_no: string | null;
  full_name: string;
  role: string;
  organization_id: number;
  organization_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_superadmin: boolean;
  stakeholder_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  last_login_at: string | null;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: number | null;
  ip_address: string | null;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminNotification {
  id: number;
  user_id: number | null;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string | null;
}

export interface AdminNotificationListResponse {
  notifications: AdminNotification[];
  total: number;
  unread_count: number;
}

export interface RolePermission {
  role: string;
  permissions: string[];
  user_count: number;
}

export interface SystemHealth {
  server_uptime_seconds: number;
  database_connected: boolean;
  database_response_ms: number;
  api_status: string;
  total_users: number;
  active_users: number;
  online_sessions: number;
  radar_nodes_connected: number;
  targets_tracked: number;
  alerts_generated: number;
  reports_generated: number;
  error_count: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

export interface AdminDashboardData {
  total_users: number;
  active_users: number;
  online_users: number;
  radar_nodes: number;
  targets_tracked: number;
  alerts_generated: number;
  reports_generated: number;
  database_status: string;
  server_health: string;
  api_health: string;
  recent_audit_logs: AuditLog[];
  recent_notifications: AdminNotification[];
  users_by_role: Record<string, number>;
}
