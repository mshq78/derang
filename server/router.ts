import { audit, listAudit } from './audit.js';
import { AdminSession, login, logout, publicAdmin, require as requirePermission, requireAdmin } from './auth.js';
import { dashboard } from './dashboard.js';
import { createMember, deleteMember, importMembers, listMembers, updateMember } from './people.js';
import { adjustPoints, adminTrip, clearSchedule, setSchedule, answerQuestion, listAdjustments, completeTask, isGroup, openNextStage, submitTest, tripState, undoLastOpen } from './trip.js';
import { createStaff, deleteStaff, listStaff, updateStaff } from './staff.js';
import {
  createItem,
  deleteItem,
  readBundle,
  reorderCollection,
  updateItem,
  updateSite,
  writeBundle,
} from './content.js';
import { ApiError, badRequest, errorResponse, json, noContent, notFound, readJson } from './http.js';
import { blobAccess, mediaRedirect } from './media.js';
import { SmsError, sendOtpSms, smsStatus } from './sms.js';
import { assertSameOrigin, currentUser, requireUser, logout as userLogout, passwordLogin, requestCode, updateProfile, verifyCode } from './userAuth.js';
import { normalizeIranMobile } from '../src/utils/phone.js';
import { ensureReady } from './schema.js';
import { createUploadToken } from './upload.js';
import { isCollection, isValidId } from './validate.js';

// Short CDN cache so admin edits appear within seconds without hammering the database.
const PUBLIC_CACHE = 'public, max-age=0, s-maxage=15, stale-while-revalidate=60';

function pathSegments(request: Request): string[] {
  const url = new URL(request.url);
  // Vercel keeps the original /api/<path> in request.url after the vercel.json
  // rewrite; the __path query parameter (which Vercel may pad with whitespace)
  // is only a fallback for runtimes that report the rewritten URL.
  const fromPath = url.pathname.replace(/^\/api\/?/, '');
  const raw = fromPath && fromPath !== 'index' ? fromPath : (url.searchParams.get('__path') ?? '').trim();
  return raw
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
}

export async function handle(request: Request): Promise<Response> {
  try {
    const seg = pathSegments(request);
    const method = request.method.toUpperCase();

    if (seg.length === 1 && seg[0] === 'health' && method === 'GET') {
      return json({ ok: true });
    }

    // Media redirects need no database, so they skip ensureReady().
    if (seg[0] === 'media' && seg.length > 1 && method === 'GET') {
      return await mediaRedirect(seg.slice(1));
    }

    await ensureReady();

    if (seg.length === 1 && seg[0] === 'content' && method === 'GET') {
      return json(await readBundle(true), 200, PUBLIC_CACHE);
    }

    if (seg[0] === 'auth') return await authRoute(request, method, seg.slice(1));
    if (seg[0] === 'trip') return await tripRoute(request, method, seg.slice(1));

    if (seg[0] !== 'admin') throw notFound();
    const route = seg.slice(1);

    if (route[0] === 'login' && route.length === 1) {
      if (method !== 'POST') throw methodNotAllowed();
      const signedIn = await login(request, await readJson(request));
      await audit(signedIn.admin.username, 'ورود به پنل مدیریت');
      return json(signedIn);
    }

    const admin = await requireAdmin(request);
    const need = (permission: Parameters<typeof requirePermission>[1]) => requirePermission(admin, permission);
    // Changes made through the panel are recorded; reads and failed requests are not.
    const writes = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    switch (route[0]) {
      case 'me':
        if (method === 'GET' && route.length === 1) return json({ admin: publicAdmin(admin) });
        break;

      case 'logout':
        if (method === 'POST' && route.length === 1) {
          await logout(request);
          return noContent();
        }
        break;

      case 'dashboard':
        if (method === 'GET' && route.length === 1) return json(await dashboard());
        break;

      case 'content':
      case 'export':
        need('content.read');
        if (method === 'GET' && route.length === 1) return json(await readBundle(false));
        break;

      case 'site':
        if (route.length !== 1) break;
        if (method === 'GET') {
          need('content.read');
          return json((await readBundle(false)).site);
        }
        if (method === 'PUT') {
          need('settings.write');
          const site = await updateSite(await readJson(request));
          await audit(admin, 'تنظیمات سایت ذخیره شد');
          return json(site);
        }
        break;

      case 'import':
        if (method === 'POST' && route.length === 1) {
          need('settings.write');
          await writeBundle(await readJson(request), 'replace');
          await audit(admin, 'محتوا از فایل پشتیبان بازیابی شد');
          return json({ ok: true });
        }
        break;

      case 'sms-config':
        need('settings.write');
        if (method === 'GET' && route.length === 1) return json(smsStatus());
        break;

      case 'sms-test':
        need('settings.write');
        if (method === 'POST' && route.length === 1) {
          const body = (await readJson(request)) as { phone?: unknown };
          const phone = typeof body?.phone === 'string' ? normalizeIranMobile(body.phone) : null;
          if (!phone) throw badRequest('شماره موبایل معتبر نیست.');
          try {
            await sendOtpSms(phone, '123456');
          } catch (err) {
            if (err instanceof SmsError) throw new ApiError(502, 'sms_failed', err.message);
            throw err;
          }
          return json({ ok: true });
        }
        break;

      case 'media-config':
        need('content.read');
        if (method === 'GET' && route.length === 1) return json({ access: blobAccess() });
        break;

      case 'blob-upload':
      case 'upload':
        need('content.write');
        if (method === 'POST' && route.length === 1) {
          return json(await createUploadToken(request, await readJson(request)));
        }
        break;

      case 'collections':
        if (writes) need('content.write');
        else need('content.read');
        return await collectionRoute(request, method, route.slice(1), admin);

      case 'users':
        return await usersRoute(request, method, route.slice(1), admin);

      case 'staff':
        need('staff.manage');
        return await staffRoute(request, method, route.slice(1), admin);

      case 'trip':
        need('trip.manage');
        return await adminTripRoute(request, method, route.slice(1), admin);

      case 'audit':
        need('audit.read');
        if (method === 'GET' && route.length === 1) {
          const params = new URL(request.url).searchParams;
          return json({ items: await listAudit(Number(params.get('limit')) || 50, Number(params.get('offset')) || 0) });
        }
        break;
    }

    throw notFound();
  } catch (err) {
    return errorResponse(err);
  }
}

async function authRoute(request: Request, method: string, route: string[]): Promise<Response> {
  if (route.length !== 1) throw notFound();
  const action = route[0];

  if (action === 'me' && method === 'GET') {
    const user = await currentUser(request);
    if (!user) throw new ApiError(401, 'unauthorized', 'وارد نشده‌اید.');
    return json({ user });
  }

  if (method !== 'POST' && method !== 'PUT') throw methodNotAllowed();
  assertSameOrigin(request);

  if (action === 'request-code' && method === 'POST') return requestCode(request, await readJson(request));
  if (action === 'verify-code' && method === 'POST') return verifyCode(request, await readJson(request));
  if (action === 'login' && method === 'POST') return passwordLogin(request, await readJson(request));
  if (action === 'profile' && method === 'PUT') return updateProfile(request, await readJson(request));
  if (action === 'logout' && method === 'POST') return userLogout(request);
  throw notFound();
}

async function collectionRoute(
  request: Request,
  method: string,
  route: string[],
  admin: AdminSession
): Promise<Response> {
  const [collection, second] = route;
  if (!collection || !isCollection(collection) || route.length > 2) throw notFound('این بخش وجود ندارد.');

  if (route.length === 1) {
    if (method === 'POST') {
      const item = await createItem(collection, await readJson(request));
      await audit(admin, 'مورد جدید ساخته شد', `${collection}/${item.id}`, titleOf(item));
      return json(item, 201);
    }
    if (method === 'GET') return json({ items: (await readBundle(false))[collection] });
    throw methodNotAllowed();
  }

  if (second === 'reorder') {
    if (method !== 'POST') throw methodNotAllowed();
    const body = (await readJson(request)) as { ids?: unknown };
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length > 1000 || !ids.every(isValidId) || new Set(ids).size !== ids.length) {
      throw badRequest('فهرست ترتیب معتبر نیست.');
    }
    const items = await reorderCollection(collection, ids);
    await audit(admin, 'ترتیب موارد تغییر کرد', collection);
    return json({ items });
  }

  if (!isValidId(second)) throw notFound('این مورد پیدا نشد.');
  if (method === 'PUT') {
    const item = await updateItem(collection, second, await readJson(request));
    await audit(admin, item.isPublished ? 'مورد ویرایش شد' : 'مورد ویرایش شد (پیش‌نویس)', `${collection}/${second}`, titleOf(item));
    return json(item);
  }
  if (method === 'DELETE') {
    await deleteItem(collection, second);
    await audit(admin, 'مورد حذف شد', `${collection}/${second}`);
    return noContent();
  }
  throw methodNotAllowed();
}

function methodNotAllowed() {
  return badRequest('این عملیات برای این مسیر مجاز نیست.', 'method_not_allowed');
}

const titleOf = (item: Record<string, unknown>): string => {
  for (const key of ['title', 'name', 'question', 'text', 'label']) {
    if (typeof item[key] === 'string' && item[key]) return String(item[key]).slice(0, 80);
  }
  return '';
};

async function usersRoute(request: Request, method: string, route: string[], admin: AdminSession): Promise<Response> {
  const [first, second] = route;
  if (method === 'GET' && route.length === 0) {
    requirePermission(admin, 'users.read');
    return json(await listMembers(new URL(request.url).searchParams));
  }
  requirePermission(admin, 'users.write');

  if (first === 'import' && route.length === 1 && method === 'POST') {
    const result = await importMembers(await readJson(request));
    await audit(admin, 'ورود گروهی کاربران', '', `${result.created} جدید، ${result.updated} به‌روز، ${result.rejected.length} ردشده`);
    return json(result);
  }
  if (route.length === 0 && method === 'POST') {
    const member = await createMember(await readJson(request));
    await audit(admin, 'کاربر ساخته شد', member.phone, `${member.firstName} ${member.lastName}`.trim());
    return json(member, 201);
  }
  if (route.length === 1 && isValidId(first)) {
    if (method === 'PUT') {
      const body = (await readJson(request)) as Record<string, unknown>;
      const member = await updateMember(first, body);
      const what = body.disabled === true ? 'کاربر غیرفعال شد' : body.disabled === false ? 'کاربر فعال شد' : body.password ? 'رمز کاربر تغییر کرد' : 'کاربر ویرایش شد';
      await audit(admin, what, member.phone, `${member.firstName} ${member.lastName}`.trim());
      return json(member);
    }
    if (method === 'DELETE') {
      const gone = await deleteMember(first);
      await audit(admin, 'کاربر حذف شد', gone.phone);
      return noContent();
    }
  }
  void second;
  throw notFound();
}

async function staffRoute(request: Request, method: string, route: string[], admin: AdminSession): Promise<Response> {
  const [id] = route;
  if (route.length === 0 && method === 'GET') return json(await listStaff());
  if (route.length === 0 && method === 'POST') {
    const created = await createStaff(await readJson(request));
    await audit(admin, 'حساب مدیریتی ساخته شد', created.username, created.role);
    return json(created, 201);
  }
  if (route.length === 1 && isValidId(id)) {
    if (method === 'PUT') {
      const body = (await readJson(request)) as Record<string, unknown>;
      const updated = await updateStaff(id, body, admin);
      await audit(admin, body.password ? 'رمز حساب مدیریتی تغییر کرد' : 'حساب مدیریتی ویرایش شد', updated.username, updated.role);
      return json(updated);
    }
    if (method === 'DELETE') {
      const gone = await deleteStaff(id, admin);
      await audit(admin, 'حساب مدیریتی حذف شد', gone.username);
      return noContent();
    }
  }
  throw notFound();
}

async function tripRoute(request: Request, method: string, route: string[]): Promise<Response> {
  const user = await requireUser(request);
  if (route.length === 1 && route[0] === 'state' && method === 'GET') return json(await tripState(user));
  if (method !== 'POST' || route.length !== 1) throw notFound();
  assertSameOrigin(request);
  const body = await readJson(request);
  if (route[0] === 'complete') return json(await completeTask(user, body));
  if (route[0] === 'answer') return json(await answerQuestion(user, body));
  if (route[0] === 'test') return json(await submitTest(user, body));
  throw notFound();
}

async function adminTripRoute(request: Request, method: string, route: string[], admin: AdminSession): Promise<Response> {
  const group = new URL(request.url).searchParams.get('group') ?? '1';
  if (!isGroup(group)) throw badRequest('گروه نامعتبر است.');
  if (route.length === 0 && method === 'GET') return json(await adminTrip(group));
  if (route.length === 1 && route[0] === 'open' && method === 'POST') {
    const stage = await openNextStage(group);
    await audit(admin, 'مرحله‌ی سفر باز شد', `گروه ${group}`, stage.title);
    return json(await adminTrip(group));
  }
  if (route.length === 1 && route[0] === 'undo' && method === 'POST') {
    const stage = await undoLastOpen(group);
    await audit(admin, 'باز شدن مرحله‌ی سفر برگردانده شد', `گروه ${group}`, stage?.title ?? '');
    return json(await adminTrip(group));
  }
  if (route.length === 1 && route[0] === 'schedule' && method === 'POST') {
    const count = await setSchedule(group, await readJson(request));
    await audit(admin, 'زمان‌بندی باز شدن مرحله‌ها تنظیم شد', `گروه ${group}`, `${count} مرحله`);
    return json(await adminTrip(group));
  }
  if (route.length === 1 && route[0] === 'schedule' && method === 'DELETE') {
    await clearSchedule(group);
    await audit(admin, 'زمان‌بندی باز شدن مرحله‌ها لغو شد', `گروه ${group}`, '');
    return json(await adminTrip(group));
  }
  if (route.length === 1 && route[0] === 'adjust' && method === 'POST') {
    const result = await adjustPoints(admin.username, await readJson(request));
    await audit(admin, result.delta > 0 ? 'امتیاز اضافه شد' : 'امتیاز کم شد', result.name, `${result.delta > 0 ? '+' : ''}${result.delta}${result.reason ? ' · ' + result.reason : ''}`);
    return json(await adminTrip(group));
  }
  if (route.length === 1 && route[0] === 'adjustments' && method === 'GET') {
    const user = new URL(request.url).searchParams.get('user') ?? '';
    if (!isValidId(user)) throw badRequest('کاربر نامعتبر است.');
    return json({ items: await listAdjustments(user) });
  }
  throw notFound();
}
