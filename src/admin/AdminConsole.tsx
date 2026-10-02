import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bus,
  ChevronDown,
  BookOpen,
  CheckSquare,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Compass,
  ArrowRight,
  Award,
  ShieldCheck,
  Sparkles,
  Users,
  UserCog,
  Video,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { toPersianDigits } from '../utils/helpers';
import { useBackLayer } from '../hooks/useBackLayer';
import { adminLogin, adminLogout, getAdminToken } from '../lib/api';
import { AdminPanel } from '../components/AdminPanel';
import { BrandMark } from '../components/BrandMark';
import { fetchMe, type AdminIdentity, type Permission } from './api';
import { Button, ErrorNote, Spinner, cx, errorText, inputClass } from './ui';
import { DashboardPage } from './pages/Dashboard';
import { MembersPage } from './pages/Members';
import { StaffPage } from './pages/Staff';
import { AuditPage } from './pages/Audit';
import { TripPage } from './pages/Trip';
import { CardOptimizer } from './CardOptimizer';
import type { CollectionName } from '../types/content';

export type Section =
  | 'dashboard'
  | 'members'
  | 'staff'
  | 'settings'
  | 'audit'
  | 'trip'
  | `content:${CollectionName}`;

const CONTENT_ITEMS: { id: CollectionName; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'stations', label: 'ایستگاه‌های تصمیم', icon: CheckSquare },
  { id: 'questions', label: 'پرسش‌های ارزیابی', icon: HelpCircle },
  { id: 'perimeters', label: 'دام‌های PERIMETERS', icon: Layers },
  { id: 'skills', label: 'شایستگی‌های رهبری', icon: Sparkles },
  { id: 'sonic', label: 'ابزارهای SONIC', icon: Zap },
  { id: 'people', label: 'الگوهای شخصیتی', icon: Users },
  { id: 'audioStories', label: 'روایت‌های صوتی', icon: Volume2 },
  { id: 'videos', label: 'ویدیوهای تحلیلی', icon: Video },
  { id: 'bookQA', label: 'پرسش‌های کتاب', icon: BookOpen },
  { id: 'challenges', label: 'چالش‌ها و سناریوها', icon: Award },
  { id: 'help', label: 'پیام‌های راهنما', icon: HelpCircle },
  { id: 'tour', label: 'اسلایدهای تور', icon: Compass },
  { id: 'learningSteps', label: 'مراحل یادگیری', icon: ArrowRight },
];

const collectionLabel = (id: string) => CONTENT_ITEMS.find((c) => c.id === id)?.label ?? id;

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر کل',
  editor: 'تولیدکننده‌ی محتوا',
  support: 'پشتیبان کاربران',
  viewer: 'ناظر',
};

interface NavGroup {
  title: string;
  items: { id: Section; label: string; icon: React.FC<{ className?: string }>; needs?: Permission }[];
}

const NAV: NavGroup[] = [
  { title: '', items: [{ id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard }] },
  { title: 'رویداد', items: [{ id: 'trip', label: 'کنترل سفر', icon: Bus, needs: 'trip.manage' }] },
  {
    title: 'محتوا',
    items: CONTENT_ITEMS.map((c) => ({ id: `content:${c.id}` as Section, label: c.label, icon: c.icon, needs: 'content.read' as Permission })),
  },
  {
    title: 'کاربران',
    items: [
      { id: 'members', label: 'کاربران سایت', icon: Users, needs: 'users.read' },
      { id: 'staff', label: 'مدیران و نقش‌ها', icon: UserCog, needs: 'staff.manage' },
    ],
  },
  {
    title: 'سامانه',
    items: [
      { id: 'settings', label: 'تنظیمات و ورود', icon: Globe, needs: 'content.read' },
      { id: 'audit', label: 'گزارش فعالیت', icon: Activity, needs: 'audit.read' },
    ],
  },
];

const readSection = (): Section => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return (hash || 'dashboard') as Section;
};

export const AdminConsole: React.FC<{ onBackToApp: () => void }> = ({ onBackToApp }) => {
  const [me, setMe] = useState<AdminIdentity | null>(null);
  const [checking, setChecking] = useState<boolean>(() => !!getAdminToken());
  const [loginError, setLoginError] = useState<string | null>(null);
  const [section, setSectionState] = useState<Section>(readSection);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useBackLayer(menuOpen, () => setMenuOpen(false));
  const [contentOpen, setContentOpen] = useState(() => readSection().startsWith('content:'));

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const go = useCallback((next: Section) => {
    window.location.hash = `/${next}`;
    setSectionState(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHash = () => setSectionState(readSection());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Resume an existing session.
  useEffect(() => {
    if (!getAdminToken()) return;
    fetchMe()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setMe(null);
      setLoginError('نشست شما منقضی شده است؛ دوباره وارد شوید.');
    };
    window.addEventListener('derang:session-expired', onExpired);
    return () => window.removeEventListener('derang:session-expired', onExpired);
  }, []);

  const can = useCallback((permission?: Permission) => !permission || !!me?.permissions.includes(permission), [me]);

  const logout = async () => {
    try {
      await adminLogout();
    } catch {
      // the local token is cleared either way
    }
    setMe(null);
  };

  const visibleNav = useMemo(
    () => NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.needs)) })).filter((g) => g.items.length > 0),
    [can]
  );

  if (checking) return <div className="min-h-screen bg-canvas"><Spinner /></div>;
  if (!me) {
    return (
      <SignIn
        initialError={loginError}
        onBackToApp={onBackToApp}
        onDone={async () => {
          try {
            setMe(await fetchMe());
            setLoginError(null);
          } catch (err) {
            setLoginError(errorText(err));
          }
        }}
      />
    );
  }

  const page = renderPage();

  function renderPage(): React.ReactNode {
    if (section === 'dashboard') return <DashboardPage me={me!} go={go} collectionLabel={collectionLabel} />;
    if (section === 'members') return can('users.read') ? <MembersPage canWrite={can('users.write')} notify={notify} /> : <Denied />;
    if (section === 'staff') return can('staff.manage') ? <StaffPage me={me!} notify={notify} /> : <Denied />;
    if (section === 'trip') return can('trip.manage') ? <TripPage notify={notify} /> : <Denied />;
    if (section === 'audit') return can('audit.read') ? <AuditPage /> : <Denied />;
    if (section === 'settings') {
      return (
        <AdminPanel
          key="settings"
          onBackToApp={onBackToApp}
          embedded={{ tab: 'site', canWrite: can('content.write'), canSettings: can('settings.write') }}
        />
      );
    }
    if (section.startsWith('content:')) {
      const id = section.slice('content:'.length) as CollectionName;
      if (!CONTENT_ITEMS.some((c) => c.id === id)) return <Denied />;
      return (
        <div>
          <h1 className="mb-1 text-xl font-extrabold text-ink sm:text-2xl">{collectionLabel(id)}</h1>
          <p className="mb-5 text-[13px] text-ink-3">
            {can('content.write') ? 'افزودن، ویرایش، ترتیب‌دهی و انتشار.' : 'فقط مشاهده؛ نقش شما اجازه‌ی ویرایش ندارد.'}
          </p>
          {id === 'people' && can('content.write') && <CardOptimizer />}
          <AdminPanel
            key={id}
            onBackToApp={onBackToApp}
            embedded={{ tab: id, canWrite: can('content.write'), canSettings: can('settings.write') }}
          />
        </div>
      );
    }
    return <Denied />;
  }

  const sidebar = (
    <nav aria-label="منوی مدیریت" className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <BrandMark className="h-9 w-9" />
        <div>
          <p className="text-sm font-extrabold text-ink">پنل مدیریت درنگ</p>
          <p className="text-xs text-ink-3">{ROLE_LABELS[me.role] ?? me.role}</p>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {visibleNav.map((group) => (
          <div key={group.title || 'top'}>
            {group.title === 'محتوا' ? (
              <button
                type="button"
                onClick={() => setContentOpen((o) => !o)}
                aria-expanded={contentOpen || section.startsWith('content:')}
                className="flex w-full items-center justify-between rounded-lg px-3 pb-1 text-xs font-bold text-ink-3 hover:text-ink"
              >
                <span>محتوا ({toPersianDigits(group.items.length)} بخش)</span>
                <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', (contentOpen || section.startsWith('content:')) && 'rotate-180')} />
              </button>
            ) : (
              group.title && <p className="px-3 pb-1 text-xs font-bold text-ink-3">{group.title}</p>
            )}
            <ul className={cx('space-y-0.5', group.title === 'محتوا' && !(contentOpen || section.startsWith('content:')) && 'hidden')}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-[13px] font-bold transition-colors',
                        active ? 'bg-primary text-surface shadow-sm' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-line p-3">
        <button type="button" onClick={onBackToApp} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-ink-2 hover:bg-surface-2">
          <ExternalLink className="h-4 w-4" />
          <span>مشاهده سایت</span>
        </button>
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
          <span className="truncate text-xs font-bold text-ink">{me.displayName}</span>
          <button type="button" onClick={logout} aria-label="خروج" className="rounded-lg p-1 text-ink-3 hover:text-danger">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas text-right">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 border-l border-line bg-surface lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="باز کردن منو" className="rounded-lg p-1.5 text-ink hover:bg-surface-2">
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-sm font-extrabold text-ink">پنل مدیریت درنگ</p>
        <span className="w-8" />
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-surface shadow-xl">
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="بستن منو" className="absolute left-2 top-2 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2">
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="lg:mr-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{page}</div>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-ink px-4 py-2.5 text-xs font-bold text-canvas shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

const Denied: React.FC = () => (
  <div className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-2">
    این بخش وجود ندارد یا نقش شما به آن دسترسی ندارد.
  </div>
);

const SignIn: React.FC<{ initialError: string | null; onBackToApp: () => void; onDone: () => void }> = ({ initialError, onBackToApp, onDone }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return setError('نام کاربری و رمز عبور را وارد کنید.');
    setBusy(true);
    setError(null);
    try {
      await adminLogin({ username: username.trim(), password });
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-right">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-md sm:p-8">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="mb-3 h-16 w-16" />
          <h1 className="text-xl font-extrabold text-ink">ورود به پنل مدیریت</h1>
          <p className="mt-1 text-xs text-ink-3">با حساب مدیریتی خود وارد شوید.</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink-2">نام کاربری</span>
          <input className={`${inputClass} text-left`} dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink-2">رمز عبور</span>
          <div className="relative">
            <input className={`${inputClass} pl-10 text-left`} dir="ltr" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="button" tabIndex={-1} onClick={() => setShow((s) => !s)} aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <ErrorNote message={error} />
        <Button variant="primary" type="submit" busy={busy} className="w-full py-2.5">ورود</Button>
        <Button className="w-full" onClick={onBackToApp}>بازگشت به سایت</Button>
      </form>
    </div>
  );
};
