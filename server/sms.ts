import { ApiError } from './http.js';

/**
 * Sends the one-time login code by SMS through the provider named in
 * SMS_PROVIDER. Supported: kavenegar, smsir, custom (any HTTP API) and
 * console (prints the code to the server log; refused in production).
 */

export class SmsError extends Error {}

const TIMEOUT_MS = 8000;

export interface SmsStatus {
  provider: string | null;
  configured: boolean;
  missing: string[];
}

const REQUIRED_ENV: Record<string, string[]> = {
  kavenegar: ['KAVENEGAR_API_KEY', 'KAVENEGAR_TEMPLATE'],
  smsir: ['SMSIR_API_KEY', 'SMSIR_TEMPLATE_ID'],
  custom: ['SMS_HTTP_URL'],
  console: [],
};

function providerName(): string | null {
  return (process.env.SMS_PROVIDER || '').trim().toLowerCase() || null;
}

function consoleAllowed(): boolean {
  return process.env.VERCEL_ENV !== 'production';
}

export function smsStatus(): SmsStatus {
  const provider = providerName();
  if (!provider) return { provider: null, configured: false, missing: ['SMS_PROVIDER'] };
  const required = REQUIRED_ENV[provider];
  if (!required) {
    return { provider, configured: false, missing: ['SMS_PROVIDER (مقدار پشتیبانی‌نشده)'] };
  }
  if (provider === 'console' && !consoleAllowed()) {
    return { provider, configured: false, missing: ['حالت console روی سایت اصلی مجاز نیست'] };
  }
  const missing = required.filter((name) => !process.env[name]);
  return { provider, configured: missing.length === 0, missing };
}

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new SmsError('سامانه پیامکی در مهلت مقرر پاسخ نداد.');
    }
    throw new SmsError('اتصال به سامانه پیامکی برقرار نشد.');
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(res: Response): Promise<{ text: string; json: unknown }> {
  const text = (await res.text()).slice(0, 4000);
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

const shorten = (value: unknown) => String(value ?? '').slice(0, 200);

async function sendKavenegar(phone: string, code: string): Promise<void> {
  const base = process.env.KAVENEGAR_BASE_URL || 'https://api.kavenegar.com';
  const key = encodeURIComponent(process.env.KAVENEGAR_API_KEY!);
  const body = new URLSearchParams({
    receptor: phone,
    token: code,
    template: process.env.KAVENEGAR_TEMPLATE!,
  });
  const res = await timedFetch(`${base}/v1/${key}/verify/lookup.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const { text, json } = await readBody(res);
  const result = (json as { return?: { status?: number; message?: string } } | null)?.return;
  if (!res.ok || result?.status !== 200) {
    throw new SmsError(`کاوه‌نگار: ${shorten(result?.message || text) || res.status}`);
  }
}

async function sendSmsIr(phone: string, code: string): Promise<void> {
  const base = process.env.SMSIR_BASE_URL || 'https://api.sms.ir';
  const res = await timedFetch(`${base}/v1/send/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY': process.env.SMSIR_API_KEY!,
    },
    body: JSON.stringify({
      mobile: phone.slice(1), // 9123456789, the form used in the provider's docs
      templateId: Number(process.env.SMSIR_TEMPLATE_ID),
      parameters: [{ name: process.env.SMSIR_PARAM_NAME || 'Code', value: code }],
    }),
  });
  const { text, json } = await readBody(res);
  const result = json as { status?: number; message?: string } | null;
  if (!res.ok || result?.status !== 1) {
    throw new SmsError(`SMS.ir: ${shorten(result?.message || text) || res.status}`);
  }
}

type Escape = 'json' | 'url' | 'none';

function fillTemplate(template: string, vars: Record<string, string>, escape: Escape): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = vars[name];
    if (value === undefined) return match;
    if (escape === 'json') return JSON.stringify(value).slice(1, -1);
    if (escape === 'url') return encodeURIComponent(value);
    return value;
  });
}

/**
 * Generic HTTP provider. Placeholders in SMS_HTTP_URL / SMS_HTTP_BODY:
 * {{phone}} 09123456789, {{phone10}} 9123456789, {{phone98}} 989123456789,
 * {{code}} and {{message}} (SMS_MESSAGE with {{code}} filled in).
 */
async function sendCustom(phone: string, code: string): Promise<void> {
  const messageTemplate = process.env.SMS_MESSAGE || 'کد ورود شما به درنگ: {{code}}';
  const vars: Record<string, string> = {
    phone,
    phone10: phone.slice(1),
    phone98: `98${phone.slice(1)}`,
    code,
    message: fillTemplate(messageTemplate, { code }, 'none'),
  };

  const method = (process.env.SMS_HTTP_METHOD || 'POST').toUpperCase();
  const format = (process.env.SMS_HTTP_FORMAT || 'json').toLowerCase();
  const url = fillTemplate(process.env.SMS_HTTP_URL!, vars, 'url');

  let headers: Record<string, string> = {};
  if (process.env.SMS_HTTP_HEADERS) {
    try {
      headers = JSON.parse(process.env.SMS_HTTP_HEADERS) as Record<string, string>;
    } catch {
      throw new SmsError('SMS_HTTP_HEADERS باید یک شیء JSON معتبر باشد.');
    }
  }

  const init: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    const bodyTemplate = process.env.SMS_HTTP_BODY || '';
    if (format === 'form') {
      init.body = fillTemplate(bodyTemplate, vars, 'url');
      headers['Content-Type'] ??= 'application/x-www-form-urlencoded';
    } else {
      init.body = fillTemplate(bodyTemplate, vars, 'json');
      headers['Content-Type'] ??= 'application/json';
    }
  }

  const res = await timedFetch(url, init);
  const { text } = await readBody(res);
  const mustContain = process.env.SMS_HTTP_SUCCESS_MATCH;
  if (!res.ok || (mustContain && !text.includes(mustContain))) {
    throw new SmsError(`پاسخ سامانه پیامکی (${res.status}): ${shorten(text)}`);
  }
}

/** Sends the OTP SMS. Throws SmsError (with a message safe to show an admin). */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const status = smsStatus();
  if (!status.configured) {
    throw new SmsError(`سامانه پیامکی تنظیم نشده است (${status.missing.join('، ')}).`);
  }
  switch (status.provider) {
    case 'kavenegar':
      return sendKavenegar(phone, code);
    case 'smsir':
      return sendSmsIr(phone, code);
    case 'custom':
      return sendCustom(phone, code);
    case 'console':
      console.log(`[sms:console] ${phone} code=${code}`);
      return;
  }
}

/** Maps an SMS failure to the generic error shown to visitors; details stay in the server log. */
export function smsFailure(err: unknown): ApiError {
  console.error('[sms] send failed:', err instanceof Error ? err.message : err);
  return new ApiError(502, 'sms_failed', 'ارسال پیامک انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.');
}
