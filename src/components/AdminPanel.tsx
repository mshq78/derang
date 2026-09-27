import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Globe,
  HelpCircle,
  BookOpen,
  Volume2,
  Video,
  Layers,
  Sparkles,
  Users,
  Compass,
  CheckSquare,
  Award,
  Zap,
} from 'lucide-react';
import {
  ContentBundle,
  SiteSettings,
  CollectionName,
  CollectionItem,
  CollectionItemMap,
  Station,
} from '../types/content';
import { DEFAULT_CONTENT } from '../data/defaultContent';
import {
  adminLogin,
  adminLogout,
  adminGetContent,
  adminUpdateSite,
  adminAddItem,
  adminUpdateItem,
  adminDeleteItem,
  adminReorderCollection,
  adminUploadMedia,
  adminImportContent,
  getAdminToken,
} from '../lib/api';
import { toPersianDigits } from '../utils/helpers';
import { Modal } from './Modal';

interface AdminPanelProps {
  onBackToApp: () => void;
}

type AdminTab = 'site' | CollectionName;
type FormRecord = Record<string, string | number | boolean | string[] | undefined>;

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToApp }) => {
  const [content, setContent] = useState<ContentBundle>(DEFAULT_CONTENT);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => !!getAdminToken());
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);
  // Editing is blocked until real data has loaded, so a failed or pending load
  // can never overwrite the database with the bundled defaults.
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active collection tab
  const [activeTab, setActiveTab] = useState<AdminTab>('site');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editingItem, setEditingItem] = useState<{
    collection: AdminTab;
    data: CollectionItem | null;
    isNew: boolean;
  } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    collection: CollectionName;
    id: string;
    title: string;
  } | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportBundle, setPendingImportBundle] = useState<ContentBundle | null>(null);
  const [importConfirmText, setImportConfirmText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load admin content from /api/admin/content
  const loadAdminData = useCallback(async (sandbox = isSandboxMode) => {
    setIsLoading(true);
    try {
      const bundle = await adminGetContent(sandbox);
      setContent(bundle);
      setIsOnline(!sandbox);
      setHasLoaded(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری محتوای مدیریت.';
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isSandboxMode]);

  // Listen for session expiration events
  useEffect(() => {
    const handleExpired = () => {
      setIsAdmin(false);
      setHasLoaded(false);
      setIsSandboxMode(false);
      setLoginError('نشست شما منقضی شده است؛ دوباره وارد شوید.');
    };
    window.addEventListener('derang:session-expired', handleExpired);
    return () => window.removeEventListener('derang:session-expired', handleExpired);
  }, []);

  // Load content when logged in
  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, loadAdminData]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await adminLogin({
        username: username.trim(),
        password: password.trim(),
      });
      setIsSandboxMode(false);
      setIsAdmin(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'نام کاربری یا رمز عبور اشتباه است.';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Enter dev sandbox mode (DEV only)
  const handleEnterSandbox = () => {
    if (!import.meta.env.DEV) return;
    setIsSandboxMode(true);
    setIsAdmin(true);
    setLoginError(null);
    showToast('حالت پیش‌نمایش (Dev Sandbox) فعال شد.');
  };

  // Handle Logout
  const handleLogout = async () => {
    if (!isSandboxMode) {
      try {
        await adminLogout();
      } catch {
        // ignore
      }
    }
    setIsAdmin(false);
    setHasLoaded(false);
    setIsSandboxMode(false);
    showToast('با موفقیت خارج شدید.');
  };

  // Update Site Settings
  const handleSaveSiteSettings = async (newSettings: SiteSettings) => {
    try {
      const saved = await adminUpdateSite(newSettings, isSandboxMode);
      setContent((prev) => ({
        ...prev,
        site: saved,
        updatedAt: new Date().toISOString(),
      }));
      showToast('تنظیمات سامانه با موفقیت ذخیره شد.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
      showError(`ذخیره نشد: ${msg}`);
    }
  };

  // Reordering helper
  const handleMove = async (collection: CollectionName, index: number, direction: 'up' | 'down') => {
    const list = [...(content[collection] as CollectionItem[])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const orderedIds = list.map((item) => item.id);
    try {
      const res = await adminReorderCollection(collection, orderedIds, isSandboxMode);
      setContent((prev) => ({
        ...prev,
        [collection]: res.items || list,
        updatedAt: new Date().toISOString(),
      }));
      showToast('ترتیب موارد به‌روزرسانی شد.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
      showError(`ذخیره نشد: ${msg}`);
    }
  };

  // Toggle Publish helper
  const handleTogglePublish = async (collection: CollectionName, item: CollectionItem) => {
    const updated = { ...item, isPublished: !item.isPublished };
    try {
      const saved = await adminUpdateItem(collection, item.id, updated, isSandboxMode);
      setContent((prev) => ({
        ...prev,
        [collection]: (prev[collection] as CollectionItem[]).map((x) =>
          x.id === item.id ? saved : x
        ),
        updatedAt: new Date().toISOString(),
      }));
      showToast(
        updated.isPublished ? 'مورد با موفقیت منتشر شد.' : 'مورد به حالت پیش‌نویس درآمد.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
      showError(`ذخیره نشد: ${msg}`);
    }
  };

  // Delete item helper
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { collection, id } = deleteConfirm;
    try {
      await adminDeleteItem(collection, id, isSandboxMode);
      setContent((prev) => ({
        ...prev,
        [collection]: (prev[collection] as CollectionItem[]).filter((x) => x.id !== id),
        updatedAt: new Date().toISOString(),
      }));
      showToast('مورد با موفقیت حذف شد.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
      showError(`ذخیره نشد: ${msg}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute(
      'download',
      `derang-content-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Handle File Pick for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validate top-level keys
        const requiredKeys = [
          'version',
          'updatedAt',
          'site',
          'stations',
          'questions',
          'perimeters',
          'skills',
          'sonic',
          'people',
          'audioStories',
          'videos',
          'bookQA',
          'challenges',
          'help',
          'tour',
          'learningSteps',
        ];

        for (const k of requiredKeys) {
          if (!(k in parsed)) {
            showError(`کلید الزامی "${k}" در فایل پشتیبان یافت نشد.`);
            return;
          }
        }

        const collections: CollectionName[] = [
          'stations',
          'questions',
          'perimeters',
          'skills',
          'sonic',
          'people',
          'audioStories',
          'videos',
          'bookQA',
          'challenges',
          'help',
          'tour',
          'learningSteps',
        ];

        for (const col of collections) {
          if (!Array.isArray(parsed[col])) {
            showError(`مجموعه "${col}" در فایل پشتیبان معتبر نیست (باید آرایه باشد).`);
            return;
          }
        }

        setPendingImportBundle(parsed as ContentBundle);
        setImportConfirmText('');
        setImportError(null);
        setShowImportModal(true);
      } catch {
        showError('فایل انتخاب‌شده یک JSON معتبر نیست.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Import
  const handleConfirmImport = async () => {
    if (!pendingImportBundle) return;
    if (importConfirmText.trim() !== 'تایید' && importConfirmText.trim() !== 'تأیید') {
      setImportError('لطفاً عبارت «تایید» را دقیقاً وارد کنید.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      await adminImportContent(pendingImportBundle, isSandboxMode);
      setContent(pendingImportBundle);
      setShowImportModal(false);
      setPendingImportBundle(null);
      showToast('محتوای سامانه با موفقیت بازیابی شد.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای سرور در بارگذاری محتوا.';
      setImportError(`ذخیره نشد: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Navigation tabs configuration
  const tabs: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'site', label: 'تنظیمات عمومی سایت', icon: Globe },
    { id: 'stations', label: 'ایستگاه‌های تصمیم', icon: CheckSquare, count: content.stations.length },
    { id: 'questions', label: 'پرسش‌های ارزیابی', icon: HelpCircle, count: content.questions.length },
    { id: 'perimeters', label: 'دام‌های PERIMETERS', icon: Layers, count: content.perimeters.length },
    { id: 'skills', label: 'شایستگی‌های رهبری', icon: Sparkles, count: content.skills.length },
    { id: 'sonic', label: 'ابزارهای SONIC', icon: Zap, count: content.sonic.length },
    { id: 'people', label: 'الگوهای شخصیتی', icon: Users, count: content.people.length },
    { id: 'audioStories', label: 'روایت‌های صوتی', icon: Volume2, count: content.audioStories.length },
    { id: 'videos', label: 'ویدیوهای تحلیلی', icon: Video, count: content.videos.length },
    { id: 'bookQA', label: 'پرسش‌های کتاب', icon: BookOpen, count: content.bookQA.length },
    { id: 'challenges', label: 'چالش‌ها و سناریوها', icon: Award, count: content.challenges.length },
    { id: 'help', label: 'پیام‌های راهنما', icon: HelpCircle, count: content.help.length },
    { id: 'tour', label: 'اسلایدهای تور', icon: Compass, count: content.tour.length },
    { id: 'learningSteps', label: 'مراحل یادگیری', icon: ArrowRight, count: content.learningSteps.length },
  ];

  // If not admin, show Login screen
  if (!isAdmin) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-md text-right">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary mb-3">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-extrabold text-ink">ورود به پنل مدیریت محتوا</h1>
            <p className="mt-1 text-xs text-ink-3">
              ویرایش ایستگاه‌ها، سوالات، تله‌های شناختی، داستان‌ها و تنظیمات سامانه
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1.5">
                نام کاربری
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="نام کاربری مدیر..."
                  className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 pl-10 text-sm text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none"
                  autoFocus
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1.5">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور مدیر..."
                  className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 pl-10 text-sm text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="rounded-xl bg-danger-soft p-3 text-xs font-bold text-danger border border-danger/20 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-surface hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoggingIn ? 'در حال ورود...' : 'ورود به پنل مدیریت'}
            </button>

            {import.meta.env.DEV && (
              <div className="pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={handleEnterSandbox}
                  className="w-full rounded-xl border border-line bg-surface-2 py-2 text-xs font-bold text-ink-2 hover:bg-surface hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>ورود به حالت پیش‌نمایش (Dev Sandbox)</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onBackToApp}
              className="w-full rounded-xl border border-line py-2 text-xs font-bold text-ink-2 hover:bg-surface-2 transition-colors"
            >
              بازگشت به برنامه
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="flex flex-col gap-6 text-right pb-16 max-w-5xl mx-auto px-4 sm:px-6 pt-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-ink px-4 py-2.5 text-xs font-bold text-canvas shadow-lg border border-line-strong flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Red Error Message */}
      {errorMessage && (
        <div className="rounded-2xl bg-danger-soft p-4 text-xs font-bold text-danger border border-danger/30 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-danger hover:underline font-normal text-xs"
          >
            بستن
          </button>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header Card */}
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-black text-ink">
                پنل مدیریت محتوای سامانه {content.site.brandName}
              </h1>
            </div>
            <p className="mt-1 text-xs text-ink-3">
              نسخه محتوا: <span className="font-mono text-ink-2">{content.version}</span> · آخرین به‌روزرسانی:{' '}
              <span className="font-mono text-ink-2">
                {new Date(content.updatedAt).toLocaleDateString('fa-IR')}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                isOnline
                  ? 'bg-success-soft text-success-ink border border-success/20'
                  : 'bg-warning-soft text-warning-ink border border-warning/20'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-success' : 'bg-warning'}`} />
              <span>{isOnline ? 'متصل به سرور ابری' : 'حالت پیش‌نمایش / محلی'}</span>
            </span>

            <button
              onClick={onBackToApp}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface transition-colors"
            >
              <span>مشاهده سایت</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-danger/20 bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger hover:text-surface transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
              title="پشتیبان‌گیری از تمام داده‌ها"
            >
              <Download className="h-3.5 w-3.5" />
              <span>خروجی JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
              title="بارگذاری فایل پشتیبان JSON"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>بازیابی از فایل JSON</span>
            </button>
          </div>

          {activeTab !== 'site' && (
            <button
              onClick={() =>
                setEditingItem({
                  collection: activeTab,
                  data: null,
                  isNew: true,
                })
              }
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-surface hover:bg-primary-hover transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>افزودن مورد جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation (Scrollable on mobile) */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-line">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-primary text-surface shadow-sm'
                  : 'bg-surface border border-line text-ink-2 hover:text-ink hover:bg-surface-2'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-xs font-mono ${
                    isActive ? 'bg-surface/20 text-surface' : 'bg-surface-2 text-ink-3'
                  }`}
                >
                  {toPersianDigits(tab.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!hasLoaded && (
        <div className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-ink-2 shadow-sm">
          {isLoading ? (
            'در حال دریافت محتوا از سرور...'
          ) : (
            <div className="space-y-3">
              <p>محتوا از سرور دریافت نشد؛ تا وقتی داده‌ها بارگذاری نشوند ویرایش ممکن نیست.</p>
              <button
                onClick={() => loadAdminData()}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover"
              >
                تلاش دوباره
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Site Settings */}
      {hasLoaded && activeTab === 'site' && (
        <SiteSettingsEditor
          key={content.version}
          settings={content.site}
          onSave={handleSaveSiteSettings}
        />
      )}

      {/* TAB CONTENT: Collections */}
      {hasLoaded && activeTab !== 'site' && (
        <div className="space-y-3">
          {/* Search bar for items */}
          <div className="relative">
            <input
              type="text"
              placeholder={`جستجو در بین ${tabs.find((t) => t.id === activeTab)?.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none shadow-sm"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          </div>

          <CollectionList
            collection={activeTab as CollectionName}
            items={(content[activeTab as CollectionName] as CollectionItem[]) || []}
            searchQuery={searchQuery}
            onEdit={(item) =>
              setEditingItem({
                collection: activeTab,
                data: item,
                isNew: false,
              })
            }
            onDelete={(item) =>
              setDeleteConfirm({
                collection: activeTab as CollectionName,
                id: item.id,
                title: getItemTitle(activeTab as CollectionName, item),
              })
            }
            onTogglePublish={(item) => handleTogglePublish(activeTab as CollectionName, item)}
            onMoveUp={(idx) => handleMove(activeTab as CollectionName, idx, 'up')}
            onMoveDown={(idx) => handleMove(activeTab as CollectionName, idx, 'down')}
          />
        </div>
      )}

      {/* ITEM EDITOR MODAL */}
      {editingItem && (
        <ItemEditorModal
          collection={editingItem.collection as CollectionName}
          item={editingItem.data}
          isNew={editingItem.isNew}
          stations={content.stations}
          isSandbox={isSandboxMode}
          onClose={() => setEditingItem(null)}
          onSave={async (savedData) => {
            try {
              if (editingItem.isNew) {
                const created = await adminAddItem(
                  editingItem.collection as CollectionName,
                  savedData as unknown as Omit<CollectionItem, 'id' | 'sortOrder'>,
                  isSandboxMode
                );
                setContent((prev) => ({
                  ...prev,
                  [editingItem.collection as CollectionName]: [
                    ...(prev[editingItem.collection as CollectionName] as CollectionItem[]),
                    created,
                  ],
                  updatedAt: new Date().toISOString(),
                }));
                showToast('مورد جدید با موفقیت اضافه شد.');
              } else if (editingItem.data) {
                const updated = await adminUpdateItem(
                  editingItem.collection as CollectionName,
                  editingItem.data.id,
                  { ...editingItem.data, ...savedData } as CollectionItem,
                  isSandboxMode
                );
                setContent((prev) => ({
                  ...prev,
                  [editingItem.collection as CollectionName]: (
                    prev[editingItem.collection as CollectionName] as CollectionItem[]
                  ).map((x) => (x.id === editingItem.data!.id ? updated : x)),
                  updatedAt: new Date().toISOString(),
                }));
                showToast('تغییرات با موفقیت ذخیره شد.');
              }
              setEditingItem(null);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
              showError(`ذخیره نشد: ${msg}`);
            }
          }}
        />
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <Modal
          onClose={() => setDeleteConfirm(null)}
          title="تأیید حذف مورد"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-right">
            <p className="text-sm text-ink-2 leading-relaxed">
              آیا از حذف <strong className="text-ink">«{deleteConfirm.title}»</strong> مطمئن هستید؟ این عمل غیرقابل بازگشت است.
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-line px-3.5 py-1.5 text-xs font-bold text-ink-2 hover:bg-surface-2"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-xl bg-danger px-4 py-1.5 text-xs font-bold text-surface hover:bg-danger/90 shadow-sm"
              >
                حذف قطعی
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* IMPORT CONFIRMATION MODAL */}
      {showImportModal && pendingImportBundle && (
        <Modal
          onClose={() => {
            if (!isImporting) {
              setShowImportModal(false);
              setPendingImportBundle(null);
            }
          }}
          title="تأیید بازیابی داده‌های پشتیبان"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-right">
            <div className="rounded-2xl bg-danger-soft p-3.5 text-xs text-danger font-bold border border-danger/20 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>هشدار: تمام داده‌های فعلی با محتوای این فایل جایگزین خواهند شد.</span>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed">
              تعداد ایستگاه‌ها: <strong className="text-ink">{pendingImportBundle.stations?.length || 0}</strong> ·{' '}
              تعداد سوالات: <strong className="text-ink">{pendingImportBundle.questions?.length || 0}</strong> ·{' '}
              نسخه: <span className="font-mono text-ink font-bold">{pendingImportBundle.version}</span>
            </p>

            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1.5">
                برای تأیید نهایی، لطفاً عبارت <span className="text-danger font-black">«تایید»</span> را در کادر زیر تایپ کنید:
              </label>
              <input
                type="text"
                value={importConfirmText}
                onChange={(e) => setImportConfirmText(e.target.value)}
                placeholder="تایید"
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none text-center font-bold"
                autoFocus
              />
            </div>

            {importError && (
              <p className="text-xs font-bold text-danger">{importError}</p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  setShowImportModal(false);
                  setPendingImportBundle(null);
                }}
                className="rounded-xl border border-line px-3.5 py-1.5 text-xs font-bold text-ink-2 hover:bg-surface-2"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isImporting || (importConfirmText.trim() !== 'تایید' && importConfirmText.trim() !== 'تأیید')}
                onClick={handleConfirmImport}
                className="rounded-xl bg-danger px-4 py-1.5 text-xs font-bold text-surface hover:bg-danger/90 shadow-sm disabled:opacity-40"
              >
                {isImporting ? 'در حال بازیابی...' : 'تأیید و جایگزینی کامل'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Helper: Get user-friendly title for collection item
function getItemTitle(collection: CollectionName, item: CollectionItem): string {
  if (!item) return '';
  switch (collection) {
    case 'stations':
      return (item as Station).title || '';
    case 'questions': {
      const q = item as import('../types/content').Question;
      return q.text ? q.text.substring(0, 45) + '...' : '';
    }
    case 'perimeters': {
      const p = item as import('../types/content').Perimeter;
      return `${p.fa} (${p.en})`;
    }
    case 'skills':
      return (item as import('../types/content').Skill).name || '';
    case 'sonic': {
      const s = item as import('../types/content').SonicTool;
      return `${s.letter} - ${s.fa}`;
    }
    case 'people':
      return (item as import('../types/content').Person).name || '';
    case 'audioStories':
    case 'videos':
    case 'tour':
    case 'learningSteps':
      return (item as { title: string }).title || '';
    case 'bookQA':
    case 'challenges': {
      const c = item as { q?: string };
      return c.q ? c.q.substring(0, 45) + '...' : '';
    }
    case 'help': {
      const h = item as import('../types/content').HelpEntry;
      return `${h.screen}: ${h.title}`;
    }
    default:
      return item.id || '';
  }
}

// --------------------------------------------------------------------------
// Collection List Component
// --------------------------------------------------------------------------
interface CollectionListProps {
  collection: CollectionName;
  items: CollectionItem[];
  searchQuery: string;
  onEdit: (item: CollectionItem) => void;
  onDelete: (item: CollectionItem) => void;
  onTogglePublish: (item: CollectionItem) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const CollectionList: React.FC<CollectionListProps> = ({
  collection,
  items,
  searchQuery,
  onEdit,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
}) => {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const title = getItemTitle(collection, item).toLowerCase();
      const rec = item as unknown as Record<string, string>;
      const desc = (rec.desc || rec.help || rec.a || rec.body || '').toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [items, collection, searchQuery]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 text-center text-xs text-ink-3">
        هیچ موردی یافت نشد.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {filtered.map((item, index) => {
        const title = getItemTitle(collection, item);
        const rec = item as unknown as Record<string, string | boolean>;
        const sub =
          (rec.desc as string) ||
          (rec.help as string) ||
          (rec.a as string) ||
          (rec.reflectionQuestion as string) ||
          (rec.body as string) ||
          (rec.why as string) ||
          '';

        return (
          <div
            key={item.id}
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
              item.isPublished
                ? 'border-line bg-surface'
                : 'border-line-strong bg-surface-2/60 opacity-75'
            }`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-mono font-bold text-ink-3">
                {toPersianDigits(item.sortOrder || index + 1)}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-ink truncate">{title}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      item.isPublished
                        ? 'bg-success-soft text-success-ink'
                        : 'bg-surface-2 text-ink-3'
                    }`}
                  >
                    {item.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                  </span>
                  {'critical' in item && Boolean((item as { critical?: boolean }).critical) && (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                      حیاتی
                    </span>
                  )}
                  {'stationId' in item && Boolean((item as { stationId?: string }).stationId) && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                      {(item as { stationId?: string }).stationId}
                    </span>
                  )}
                </div>
                {sub && (
                  <p className="mt-1 text-xs text-ink-3 line-clamp-1 leading-relaxed">
                    {sub}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
              {/* Move buttons */}
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className="rounded-lg p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 disabled:opacity-20"
                title="حرکت به بالا"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={index === items.length - 1}
                className="rounded-lg p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 disabled:opacity-20"
                title="حرکت به پایین"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>

              {/* Publish Toggle */}
              <button
                type="button"
                onClick={() => onTogglePublish(item)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-colors ${
                  item.isPublished
                    ? 'border border-line bg-surface text-ink-2 hover:bg-surface-2'
                    : 'bg-success text-surface hover:bg-success/90'
                }`}
              >
                {item.isPublished ? 'تعلیق' : 'انتشار'}
              </button>

              {/* Edit */}
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink hover:bg-surface-2 transition-colors flex items-center gap-1"
              >
                <Edit2 className="h-3 w-3" />
                <span>ویرایش</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="rounded-xl border border-line bg-surface p-1.5 text-ink-3 hover:text-danger hover:border-danger/30 transition-colors"
                title="حذف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --------------------------------------------------------------------------
// Site Settings Editor Component
// --------------------------------------------------------------------------
interface SiteSettingsEditorProps {
  settings: SiteSettings;
  onSave: (settings: SiteSettings) => Promise<void>;
}

const SiteSettingsEditor: React.FC<SiteSettingsEditorProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<SiteSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = <K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWhyChange = <K extends keyof SiteSettings['whyPage']>(
    subfield: K,
    value: SiteSettings['whyPage'][K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      whyPage: { ...prev.whyPage, [subfield]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Brand & Identity */}
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-ink border-b border-line pb-2 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span>هویت بصری و برند سامانه</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">نام برند</label>
            <input
              type="text"
              value={formData.brandName}
              onChange={(e) => handleChange('brandName', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">نام سازمان / پردیس</label>
            <input
              type="text"
              value={formData.orgName}
              onChange={(e) => handleChange('orgName', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">شعار برند (Tagline)</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink-2 mb-1">پیام پایان و بدرقه (Farewell)</label>
          <textarea
            rows={2}
            value={formData.farewellText}
            onChange={(e) => handleChange('farewellText', e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Hero & Onboarding Settings */}
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-ink border-b border-line pb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>تنظیمات صفحه اصلی و خوش‌آمدگویی</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">تیتر کوچک هیرو (Kicker)</label>
            <input
              type="text"
              value={formData.heroKicker}
              onChange={(e) => handleChange('heroKicker', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">عنوان هیرو (Hero Title)</label>
            <input
              type="text"
              value={formData.heroTitle}
              onChange={(e) => handleChange('heroTitle', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink-2 mb-1">زیرعنوان هیرو (Hero Subtitle)</label>
          <textarea
            rows={2}
            value={formData.heroSubtitle}
            onChange={(e) => handleChange('heroSubtitle', e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">عنوان خوش‌آمدگویی (Onboarding)</label>
            <input
              type="text"
              value={formData.onboardingTitle}
              onChange={(e) => handleChange('onboardingTitle', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">زیرعنوان خوش‌آمدگویی</label>
            <input
              type="text"
              value={formData.onboardingSubtitle}
              onChange={(e) => handleChange('onboardingSubtitle', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* External Test Integration Settings */}
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-ink border-b border-line pb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>تنظیمات آزمون خارجی شخصیت‌شناسی (External Test)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">عنوان بنر آزمون</label>
            <input
              type="text"
              value={formData.externalTestTitle}
              onChange={(e) => handleChange('externalTestTitle', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">عنوان دکمه</label>
            <input
              type="text"
              value={formData.externalTestButton}
              onChange={(e) => handleChange('externalTestButton', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink-2 mb-1">زیرعنوان بنر آزمون</label>
          <input
            type="text"
            value={formData.externalTestSubtitle}
            onChange={(e) => handleChange('externalTestSubtitle', e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-ink-2 mb-1">آدرس اینترنتی آزمون (URL)</label>
          <input
            type="url"
            dir="ltr"
            value={formData.externalTestUrl}
            onChange={(e) => handleChange('externalTestUrl', e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Why Page Content */}
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-ink border-b border-line pb-2 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span>محتوای صفحه «چرا درنگ؟»</span>
        </h3>

        <div>
          <label className="block text-xs font-bold text-ink-2 mb-1">مقدمه صفحه (Intro)</label>
          <textarea
            rows={3}
            value={formData.whyPage.intro}
            onChange={(e) => handleWhyChange('intro', e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">عنوان بخش هدف غایی</label>
            <input
              type="text"
              value={formData.whyPage.goalTitle}
              onChange={(e) => handleWhyChange('goalTitle', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1">متن بخش هدف غایی</label>
            <textarea
              rows={2}
              value={formData.whyPage.goalText}
              onChange={(e) => handleWhyChange('goalText', e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-2xl bg-primary px-6 py-2.5 text-xs font-bold text-surface hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? 'در حال ذخیره...' : 'ذخیره تمام تنظیمات سایت'}
        </button>
      </div>
    </form>
  );
};

// --------------------------------------------------------------------------
// Item Editor Modal Component
// --------------------------------------------------------------------------
interface ItemEditorModalProps {
  collection: CollectionName;
  item: CollectionItem | null;
  isNew: boolean;
  stations: Station[];
  isSandbox: boolean;
  onClose: () => void;
  onSave: (data: FormRecord) => Promise<void>;
}

const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  collection,
  item,
  isNew,
  stations,
  isSandbox,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<FormRecord>(() => {
    if (item) return { ...item } as unknown as FormRecord;
    switch (collection) {
      case 'stations':
        return { title: '', desc: '', isPublished: true };
      case 'questions':
        return {
          stationId: stations[0]?.id || 'station-1',
          text: '',
          help: '',
          exercise: '',
          critical: false,
          isPublished: true,
        };
      case 'perimeters':
        return {
          tag: 'P',
          en: '',
          fa: '',
          desc: '',
          question: '',
          solution: '',
          isPublished: true,
        };
      case 'skills':
        return { name: '', desc: '', isPublished: true };
      case 'sonic':
        return { letter: 'S', en: '', fa: '', tool: '', desc: '', isPublished: true };
      case 'people':
        return {
          name: '',
          title: '',
          strength: '',
          shadow: '',
          reflectionQuestion: '',
          quote: '',
          colorBg: 'bg-warning-soft',
          colorPrimary: 'text-warning-ink',
          imageUrl: '',
          backImageUrl: '',
          isPublished: true,
        };
      case 'audioStories':
        return {
          title: '',
          subtitle: '',
          durationSeconds: 180,
          tags: ['راهبردی'],
          desc: '',
          transcript: '',
          takeaway: '',
          audioUrl: '',
          isPublished: true,
        };
      case 'videos':
        return {
          title: '',
          badge: 'ویدئوی تحلیلی',
          desc: '',
          videoUrl: '',
          posterUrl: '',
          quote: '',
          reflectionQuestion: '',
          whyImportant: '',
          showOnStories: true,
          isPublished: true,
        };
      case 'bookQA':
        return {
          category: 'مفاهیم پایه',
          q: '',
          a: '',
          task: '',
          ref: '',
          isPublished: true,
        };
      case 'challenges':
        return {
          type: 'دام‌یاب',
          q: '',
          opts: ['', '', '', ''],
          ans: 0,
          why: '',
          isPublished: true,
        };
      case 'help':
        return { screen: 'home', title: '', body: '', tip: '', isPublished: true };
      case 'tour':
        return {
          title: '',
          desc: '',
          icon: 'Compass',
          tone: 'primary',
          isPublished: true,
        };
      case 'learningSteps':
        return {
          screen: 'why',
          title: '',
          desc: '',
          isPublished: true,
        };
      default:
        return { isPublished: true };
    }
  });

  const valStr = (k: string, fallback = ''): string => {
    const val = form[k];
    return typeof val === 'string' ? val : fallback;
  };

  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    kind: 'audio' | 'video' | 'image'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setUploadError(null);

    try {
      const res = await adminUploadMedia(
        file,
        kind,
        (percent) => setUploadProgress(percent),
        isSandbox
      );
      setForm((prev) => ({ ...prev, [field]: res.url }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری فایل';
      setUploadError(msg);
    } finally {
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(form);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={isNew ? `افزودن به ${collection}` : `ویرایش مورد`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {uploadError && (
          <div className="rounded-xl bg-danger-soft p-3 text-xs font-bold text-danger border border-danger/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Collection specific fields */}
        {collection === 'stations' && (
          <>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">عنوان ایستگاه</label>
              <input
                type="text"
                required
                value={valStr('title')}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">توضیحات ایستگاه</label>
              <textarea
                rows={3}
                required
                value={valStr('desc')}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </>
        )}

        {collection === 'questions' && (
          <>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">ایستگاه مربوطه</label>
              <select
                value={valStr('stationId')}
                onChange={(e) => setForm({ ...form, stationId: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              >
                {stations.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    ایستگاه {toPersianDigits(idx + 1)}: {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">متن سؤال چک‌لیست</label>
              <textarea
                rows={2}
                required
                value={valStr('text')}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">راهنمای سوال (این سوال یعنی چه؟)</label>
              <textarea
                rows={2}
                required
                value={valStr('help')}
                onChange={(e) => setForm({ ...form, help: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">تمرین ۶۰ ثانیه‌ای</label>
              <textarea
                rows={2}
                required
                value={valStr('exercise')}
                onChange={(e) => setForm({ ...form, exercise: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="criticalCheck"
                checked={!!form.critical}
                onChange={(e) => setForm({ ...form, critical: e.target.checked })}
                className="h-4 w-4 rounded text-danger focus:ring-danger"
              />
              <label htmlFor="criticalCheck" className="text-xs font-bold text-danger cursor-pointer">
                این سؤال یک شاخص حیاتی (Critical) است و پاسخ خیر به آن نیاز به تدبیر فوری دارد.
              </label>
            </div>
          </>
        )}

        {collection === 'perimeters' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">حرف مخفف (Tag)</label>
                <input
                  type="text"
                  maxLength={2}
                  required
                  value={valStr('tag')}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">عنوان انگلیسی</label>
                <input
                  type="text"
                  required
                  value={valStr('en')}
                  onChange={(e) => setForm({ ...form, en: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">عنوان فارسی دام شناختی</label>
              <input
                type="text"
                required
                value={valStr('fa')}
                onChange={(e) => setForm({ ...form, fa: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">شرح دام شناختی</label>
              <textarea
                rows={2}
                required
                value={valStr('desc')}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">پرسش مکث (سنجش خود)</label>
              <textarea
                rows={2}
                required
                value={valStr('question')}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">راهکار مهار و بیداری</label>
              <textarea
                rows={2}
                required
                value={valStr('solution')}
                onChange={(e) => setForm({ ...form, solution: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </>
        )}

        {collection === 'skills' && (
          <>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">نام شایستگی</label>
              <input
                type="text"
                required
                value={valStr('name')}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">شرح شایستگی رهبری</label>
              <textarea
                rows={3}
                required
                value={valStr('desc')}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </>
        )}

        {collection === 'sonic' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">حرف SONIC</label>
                <input
                  type="text"
                  maxLength={1}
                  required
                  value={valStr('letter')}
                  onChange={(e) => setForm({ ...form, letter: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">عنوان انگلیسی ابزار</label>
                <input
                  type="text"
                  required
                  value={valStr('en')}
                  onChange={(e) => setForm({ ...form, en: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">عنوان فارسی اقدام</label>
                <input
                  type="text"
                  required
                  value={valStr('fa')}
                  onChange={(e) => setForm({ ...form, fa: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">نام ابزار کاربردی</label>
                <input
                  type="text"
                  required
                  value={valStr('tool')}
                  onChange={(e) => setForm({ ...form, tool: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">شرح و نحوه اجرای ابزار</label>
              <textarea
                rows={3}
                required
                value={valStr('desc')}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </>
        )}

        {collection === 'people' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">نام شخصیت</label>
                <input
                  type="text"
                  required
                  value={valStr('name')}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">عنوان الگوی تصمیم</label>
                <input
                  type="text"
                  required
                  value={valStr('title')}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">نقطه قوت اصلی</label>
              <textarea
                rows={2}
                required
                value={valStr('strength')}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">سایه و نقطه ضعف (روی دیگر قوت)</label>
              <textarea
                rows={2}
                required
                value={valStr('shadow')}
                onChange={(e) => setForm({ ...form, shadow: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">پرسش تأمل‌برانگیز</label>
              <textarea
                rows={2}
                required
                value={valStr('reflectionQuestion')}
                onChange={(e) => setForm({ ...form, reflectionQuestion: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">نقل‌قول ماندگار</label>
              <input
                type="text"
                required
                value={valStr('quote')}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">تصویر روی کارت، نقطه قوت (اختیاری)</label>
              <div className="flex gap-2">
                {valStr('imageUrl') && (
                  <img
                    src={valStr('imageUrl')}
                    alt=""
                    className="h-9 w-9 flex-shrink-0 rounded-lg border border-line object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <input
                  type="text"
                  dir="ltr"
                  placeholder="https://... یا انتخاب فایل"
                  value={valStr('imageUrl')}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
                <label className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>آپلود</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'imageUrl', 'image')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">تصویر پشت کارت، سایه (اختیاری)</label>
              <div className="flex gap-2">
                {valStr('backImageUrl') && (
                  <img
                    src={valStr('backImageUrl')}
                    alt=""
                    className="h-9 w-9 flex-shrink-0 rounded-lg border border-line object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <input
                  type="text"
                  dir="ltr"
                  placeholder="https://... یا انتخاب فایل"
                  value={valStr('backImageUrl')}
                  onChange={(e) => setForm({ ...form, backImageUrl: e.target.value })}
                  className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
                <label className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>آپلود</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'backImageUrl', 'image')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            {uploadProgress !== null && (
              <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </>
        )}

        {collection === 'audioStories' && (
          <>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">عنوان داستان صوتی</label>
              <input
                type="text"
                required
                value={valStr('title')}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">زیرعنوان</label>
                <input
                  type="text"
                  required
                  value={valStr('subtitle')}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">مدت زمان به ثانیه</label>
                <input
                  type="number"
                  min={10}
                  required
                  value={typeof form.durationSeconds === 'number' ? form.durationSeconds : 180}
                  onChange={(e) => setForm({ ...form, durationSeconds: parseInt(e.target.value, 10) || 0 })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">فایل صوتی</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://... یا انتخاب فایل صوتی"
                  value={valStr('audioUrl')}
                  onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
                  className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
                <label className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>آپلود صوت</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileUpload(e, 'audioUrl', 'audio')}
                    className="hidden"
                  />
                </label>
              </div>
              {uploadProgress !== null && (
                <div className="mt-1.5 h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">خلاصه روایت</label>
              <textarea
                rows={2}
                required
                value={valStr('desc')}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">رونوشت کامل (متن پادکست)</label>
              <textarea
                rows={4}
                required
                value={valStr('transcript')}
                onChange={(e) => setForm({ ...form, transcript: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">پیام کلیدی (Takeaway)</label>
              <textarea
                rows={2}
                required
                value={valStr('takeaway')}
                onChange={(e) => setForm({ ...form, takeaway: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </>
        )}

        {collection === 'videos' && (
          <>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">عنوان ویدیو</label>
              <input
                type="text"
                required
                value={valStr('title')}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">برچسب (Badge)</label>
                <input
                  type="text"
                  required
                  value={valStr('badge')}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">آدرس ویدیو (MP4 یا آپارات/یوتیوب)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="https://..."
                    value={valStr('videoUrl')}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                  />
                  <label className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileUpload(e, 'videoUrl', 'video')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">تصویر کاور ویدیو (Poster URL)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://..."
                  value={valStr('posterUrl')}
                  onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                  className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
                <label className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'posterUrl', 'image')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">توضیحات ویدیو</label>
              <textarea
                rows={2}
                required
                value={valStr('desc')}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">نقل‌قول یا پیام محوری</label>
              <input
                type="text"
                required
                value={valStr('quote')}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">پرسش تأمل‌برانگیز</label>
              <textarea
                rows={2}
                required
                value={valStr('reflectionQuestion')}
                onChange={(e) => setForm({ ...form, reflectionQuestion: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">چرا این ویدیو مهم است؟</label>
              <textarea
                rows={2}
                required
                value={valStr('whyImportant')}
                onChange={(e) => setForm({ ...form, whyImportant: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="showOnStoriesCheck"
                checked={!!form.showOnStories}
                onChange={(e) => setForm({ ...form, showOnStories: e.target.checked })}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
              <label htmlFor="showOnStoriesCheck" className="text-xs font-bold text-ink cursor-pointer">
                نمایش این ویدیو در صفحه عبرت‌ها و روایت‌های زنده (Stories)
              </label>
            </div>
          </>
        )}

        {collection === 'bookQA' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">دسته‌بندی موضوعی</label>
                <input
                  type="text"
                  required
                  value={valStr('category')}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">ارجاع کتاب (فصل / بخش)</label>
                <input
                  type="text"
                  required
                  value={valStr('ref')}
                  onChange={(e) => setForm({ ...form, ref: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">متن پرسش</label>
              <input
                type="text"
                required
                value={valStr('q')}
                onChange={(e) => setForm({ ...form, q: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">پاسخ تفصیلی</label>
              <textarea
                rows={3}
                required
                value={valStr('a')}
                onChange={(e) => setForm({ ...form, a: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">تمرین ۶۰ ثانیه‌ای</label>
              <textarea
                rows={2}
                required
                value={valStr('task')}
                onChange={(e) => setForm({ ...form, task: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </>
        )}

        {collection === 'challenges' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">نوع چالش</label>
                <input
                  type="text"
                  required
                  value={valStr('type')}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">شماره گزینه صحیح (۰ تا ۳)</label>
                <select
                  value={typeof form.ans === 'number' ? form.ans : 0}
                  onChange={(e) => setForm({ ...form, ans: parseInt(e.target.value, 10) || 0 })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                >
                  <option value={0}>گزینه ۱ (اندیس ۰)</option>
                  <option value={1}>گزینه ۲ (اندیس ۱)</option>
                  <option value={2}>گزینه ۳ (اندیس ۲)</option>
                  <option value={3}>گزینه ۴ (اندیس ۳)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">صورت سناریو / چالش</label>
              <textarea
                rows={3}
                required
                value={valStr('q')}
                onChange={(e) => setForm({ ...form, q: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink-2">گزینه‌ها</label>
              {((form.opts as string[] | undefined) || ['', '', '', '']).map((opt: string, i: number) => (
                <input
                  key={i}
                  type="text"
                  required
                  placeholder={`گزینه ${toPersianDigits(i + 1)}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...(((form.opts as string[] | undefined) || ['', '', '', '']))];
                    newOpts[i] = e.target.value;
                    setForm({ ...form, opts: newOpts });
                  }}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                />
              ))}
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">علت و تحلیل پاسخ درست</label>
              <textarea
                rows={2}
                required
                value={valStr('why')}
                onChange={(e) => setForm({ ...form, why: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </>
        )}

        {collection === 'help' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">شناسه صفحه (screen)</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={valStr('screen')}
                  onChange={(e) => setForm({ ...form, screen: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">عنوان راهنما</label>
                <input
                  type="text"
                  required
                  value={valStr('title')}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">متن راهنما</label>
              <textarea
                rows={3}
                required
                value={valStr('body')}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">نکته کلیدی (Tip)</label>
              <textarea
                rows={2}
                required
                value={valStr('tip')}
                onChange={(e) => setForm({ ...form, tip: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </>
        )}

        {collection === 'tour' && (
          <>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">عنوان اسلاید</label>
              <input
                type="text"
                required
                value={valStr('title')}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">توضیح اسلاید</label>
              <textarea
                rows={3}
                required
                value={valStr('desc')}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">آیکون</label>
                <select
                  value={valStr('icon', 'Compass')}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                >
                  <option value="CheckSquare">CheckSquare</option>
                  <option value="Compass">Compass</option>
                  <option value="HelpCircle">HelpCircle</option>
                  <option value="Layers">Layers</option>
                  <option value="BookOpen">BookOpen</option>
                  <option value="Sparkles">Sparkles</option>
                  <option value="Award">Award</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-2 mb-1">رنگ تم (Tone)</label>
                <select
                  value={valStr('tone', 'primary')}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
                >
                  <option value="primary">primary</option>
                  <option value="success">success</option>
                  <option value="warning">warning</option>
                  <option value="accent">accent</option>
                </select>
              </div>
            </div>
          </>
        )}

        {collection === 'learningSteps' && (
          <>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">عنوان مرحله</label>
              <input
                type="text"
                required
                value={valStr('title')}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">توضیحات کوتاه</label>
              <textarea
                rows={2}
                required
                value={valStr('desc')}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1">صفحه مقصد</label>
              <select
                value={valStr('screen', 'why')}
                onChange={(e) => setForm({ ...form, screen: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none font-mono"
              >
                <option value="why">why</option>
                <option value="perimeters">perimeters</option>
                <option value="skills">skills</option>
                <option value="sonic">sonic</option>
                <option value="people">people</option>
                <option value="stories">stories</option>
                <option value="challenge">challenge</option>
              </select>
            </div>
          </>
        )}

        {/* Publish checkbox */}
        <div className="flex items-center gap-2 border-t border-line pt-3">
          <input
            type="checkbox"
            id="publishedStatus"
            checked={!!form.isPublished}
            onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            className="h-4 w-4 rounded text-primary focus:ring-primary"
          />
          <label htmlFor="publishedStatus" className="text-xs font-bold text-ink cursor-pointer">
            وضعیت: این مورد به صورت عمومی در سامانه منتشر شود
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-3.5 py-1.5 text-xs font-bold text-ink-2 hover:bg-surface-2"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
