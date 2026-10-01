import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import {
  AuthError,
  AuthUser,
  requestLoginCode,
  saveUserProfile,
  verifyLoginCode,
} from '../lib/userAuth';
import { toPersianDigits } from '../utils/helpers';
import { maskPhone, normalizeIranMobile, toLatinDigits } from '../utils/phone';

interface LoginScreenProps {
  brandName: string;
  orgName: string;
  onDone: (user: AuthUser) => void;
}

type Step = 'phone' | 'code' | 'profile';

const CODE_LENGTH = 6;

const inputClass =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-base text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary';
const primaryButton =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-surface shadow-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none transition-all';

export const LoginScreen: React.FC<LoginScreenProps> = ({ brandName, orgName, onDone }) => {
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const mainInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mainInputRef.current?.focus();
  }, [step]);

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendCode = async (target: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await requestLoginCode(target);
      setPhone(target);
      setCode('');
      setCooldown(res.resendAfterSeconds);
      setStep('code');
    } catch (err) {
      if (err instanceof AuthError && err.code === 'cooldown') {
        // A code was just sent to this number; let them enter it.
        setPhone(target);
        setCooldown(err.retryAfter ?? 60);
        setStep('code');
      }
      setError(err instanceof Error ? err.message : 'خطای ناشناخته');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeIranMobile(phoneInput);
    if (!normalized) {
      setError('شماره موبایل معتبر نیست؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷');
      return;
    }
    void sendCode(normalized);
  };

  const submitCode = useCallback(
    async (value: string) => {
      setError(null);
      setLoading(true);
      try {
        const verified = await verifyLoginCode(phone, value);
        if (verified.firstName) {
          onDone(verified);
        } else {
          setUser(verified);
          setStep('profile');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطای ناشناخته');
        setCode('');
        mainInputRef.current?.focus();
      } finally {
        setLoading(false);
      }
    },
    [phone, onDone]
  );

  const handleCodeChange = (value: string) => {
    const digits = toLatinDigits(value).replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !loading) void submitCode(digits);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('لطفاً نام خود را وارد کنید.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      onDone(await saveUserProfile(firstName.trim(), lastName.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای ناشناخته');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-right">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold text-surface shadow-sm">
            {brandName.charAt(0) || 'د'}
          </div>
          <span className="mb-1 text-[13px] font-bold text-primary">{orgName}</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            {step === 'profile' ? 'نام خود را بگویید' : `ورود یا ثبت‌نام در ${brandName}`}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-2">
            {step === 'phone' && 'شماره موبایل خود را وارد کنید تا کد تأیید برایتان پیامک شود.'}
            {step === 'code' && (
              <>
                کد {toPersianDigits(CODE_LENGTH)} رقمی ارسال‌شده به{' '}
                {/* The number must read left-to-right even inside right-to-left text. */}
                <bdi dir="ltr" className="font-bold text-ink">
                  {toPersianDigits(maskPhone(phone))}
                </bdi>{' '}
                را وارد کنید.
              </>
            )}
            {step === 'profile' && 'شماره شما تأیید شد. برای شخصی‌سازی گزارش‌ها، نام خود را وارد کنید.'}
          </p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-xs font-bold text-ink">
                شماره موبایل
              </label>
              <input
                id="phone"
                ref={mainInputRef}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                maxLength={20}
                placeholder="09123456789"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className={`${inputClass} text-left tracking-wider`}
              />
            </div>
            <button type="submit" disabled={loading} className={primaryButton}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
              <span>دریافت کد تأیید</span>
            </button>
          </form>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="otp" className="mb-1.5 block text-xs font-bold text-ink">
                کد تأیید
              </label>
              <input
                id="otp"
                ref={mainInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={CODE_LENGTH + 2}
                placeholder="------"
                value={code}
                disabled={loading}
                onChange={(e) => handleCodeChange(e.target.value)}
                className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`}
              />
            </div>
            <button
              type="button"
              disabled={loading || code.length !== CODE_LENGTH}
              onClick={() => void submitCode(code)}
              className={primaryButton}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>تأیید و ورود</span>
            </button>
            <div className="flex items-center justify-between text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('phone');
                }}
                className="flex items-center gap-1 text-ink-2 hover:text-ink"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>ویرایش شماره</span>
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={() => void sendCode(phone)}
                className="text-primary hover:text-primary-hover disabled:text-ink-3 disabled:pointer-events-none"
              >
                {cooldown > 0 ? `ارسال دوباره کد (${toPersianDigits(cooldown)})` : 'ارسال دوباره کد'}
              </button>
            </div>
          </div>
        )}

        {step === 'profile' && user && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-xs font-bold text-ink">
                نام شما
              </label>
              <input
                id="firstName"
                ref={mainInputRef}
                type="text"
                maxLength={40}
                autoComplete="given-name"
                placeholder="مثلاً: مریم یا آرش"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`${inputClass} text-right`}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-xs font-bold text-ink">
                نام خانوادگی <span className="font-normal text-ink-3">(اختیاری)</span>
              </label>
              <input
                id="lastName"
                type="text"
                maxLength={50}
                autoComplete="family-name"
                placeholder="مثلاً: نیک‌بخت"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`${inputClass} text-right`}
              />
            </div>
            <button type="submit" disabled={loading} className={primaryButton}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
              <span>شروع تجربه {brandName}</span>
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] font-bold text-danger-ink">
            {error}
          </p>
        )}

        <p className="mt-5 text-center text-[13px] leading-relaxed text-ink-3">
          شماره موبایل شما فقط برای ورود به حساب استفاده می‌شود. پرونده‌های تصمیم شما روی همین دستگاه نگه‌داری می‌شود.
        </p>
      </div>
    </div>
  );
};
