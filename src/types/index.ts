export type Me = {
  authenticated: boolean; name: string; first_name: string; last_name: string; ippis_number: string;
  department: string | null; can_admin: boolean; can_manage_staff: boolean; can_view_staff: boolean; can_access_staff: boolean;
  can_approve: boolean; can_manage_devices: boolean; can_access_approvals: boolean; can_export_reports: boolean;
  can_view_audit: boolean; can_manage_geofence: boolean; can_manage_roles: boolean; can_review_department_requests: boolean;
  face_enrolled: boolean; require_face_verification: boolean; has_approved_device: boolean; require_approved_device: boolean; mfa_enabled: boolean; mfa_configured: boolean;
};

export type AttendanceRecord = {
  id: number; date: string; campus_name: string; check_in_at: string; check_out_at: string | null; duration_minutes: number | null;
  check_in_status: 'on_time' | 'late'; check_out_status: string; overtime_minutes: number;
  activity_report_status: string; review_status: string; activity_count: number;
};
export type Today = {
  state: 'not_checked_in' | 'checked_in' | 'checked_out'; server_time: string; checkout_allowed_after: string;
  checkin_late_after: string; checkin_closes_after: string; checkin_open: boolean; is_working_day: boolean;
  non_working_reason: string | null; record: AttendanceRecord | null;
};
export type Activity = { id: number; category: number; title: string; description: string; start_time: string; end_time: string; output: string };
export type Category = { id: number; name: string };

export type FaceStatus = { status: 'not_enrolled' | 'active' | 'revoked'; enrolled_at: string | null; last_verified_at: string | null };
export type Device = { id: number; label: string; status: 'pending' | 'active' | 'revoked'; registered_at: string; last_seen_at: string | null; removal_pending: boolean };

export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'recalled';
export type StaffRequest = {
  id: number; kind?: string; location?: string; start_date: string; end_date: string; reason: string; status: string;
  approval_state: ApprovalState; approval_message: string; created_at: string;
};

export type Option = { id: number; name: string };
export type Campus = Option & { latitude: number; longitude: number; department_ids: number[]; departments: string[]; geofences: { id: number; kind: string; polygon: [number, number][] | null }[] };
export type Department = Option & { campus_ids: number[] };
export type Holiday = { id: number; date: string; name: string; kind: 'public' | 'nasrda' | 'non_working' | 'special_working' };
export type Permission = { id: number; name: string; code: string };
export type Role = { id: number; name: string; permission_ids: number[]; permissions: Permission[]; member_count: number };
export type Staff = {
  id: number; ippis_number: string; first_name: string; last_name: string; middle_name: string; email: string; phone: string; file_number: string;
  department: number | null; department_name: string; designation: string; grade_level: string; employment_status: string;
  primary_campus: number | null; campus_name: string; campus_policy: string; is_nursing_mother: boolean; mfa_enabled: boolean;
  is_active: boolean; role_ids: number[]; roles: string[];
};
export type Settings = {
  work_start: string; work_end: string; checkin_late_after: string; checkin_closes_after: string; checkout_allowed_after: string;
  nursing_mother_checkout_after: string; grace_minutes: number; overtime_after_minutes: number; min_accuracy_m: number;
  max_speed_mps: number; max_devices: number; require_face_verification: boolean; require_approved_device: boolean;
};
