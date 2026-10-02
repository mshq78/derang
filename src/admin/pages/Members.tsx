import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, KeyRound, Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react';
import {
  createMember,
  deleteMember,
  importMembers,
  listMembers,
  updateMember,
  type ImportResult,
  type Member,
  type MemberInput,
  type MemberPage,
} from '../api';
import { Badge, Button, Card, Dialog, EmptyState, ErrorNote, Field, PageHeader, Spinner, errorText, formatDate, inputClass } from '../ui';
import { toPersianDigits } from '../../utils/helpers';
import { normalizeIranMobile, toLatinDigits } from '../../utils/phone';

const PAGE_SIZE = 25;

const fullName = (m: Pick<Member, 'firstName' | 'lastName'>) => `${m.firstName} ${m.lastName}`.trim();

export const MembersPage: React.FC<{ canWrite: boolean; notify: (message: string) => void }> = ({ canWrite, notify }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MemberPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<
    | { kind: 'create' }
    | { kind: 'edit'; member: Member }
    | { kind: 'password'; member: Member }
    | { kind: 'delete'; member: Member }
    | { kind: 'import' }
    | null
  >(null);
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => setPage(1), [debounced, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listMembers({ q: debounced, status, page, pageSize: PAGE_SIZE }));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [debounced, status, page]);
  useEffect(() => {
    void load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const exportCsv = async () => {
    try {
      const all: Member[] = [];
      for (let p = 1; ; p++) {
        const res = await listMembers({ q: debounced, status, page: p, pageSize: 1000 });
        all.push(...res.items);
        if (all.length >= res.total || res.items.length === 0) break;
      }
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const lines = [['شماره موبایل', 'نام', 'نام خانوادگی', 'وضعیت', 'آخرین ورود'].map(esc).join(',')].concat(
        all.map((m) =>
          [m.phone, m.firstName, m.lastName, m.disabled ? 'غیرفعال' : 'فعال', m.lastLoginAt ?? ''].map(esc).join(',')
        )
      );
      const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const toggleDisabled = async (m: Member) => {
    try {
      await updateMember(m.id, { disabled: !m.disabled });
      notify(m.disabled ? 'حساب فعال شد.' : 'حساب غیرفعال شد و از سایت خارج شد.');
      void load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="کاربران"
        subtitle="افرادی که با شماره موبایل و رمز عبور وارد سایت می‌شوند. کاربر غیرفعال دیگر نمی‌تواند وارد شود."
        actions={
          <>
            <Button onClick={exportCsv} icon={<Download className="h-3.5 w-3.5" />}>خروجی CSV</Button>
            {canWrite && (
              <>
                <Button onClick={() => setDialog({ kind: 'import' })} icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>
                  ورود گروهی از اکسل
                </Button>
                <Button variant="primary" onClick={() => setDialog({ kind: 'create' })} icon={<Plus className="h-3.5 w-3.5" />}>
                  کاربر جدید
                </Button>
              </>
            )}
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو با نام یا شماره موبایل..."
              className={`${inputClass} pr-9`}
              aria-label="جستجوی کاربران"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} sm:w-44`} aria-label="فیلتر وضعیت">
            <option value="">همه‌ی وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="disabled">غیرفعال</option>
            <option value="no_password">بدون رمز عبور</option>
            <option value="group1">گروه ۱</option>
            <option value="group2">گروه ۲</option>
            <option value="no_group">بدون گروه</option>
          </select>
        </div>

        {error && <div className="p-3"><ErrorNote message={error} /></div>}
        {loading && !data ? (
          <Spinner />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            title={debounced || status ? 'کاربری با این مشخصات پیدا نشد.' : 'هنوز کاربری ساخته نشده است.'}
            hint={debounced || status ? undefined : 'کاربران را یکی‌یکی بسازید یا فایل اکسل را یک‌جا وارد کنید.'}
            action={
              canWrite && !debounced && !status ? (
                <Button variant="primary" onClick={() => setDialog({ kind: 'import' })}>ورود گروهی از اکسل</Button>
              ) : undefined
            }
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-line bg-surface-2/60 text-xs text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">نام</th>
                    <th className="px-4 py-2.5 font-bold">شماره موبایل</th>
                    <th className="px-4 py-2.5 font-bold">گروه</th>
                    <th className="px-4 py-2.5 font-bold">وضعیت</th>
                    <th className="px-4 py-2.5 font-bold">آخرین ورود</th>
                    {canWrite && <th className="px-4 py-2.5 font-bold">عملیات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data?.items.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-2.5 font-bold text-ink">{fullName(m)}</td>
                      <td className="px-4 py-2.5 font-mono text-ink-2" dir="ltr">{toPersianDigits(m.phone)}</td>
                      <td className="px-4 py-2.5 text-xs text-ink-2">{m.tripGroup ? `گروه ${toPersianDigits(m.tripGroup)}` : '—'}</td>
                      <td className="px-4 py-2.5"><StatusBadges m={m} /></td>
                      <td className="px-4 py-2.5 text-xs text-ink-3">{formatDate(m.lastLoginAt)}</td>
                      {canWrite && (
                        <td className="px-4 py-2.5">
                          <RowActions m={m} setDialog={setDialog} toggleDisabled={toggleDisabled} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {data?.items.map((m) => (
                <li key={m.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink">{fullName(m)}</p>
                      <p className="font-mono text-xs text-ink-2" dir="ltr">{toPersianDigits(m.phone)}</p>
                    </div>
                    <StatusBadges m={m} />
                  </div>
                  <p className="text-xs text-ink-3">آخرین ورود: {formatDate(m.lastLoginAt)}</p>
                  {canWrite && <RowActions m={m} setDialog={setDialog} toggleDisabled={toggleDisabled} />}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-ink-3">
            <span>{toPersianDigits(data.total)} کاربر</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</Button>
              <span>{toPersianDigits(page)} از {toPersianDigits(pages)}</span>
              <Button variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>بعدی</Button>
            </div>
          </div>
        )}
      </Card>

      {dialog?.kind === 'create' && (
        <MemberFormDialog
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            notify('کاربر ساخته شد.');
            void load();
          }}
        />
      )}
      {dialog?.kind === 'edit' && (
        <MemberFormDialog
          member={dialog.member}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            notify('تغییرات ذخیره شد.');
            void load();
          }}
        />
      )}
      {dialog?.kind === 'password' && (
        <PasswordDialog
          member={dialog.member}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            notify('رمز عبور تغییر کرد.');
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteDialog
          member={dialog.member}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            setDialog(null);
            notify('کاربر حذف شد.');
            void load();
          }}
        />
      )}
      {dialog?.kind === 'import' && (
        <ImportDialog
          onClose={() => setDialog(null)}
          onDone={(summary) => {
            notify(summary);
            void load();
          }}
        />
      )}
    </div>
  );
};

const StatusBadges: React.FC<{ m: Member }> = ({ m }) => (
  <div className="flex flex-wrap gap-1">
    {m.disabled ? <Badge tone="danger">غیرفعال</Badge> : <Badge tone="success">فعال</Badge>}
    {m.tripGroup && <Badge tone="primary">گروه {toPersianDigits(m.tripGroup)}</Badge>}
    {!m.hasPassword && <Badge tone="warning">بدون رمز</Badge>}
  </div>
);

const RowActions: React.FC<{
  m: Member;
  setDialog: (d: { kind: 'edit' | 'password' | 'delete'; member: Member }) => void;
  toggleDisabled: (m: Member) => void;
}> = ({ m, setDialog, toggleDisabled }) => (
  <div className="flex flex-wrap items-center gap-1">
    <Button variant="ghost" onClick={() => setDialog({ kind: 'edit', member: m })} icon={<Pencil className="h-3.5 w-3.5" />}>ویرایش</Button>
    <Button variant="ghost" onClick={() => setDialog({ kind: 'password', member: m })} icon={<KeyRound className="h-3.5 w-3.5" />}>رمز</Button>
    <Button variant="ghost" onClick={() => toggleDisabled(m)} icon={m.disabled ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}>
      {m.disabled ? 'فعال‌سازی' : 'غیرفعال'}
    </Button>
    <Button variant="ghost" className="text-danger-ink" onClick={() => setDialog({ kind: 'delete', member: m })} icon={<Trash2 className="h-3.5 w-3.5" />}>حذف</Button>
  </div>
);

const MemberFormDialog: React.FC<{ member?: Member; onClose: () => void; onSaved: () => void }> = ({ member, onClose, onSaved }) => {
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [firstName, setFirstName] = useState(member?.firstName ?? '');
  const [lastName, setLastName] = useState(member?.lastName ?? '');
  const [password, setPassword] = useState('');
  const [tripGroup, setTripGroup] = useState(member?.tripGroup ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!normalizeIranMobile(phone)) return setError('شماره موبایل معتبر نیست؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷.');
    if (!firstName.trim()) return setError('نام را وارد کنید.');
    if (!member && !password.trim()) return setError('رمز عبور را وارد کنید.');
    setBusy(true);
    setError(null);
    try {
      if (member) await updateMember(member.id, { phone, firstName, lastName, tripGroup: tripGroup || null });
      else await createMember({ phone, firstName, lastName, password, tripGroup: tripGroup || null });
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={member ? 'ویرایش کاربر' : 'کاربر جدید'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" busy={busy} onClick={save}>ذخیره</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="نام"><input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus /></Field>
        <Field label="نام خانوادگی"><input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
      </div>
      <Field label="شماره موبایل (نام کاربری)" hint="با صفر یا بدون صفر اول، هر دو درست است.">
        <input className={`${inputClass} text-left`} dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" />
      </Field>
      <Field label="گروه سفر" hint="فقط اعضای گروه، بازی سفر را می‌بینند.">
        <select className={inputClass} value={tripGroup} onChange={(e) => setTripGroup(e.target.value)}>
          <option value="">بدون گروه</option>
          <option value="1">گروه ۱</option>
          <option value="2">گروه ۲</option>
        </select>
      </Field>
      {!member && (
        <Field label="رمز عبور" hint="مثلاً کد ملی. بعد از ذخیره قابل مشاهده نیست.">
          <input className={`${inputClass} text-left`} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
        </Field>
      )}
      <ErrorNote message={error} />
    </Dialog>
  );
};

const PasswordDialog: React.FC<{ member: Member; onClose: () => void; onSaved: () => void }> = ({ member, onClose, onSaved }) => {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!password.trim()) return setError('رمز جدید را وارد کنید.');
    setBusy(true);
    try {
      await updateMember(member.id, { password });
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Dialog title={`رمز جدید برای ${fullName(member)}`} onClose={onClose} footer={<><Button onClick={onClose}>انصراف</Button><Button variant="primary" busy={busy} onClick={save}>تغییر رمز</Button></>}>
      <p className="text-[13px] text-ink-3">با تغییر رمز، نشست‌های باز این کاربر بسته می‌شود.</p>
      <Field label="رمز عبور جدید"><input className={`${inputClass} text-left`} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" autoFocus /></Field>
      <ErrorNote message={error} />
    </Dialog>
  );
};

const DeleteDialog: React.FC<{ member: Member; onClose: () => void; onDeleted: () => void }> = ({ member, onClose, onDeleted }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      await deleteMember(member.id);
      onDeleted();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Dialog title="حذف کاربر" onClose={onClose} footer={<><Button onClick={onClose}>انصراف</Button><Button variant="danger" busy={busy} onClick={run}>حذف شود</Button></>}>
      <p className="text-sm leading-relaxed text-ink">
        «{fullName(member)}» ({toPersianDigits(member.phone)}) برای همیشه حذف می‌شود. اگر فقط می‌خواهید ورودش بسته شود، «غیرفعال» را بزنید.
      </p>
      <ErrorNote message={error} />
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Bulk import from Excel / CSV with column mapping
// ---------------------------------------------------------------------------

type Field4 = 'phone' | 'password' | 'firstName' | 'lastName' | 'group1' | 'group2';
const FIELD_LABELS: Record<Field4, string> = {
  phone: 'شماره موبایل (نام کاربری)',
  password: 'رمز عبور',
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  group1: 'ستون گروه ۱ (هر کس علامت دارد)',
  group2: 'ستون گروه ۲ (هر کس علامت دارد)',
};

/** Picks a likely column for each field from the header text. */
function guessMapping(header: string[]): Record<Field4, number> {
  const norm = (s: string) => s.replace(/[\s‌_:()]+/g, '').toLowerCase();
  const idx = (test: (h: string) => boolean) => header.findIndex((h) => test(norm(h)));
  const lastName = idx((h) => h.includes('خانوادگی') || h.includes('lastname') || h.includes('family'));
  const password = idx((h) => h.includes('پرسنلی') || h.includes('کدملی') || h.includes('رمز') || h.includes('password') || h.includes('passcode'));
  const phone = idx((h) => h.includes('موبایل') || h.includes('همراه') || h.includes('تلفن') || h.includes('mobile') || h.includes('phone') || h === 'شماره');
  let firstName = idx((h) => h === 'نام' || h.includes('firstname') || h === 'name');
  if (firstName < 0) firstName = idx((h) => h.includes('نام') && !h.includes('خانوادگی') && !h.includes('کاربری'));
  const group1 = idx((h) => h.includes('گروهیک') || h.includes('گروه1') || h.includes('گروه۱'));
  const group2 = idx((h) => h.includes('گروهدو') || h.includes('گروه2') || h.includes('گروه۲'));
  return { phone, password, firstName, lastName, group1, group2 };
}

async function readTable(file: File): Promise<string[][]> {
  let rows: unknown[][];
  if (/\.xlsx$/i.test(file.name)) {
    const mod = await import('read-excel-file/browser');
    const sheets = await mod.default(file);
    rows = sheets[0]?.data ?? [];
  } else {
    const text = (await file.text()).replace(/^﻿/, '');
    rows = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(/[,\t;،]/));
  }
  return rows.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c).trim())));
}

const ImportDialog: React.FC<{ onClose: () => void; onDone: (summary: string) => void }> = ({ onClose, onDone }) => {
  const [table, setTable] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<Field4, number>>({ phone: -1, password: -1, firstName: -1, lastName: -1, group1: -1, group2: -1 });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(ImportResult & { rejectedRows: string[] }) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const columns = table ? Math.max(0, ...table.slice(0, 20).map((r) => r.length)) : 0;
  const header = table && hasHeader ? table[0] ?? [] : [];
  const columnLabel = (i: number) => (hasHeader && header[i] ? header[i].replace(/\s+/g, ' ') : `ستون ${toPersianDigits(i + 1)}`);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const rows = await readTable(file);
      if (rows.length === 0) return setError('فایل خالی است.');
      setTable(rows);
      setFileName(file.name);
      const looksLikeHeader = normalizeIranMobile(rows[0].find((c) => normalizeIranMobile(c)) ?? '') === null;
      setHasHeader(looksLikeHeader);
      setMapping(looksLikeHeader ? guessMapping(rows[0]) : { phone: 0, password: 1, firstName: 2, lastName: 3, group1: -1, group2: -1 });
    } catch (err) {
      setError(`فایل خوانده نشد: ${errorText(err)}`);
    }
  };

  const dataRows = useMemo(() => (table ? table.slice(hasHeader ? 1 : 0) : []), [table, hasHeader]);
  const built: MemberInput[] = useMemo(
    () =>
      dataRows.map((r) => ({
        phone: mapping.phone >= 0 ? toLatinDigits(r[mapping.phone] ?? '') : '',
        password: mapping.password >= 0 ? (r[mapping.password] ?? '') : '',
        firstName: mapping.firstName >= 0 ? (r[mapping.firstName] ?? '') : '',
        lastName: mapping.lastName >= 0 ? (r[mapping.lastName] ?? '') : '',
        tripGroup:
          mapping.group1 >= 0 && (r[mapping.group1] ?? '').trim()
            ? '1'
            : mapping.group2 >= 0 && (r[mapping.group2] ?? '').trim()
              ? '2'
              : null,
      })),
    [dataRows, mapping]
  );
  const valid = built.filter((b) => normalizeIranMobile(b.phone) && b.password && b.firstName);
  const mappingOk = mapping.phone >= 0 && mapping.password >= 0 && mapping.firstName >= 0;

  const run = async () => {
    setBusy(true);
    setError(null);
    let created = 0;
    let updated = 0;
    const rejected: string[] = [];
    try {
      for (let i = 0; i < valid.length; i += 40) {
        const res = await importMembers(valid.slice(i, i + 40));
        created += res.created;
        updated += res.updated;
        res.rejected.forEach((r) => rejected.push(`${toPersianDigits(i + r.row)}: ${r.reason}`));
        setProgress(Math.min(valid.length, i + 40));
      }
      setResult({ created, updated, rejected: [], rejectedRows: rejected });
      onDone(`${toPersianDigits(created)} کاربر ساخته و ${toPersianDigits(updated)} کاربر به‌روز شد.`);
    } catch (err) {
      setError(`${errorText(err)} (تا اینجا ${toPersianDigits(created)} ساخته و ${toPersianDigits(updated)} به‌روز شد)`);
    } finally {
      setBusy(false);
    }
  };

  const skipped = built.length - valid.length;

  return (
    <Dialog
      wide
      title="ورود گروهی کاربران از اکسل"
      onClose={busy ? () => undefined : onClose}
      footer={
        result ? (
          <Button variant="primary" onClick={onClose}>بستن</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={busy}>انصراف</Button>
            <Button variant="primary" busy={busy} disabled={!table || !mappingOk || valid.length === 0} onClick={run}>
              {`ساخت ${toPersianDigits(valid.length)} حساب`}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3">
          <p className="text-sm font-bold text-success-ink">
            {toPersianDigits(result.created)} کاربر ساخته و {toPersianDigits(result.updated)} کاربر به‌روز شد.
          </p>
          {result.rejectedRows.length > 0 && (
            <div className="rounded-xl bg-warning-soft p-3 text-[13px] text-warning-ink">ردشده‌ها: {result.rejectedRows.join('؛ ')}</div>
          )}
        </div>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-ink-3">
            فایل اکسل (xlsx) یا CSV را انتخاب کنید. شماره‌ی موبایل می‌شود نام کاربری، و ستونی که انتخاب می‌کنید (مثلاً کد ملی) رمز عبور.
            اگر شماره‌ای از قبل باشد، نام و رمزش به‌روز می‌شود.
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          <Button onClick={() => fileRef.current?.click()} icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>
            {table ? `تغییر فایل (${fileName})` : 'انتخاب فایل'}
          </Button>
          <ErrorNote message={error} />

          {table && (
            <>
              <label className="flex items-center gap-2 text-xs font-bold text-ink-2">
                <input type="checkbox" checked={hasHeader} onChange={(e) => { setHasHeader(e.target.checked); if (e.target.checked) setMapping(guessMapping(table[0])); }} className="h-4 w-4 accent-primary" />
                ردیف اول عنوان ستون‌هاست
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(Object.keys(FIELD_LABELS) as Field4[]).map((f) => (
                  <Field key={f} label={FIELD_LABELS[f] + (f === 'lastName' || f === 'group1' || f === 'group2' ? ' (اختیاری)' : '')}>
                    <select className={inputClass} value={mapping[f]} onChange={(e) => setMapping((m) => ({ ...m, [f]: Number(e.target.value) }))}>
                      <option value={-1}>— انتخاب کنید —</option>
                      {Array.from({ length: columns }, (_, i) => (
                        <option key={i} value={i}>{columnLabel(i)}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-bold text-ink-2">پیش‌نمایش ({toPersianDigits(dataRows.length)} ردیف)</p>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-surface-2 text-ink-3">
                      <tr><th className="px-3 py-2">موبایل</th><th className="px-3 py-2">رمز</th><th className="px-3 py-2">نام</th><th className="px-3 py-2">نام خانوادگی</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {built.slice(0, 5).map((b, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-mono" dir="ltr">{b.phone}</td>
                          <td className="px-3 py-1.5 font-mono" dir="ltr">{b.password ? '•'.repeat(Math.min(8, b.password.length)) : ''}</td>
                          <td className="px-3 py-1.5">{b.firstName}</td>
                          <td className="px-3 py-1.5">{b.lastName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mappingOk && skipped > 0 && (
                  <p className="mt-2 text-[13px] text-warning-ink">
                    {toPersianDigits(skipped)} ردیف شماره‌ی معتبر، رمز یا نام ندارد و نادیده گرفته می‌شود.
                  </p>
                )}
                {busy && <p className="mt-2 text-xs text-ink-3">در حال ساخت حساب‌ها... {toPersianDigits(progress)} از {toPersianDigits(valid.length)}</p>}
              </div>
            </>
          )}
        </>
      )}
    </Dialog>
  );
};
