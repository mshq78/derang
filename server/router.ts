import { login, logout, requireAdmin } from './auth.js';
import {
  createItem,
  deleteItem,
  readBundle,
  reorderCollection,
  updateItem,
  updateSite,
  writeBundle,
} from './content.js';
import { badRequest, errorResponse, json, noContent, notFound, readJson } from './http.js';
import { ensureReady } from './schema.js';
import { createUploadToken } from './upload.js';
import { isCollection, isValidId } from './validate.js';

// Short CDN cache so admin edits appear within seconds without hammering the database.
const PUBLIC_CACHE = 'public, max-age=0, s-maxage=15, stale-while-revalidate=60';

function pathSegments(request: Request): string[] {
  const url = new URL(request.url);
  // vercel.json rewrites /api/<path> to /api?__path=<path>; fall back to the real path locally.
  const raw = url.searchParams.get('__path') ?? url.pathname.replace(/^\/api\/?/, '');
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

    await ensureReady();

    if (seg.length === 1 && seg[0] === 'content' && method === 'GET') {
      return json(await readBundle(true), 200, PUBLIC_CACHE);
    }

    if (seg[0] !== 'admin') throw notFound();
    const route = seg.slice(1);

    if (route[0] === 'login' && route.length === 1) {
      if (method !== 'POST') throw methodNotAllowed();
      return json(await login(request, await readJson(request)));
    }

    const admin = await requireAdmin(request);

    switch (route[0]) {
      case 'me':
        if (method === 'GET' && route.length === 1) return json({ admin });
        break;

      case 'logout':
        if (method === 'POST' && route.length === 1) {
          await logout(request);
          return noContent();
        }
        break;

      case 'content':
      case 'export':
        if (method === 'GET' && route.length === 1) return json(await readBundle(false));
        break;

      case 'site':
        if (route.length !== 1) break;
        if (method === 'GET') return json((await readBundle(false)).site);
        if (method === 'PUT') return json(await updateSite(await readJson(request)));
        break;

      case 'import':
        if (method === 'POST' && route.length === 1) {
          await writeBundle(await readJson(request), 'replace');
          return json({ ok: true });
        }
        break;

      case 'blob-upload':
      case 'upload':
        if (method === 'POST' && route.length === 1) {
          return json(await createUploadToken(request, await readJson(request)));
        }
        break;

      case 'collections':
        return await collectionRoute(request, method, route.slice(1));
    }

    throw notFound();
  } catch (err) {
    return errorResponse(err);
  }
}

async function collectionRoute(request: Request, method: string, route: string[]): Promise<Response> {
  const [collection, second] = route;
  if (!collection || !isCollection(collection) || route.length > 2) throw notFound('این بخش وجود ندارد.');

  if (route.length === 1) {
    if (method === 'POST') return json(await createItem(collection, await readJson(request)), 201);
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
    return json({ items: await reorderCollection(collection, ids) });
  }

  if (!isValidId(second)) throw notFound('این مورد پیدا نشد.');
  if (method === 'PUT') return json(await updateItem(collection, second, await readJson(request)));
  if (method === 'DELETE') {
    await deleteItem(collection, second);
    return noContent();
  }
  throw methodNotAllowed();
}

function methodNotAllowed() {
  return badRequest('این عملیات برای این مسیر مجاز نیست.', 'method_not_allowed');
}
