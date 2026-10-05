import { apiFetch } from '../lib/api';

export type Permission =
  | 'content.read'
  | 'content.write'
  | 'users.read'
  | 'users.write'
  | 'staff.manage'
  | 'settings.write'
  | 'audit.read'
  | 'trip.manage';

export interface AdminIdentity {
  username: string;
  displayName: string;
  role: string;
  permissions: Permission[];
}

export interface Member {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  tripGroup: string | null;
  disabled: boolean;
  hasPassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface MemberPage {
  total: number;
  page: number;
  pageSize: number;
  items: Member[];
}

export interface StaffMember {
  id: string;
  username: string;
  displayName: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface RoleInfo {
  id: string;
  label: string;
  description: string;
}

export interface AuditEntry {
  id: number;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface DashboardData {
  members: {
    total: number;
    disabled: number;
    withPassword: number;
    everLoggedIn: number;
    activeWeek: number;
    activeDay: number;
  };
  content: { collection: string; total: number; published: number }[];
  staff: { total: number; active: number };
  access: { openAccess: boolean; passwordLogin: boolean; smsLogin: boolean; smsConfigured: boolean };
}

export interface ImportResult {
  created: number;
  updated: number;
  rejected: { row: number; reason: string }[];
}

export interface MemberInput {
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  tripGroup?: string | null;
}

const get = <T,>(path: string) => apiFetch<T>(path, { method: 'GET' }, true);
const send = <T,>(method: string, path: string, body?: unknown) =>
  apiFetch<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }, true);

export const fetchMe = () => get<{ admin: AdminIdentity }>('/api/admin/me').then((r) => r.admin);
export const fetchDashboard = () => get<DashboardData>('/api/admin/dashboard');

export const listMembers = (params: { q?: string; status?: string; page?: number; pageSize?: number }) => {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 25));
  return get<MemberPage>(`/api/admin/users?${query}`);
};
export const createMember = (input: MemberInput) => send<Member>('POST', '/api/admin/users', input);
export const updateMember = (id: string, input: Partial<MemberInput> & { disabled?: boolean }) =>
  send<Member>('PUT', `/api/admin/users/${encodeURIComponent(id)}`, input);
export const deleteMember = (id: string) => send<void>('DELETE', `/api/admin/users/${encodeURIComponent(id)}`);
export const importMembers = (users: MemberInput[]) => send<ImportResult>('POST', '/api/admin/users/import', { users });

export const listStaff = () => get<{ roles: RoleInfo[]; items: StaffMember[] }>('/api/admin/staff');
export const createStaff = (input: { username: string; displayName: string; role: string; password: string }) =>
  send<StaffMember>('POST', '/api/admin/staff', input);
export const updateStaff = (id: string, input: Partial<{ displayName: string; role: string; active: boolean; password: string }>) =>
  send<StaffMember>('PUT', `/api/admin/staff/${encodeURIComponent(id)}`, input);
export const deleteStaff = (id: string) => send<void>('DELETE', `/api/admin/staff/${encodeURIComponent(id)}`);

export const listAudit = (limit = 50, offset = 0) =>
  get<{ items: AuditEntry[] }>(`/api/admin/audit?limit=${limit}&offset=${offset}`).then((r) => r.items);

export interface TripAdmin {
  group: string;
  now: number;
  opened: Record<string, number>;
  stages: { id: string; title: string; subtitle: string; openedAt: number | null; scheduledAt: number | null; done: number }[];
  members: { id: string; rank: number; name: string; points: number; adjust: number; badges: number; stagesDone: number; everLoggedIn: boolean }[];
  total: number;
}

export const fetchTrip = (group: string) => get<TripAdmin>(`/api/admin/trip?group=${group}`);
export const openNextTripStage = (group: string) => send<TripAdmin>('POST', `/api/admin/trip/open?group=${group}`);
export const setTripSchedule = (group: string, startAt: string, everyMinutes: number) =>
  send<TripAdmin>('POST', `/api/admin/trip/schedule?group=${group}`, { startAt, everyMinutes });
export const clearTripSchedule = (group: string) => send<TripAdmin>('DELETE', `/api/admin/trip/schedule?group=${group}`);
export const undoTripStage = (group: string) => send<TripAdmin>('POST', `/api/admin/trip/undo?group=${group}`);

export interface PointAdjustment {
  id: number;
  delta: number;
  reason: string;
  actor: string;
  at: string;
}

export const adjustTripPoints = (group: string, userId: string, delta: number, reason: string) =>
  send<TripAdmin>('POST', `/api/admin/trip/adjust?group=${group}`, { userId, delta, reason });
export const listPointAdjustments = (group: string, userId: string) =>
  get<{ items: PointAdjustment[] }>(`/api/admin/trip/adjustments?group=${group}&user=${encodeURIComponent(userId)}`).then((r) => r.items);
