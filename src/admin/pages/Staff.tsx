import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { createStaff, deleteStaff, listStaff, updateStaff, type AdminIdentity, type RoleInfo, type StaffMember } from '../api';
import { Badge, Button, Card, Dialog, EmptyState, ErrorNote, Field, PageHeader, Spinner, errorText, formatDate, inputClass } from '../ui';

const generatePassword = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};

export const StaffPage: React.FC<{ me: AdminIdentity; notify: (message: string) => void }> = ({ me, notify }) => {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [items, setItems] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    { kind: 'create' } | { kind: 'edit'; s: StaffMember } | { kind: 'password'; s: StaffMember } | { kind: 'delete'; s: StaffMember } | null
  >(null);

  const load = useCallback(async () => {
    try {
      const res = await listStaff();
      setRoles(res.roles);
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const roleLabel = (id: string) => roles.find((r) => r.id === id)?.label ?? id;
  const done = (message: string) => {
    setDialog(null);
    notify(message);
    void load();
  };

  return (
    <div>
      <PageHeader
        title="مدیران و نقش‌ها"
        subtitle="برای هر همکار یک حساب جدا بسازید و نقشش را مشخص کنید؛ هر نقش فقط به بخش‌های خودش دسترسی دارد و همه‌ی کارها در «گزارش فعالیت» ثبت می‌شود."
        actions={<Button variant="primary" onClick={() => setDialog({ kind: 'create' })} icon={<Plus className="h-3.5 w-3.5" />}>حساب جدید</Button>}
      />
      <ErrorNote message={error} />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {roles.map((r) => (
          <Card key={r.id} className="flex items-start gap-3 p-4">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Shield className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-bold text-ink">{r.label}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">{r.description}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="هنوز حسابی ساخته نشده است." hint="حساب اصلی شما (از تنظیمات Vercel) همیشه کار می‌کند. برای تولیدکننده‌ی محتوا یا پشتیبان، یک حساب با نقش مناسب بسازید." />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink">{s.displayName || s.username}</p>
                    <Badge tone="primary">{roleLabel(s.role)}</Badge>
                    {!s.active && <Badge tone="danger">غیرفعال</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-3">
                    <span className="font-mono" dir="ltr">{s.username}</span> · آخرین ورود: {formatDate(s.lastLoginAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button variant="ghost" onClick={() => setDialog({ kind: 'edit', s })} icon={<Pencil className="h-3.5 w-3.5" />}>ویرایش</Button>
                  <Button variant="ghost" onClick={() => setDialog({ kind: 'password', s })} icon={<KeyRound className="h-3.5 w-3.5" />}>رمز</Button>
                  {s.username.toLowerCase() !== me.username.toLowerCase() && (
                    <Button variant="ghost" className="text-danger-ink" onClick={() => setDialog({ kind: 'delete', s })} icon={<Trash2 className="h-3.5 w-3.5" />}>حذف</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-3">حساب اصلی (مدیر کل با نام کاربری و رمزی که در تنظیمات Vercel گذاشته‌اید) در این فهرست نمی‌آید و همیشه کار می‌کند.</p>

      {dialog?.kind === 'create' && <StaffForm roles={roles} onClose={() => setDialog(null)} onSaved={() => done('حساب ساخته شد.')} />}
      {dialog?.kind === 'edit' && <StaffForm roles={roles} staff={dialog.s} self={dialog.s.username.toLowerCase() === me.username.toLowerCase()} onClose={() => setDialog(null)} onSaved={() => done('تغییرات ذخیره شد.')} />}
      {dialog?.kind === 'password' && <StaffPassword s={dialog.s} onClose={() => setDialog(null)} onSaved={() => done('رمز تغییر کرد.')} />}
      {dialog?.kind === 'delete' && <StaffDelete s={dialog.s} onClose={() => setDialog(null)} onDeleted={() => done('حساب حذف شد.')} />}
    </div>
  );
};

const StaffForm: React.FC<{ roles: RoleInfo[]; staff?: StaffMember; self?: boolean; onClose: () => void; onSaved: () => void }> = ({ roles, staff, self, onClose, onSaved }) => {
  const [username, setUsername] = useState(staff?.username ?? '');
  const [displayName, setDisplayName] = useState(staff?.displayName ?? '');
  const [role, setRole] = useState(staff?.role ?? 'editor');
  const [active, setActive] = useState(staff?.active ?? true);
  const [password, setPassword] = useState(() => (staff ? '' : generatePassword()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (staff) await updateStaff(staff.id, { displayName, role, active });
      else await createStaff({ username, displayName, role, password });
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title={staff ? 'ویرایش حساب' : 'حساب مدیریتی جدید'} onClose={onClose} footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" busy={busy} onClick={save}>ذخیره</Button></>}>
      {!staff && (
        <Field label="نام کاربری" hint="انگلیسی، مثلاً ali.ahmadi">
          <input className={`${inputClass} text-left`} dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="off" />
        </Field>
      )}
      <Field label="نام نمایشی"><input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="مثلاً علی احمدی" /></Field>
      <Field label="نقش" hint={roles.find((r) => r.id === role)?.description}>
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} disabled={self}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </Field>
      {staff && (
        <label className="flex items-center gap-2 text-xs font-bold text-ink-2">
          <input type="checkbox" checked={active} disabled={self} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-primary" />
          حساب فعال باشد
        </label>
      )}
      {!staff && (
        <Field label="رمز عبور اولیه" hint="حداقل ۸ نویسه. رمز ساخته‌شده را همین‌جا کپی کنید و به همکارتان بدهید؛ بعداً دیده نمی‌شود.">
          <div className="flex gap-2">
            <input className={`${inputClass} text-left font-mono`} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            <Button onClick={() => setPassword(generatePassword())}>ساخت رمز</Button>
          </div>
        </Field>
      )}
      {self && <p className="text-xs text-ink-3">نقش و وضعیت حساب خودتان را نمی‌توانید تغییر دهید.</p>}
      <ErrorNote message={error} />
    </Dialog>
  );
};

const StaffPassword: React.FC<{ s: StaffMember; onClose: () => void; onSaved: () => void }> = ({ s, onClose, onSaved }) => {
  const [password, setPassword] = useState(generatePassword);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    try {
      await updateStaff(s.id, { password });
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Dialog title={`رمز جدید برای ${s.displayName || s.username}`} onClose={onClose} footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" busy={busy} onClick={save}>تغییر رمز</Button></>}>
      <p className="text-[13px] text-ink-3">با تغییر رمز، نشست‌های باز این حساب بسته می‌شود.</p>
      <Field label="رمز جدید (حداقل ۸ نویسه)">
        <div className="flex gap-2">
          <input className={`${inputClass} text-left font-mono`} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          <Button onClick={() => setPassword(generatePassword())}>ساخت رمز</Button>
        </div>
      </Field>
      <ErrorNote message={error} />
    </Dialog>
  );
};

const StaffDelete: React.FC<{ s: StaffMember; onClose: () => void; onDeleted: () => void }> = ({ s, onClose, onDeleted }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      await deleteStaff(s.id);
      onDeleted();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Dialog title="حذف حساب مدیریتی" onClose={onClose} footer={<><Button onClick={onClose}>انصراف</Button><Button variant="danger" busy={busy} onClick={run}>حذف شود</Button></>}>
      <p className="text-sm leading-relaxed text-ink">حساب «{s.displayName || s.username}» حذف و ورودش بسته می‌شود. اگر فقط می‌خواهید موقتاً بسته شود، آن را غیرفعال کنید.</p>
      <ErrorNote message={error} />
    </Dialog>
  );
};
