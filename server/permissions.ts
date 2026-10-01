/**
 * Roles for people who sign in to the admin panel. Permissions are checked on
 * the server for every request; the panel only uses them to hide what a role
 * cannot do.
 */

export type Permission =
  | 'content.read'
  | 'content.write'
  | 'users.read'
  | 'users.write'
  | 'staff.manage'
  | 'settings.write'
  | 'audit.read'
  | 'trip.manage';

export type Role = 'admin' | 'editor' | 'support' | 'viewer';

export const ROLES: Record<Role, { label: string; description: string; permissions: Permission[] }> = {
  admin: {
    label: 'مدیر کل',
    description: 'همه‌ی بخش‌ها: محتوا، کاربران، مدیران، تنظیمات و گزارش فعالیت',
    permissions: ['content.read', 'content.write', 'users.read', 'users.write', 'staff.manage', 'settings.write', 'audit.read', 'trip.manage'],
  },
  editor: {
    label: 'تولیدکننده‌ی محتوا',
    description: 'ساخت و ویرایش محتوا و بارگذاری رسانه؛ بدون دسترسی به کاربران و تنظیمات',
    permissions: ['content.read', 'content.write'],
  },
  support: {
    label: 'پشتیبان کاربران',
    description: 'مشاهده و مدیریت حساب کاربران (ساخت، رمز، غیرفعال‌سازی)؛ بدون ویرایش محتوا',
    permissions: ['content.read', 'users.read', 'users.write'],
  },
  viewer: {
    label: 'ناظر (فقط مشاهده)',
    description: 'مشاهده‌ی محتوا، کاربران و گزارش‌ها بدون هیچ تغییری',
    permissions: ['content.read', 'users.read', 'audit.read'],
  },
};

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLES, value);

export const permissionsOf = (role: Role): Permission[] => ROLES[role].permissions;
