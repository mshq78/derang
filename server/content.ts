import { randomBytes } from 'node:crypto';
import type { CollectionName, ContentBundle, SiteSettings } from '../src/types/content.js';
import { DEFAULT_CONTENT } from '../src/data/defaultContent.js';
import { getDb, Row, Statement } from './db.js';
import { conflict, notFound } from './http.js';
import { cleanBundle, cleanItem, cleanSite, COLLECTIONS } from './validate.js';
import { normalizeMediaUrl } from './media.js';
import { smsStatus } from './sms.js';

type Item = Record<string, unknown> & { id: string; sortOrder: number; isPublished: boolean };

const ITEM_COLUMNS = 'collection, id, sort_order, is_published, data';

const MEDIA_FIELDS = ['audioUrl', 'coverUrl', 'imageUrl', 'backImageUrl', 'videoUrl', 'posterUrl'];

function rowToItem(row: Row): Item {
  const data = { ...(row.data as Record<string, unknown>) };
  // Values saved before /api/media existed may hold expiring private-blob links.
  for (const field of MEDIA_FIELDS) {
    if (typeof data[field] === 'string') data[field] = normalizeMediaUrl(data[field] as string);
  }
  return {
    ...data,
    id: row.id as string,
    sortOrder: row.sort_order as number,
    isPublished: row.is_published as boolean,
  };
}

function newVersion(): string {
  return `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function bumpVersion(): Statement {
  return {
    text: `INSERT INTO content_meta (id, version, updated_at) VALUES (1, $1, now())
           ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, updated_at = now()`,
    params: [newVersion()],
  };
}

export async function readBundle(publishedOnly: boolean): Promise<ContentBundle> {
  const db = getDb();
  const [rows, siteRows, metaRows] = await Promise.all([
    db.query(
      `SELECT ${ITEM_COLUMNS} FROM content_items
       ${publishedOnly ? 'WHERE is_published' : ''}
       ORDER BY collection, sort_order, id`
    ),
    db.query('SELECT data FROM site_settings WHERE id = 1'),
    db.query('SELECT version, updated_at FROM content_meta WHERE id = 1'),
  ]);

  const bundle = {
    version: (metaRows[0]?.version as string) ?? DEFAULT_CONTENT.version,
    updatedAt: metaRows[0]?.updated_at
      ? new Date(metaRows[0].updated_at as string).toISOString()
      : DEFAULT_CONTENT.updatedAt,
    // Merge over the defaults so fields added to the app later always exist.
    site: { ...DEFAULT_CONTENT.site, ...((siteRows[0]?.data as SiteSettings) ?? {}) },
  } as ContentBundle;

  // Visitors are only asked to sign in when this server can actually send the SMS.
  // Preview and production share one database; without this a deployment lacking SMS
  // would lock everyone out. The admin still sees the stored switch.
  if (publishedOnly) {
    bundle.site = { ...bundle.site, phoneLoginEnabled: bundle.site.phoneLoginEnabled === true && smsStatus().configured };
  }

  const lists = bundle as unknown as Record<CollectionName, Item[]>;
  for (const collection of COLLECTIONS) lists[collection] = [];
  for (const row of rows) lists[row.collection as CollectionName]?.push(rowToItem(row));
  return bundle;
}

/**
 * Writes a whole bundle. 'seed' only fills an empty database and never
 * overwrites; 'replace' deletes all content and writes the bundle instead.
 */
export async function writeBundle(input: unknown, mode: 'seed' | 'replace'): Promise<void> {
  const { site, items } = cleanBundle(input);
  if (mode === 'replace' && site.phoneLoginEnabled && !smsStatus().configured) throw conflict(SMS_NOT_READY);
  const rows = COLLECTIONS.flatMap((collection) =>
    items[collection].map((item) => ({
      collection,
      id: item.id,
      sort_order: item.sortOrder,
      is_published: item.isPublished,
      data: item.data,
    }))
  );

  const statements: Statement[] = [];
  if (mode === 'replace') statements.push({ text: 'DELETE FROM content_items' });
  statements.push({
    text: `INSERT INTO content_items (${ITEM_COLUMNS})
           SELECT x.collection, x.id, x.sort_order, x.is_published, x.data
           FROM jsonb_to_recordset($1::jsonb)
             AS x(collection text, id text, sort_order integer, is_published boolean, data jsonb)
           ON CONFLICT (collection, id) DO NOTHING`,
    params: [JSON.stringify(rows)],
  });
  statements.push({
    text: `INSERT INTO site_settings (id, data) VALUES (1, $1::jsonb)
           ON CONFLICT (id) DO ${mode === 'replace' ? 'UPDATE SET data = EXCLUDED.data, updated_at = now()' : 'NOTHING'}`,
    params: [JSON.stringify(site)],
  });
  statements.push(
    mode === 'replace'
      ? bumpVersion()
      : {
          text: `INSERT INTO content_meta (id, version) VALUES (1, $1) ON CONFLICT (id) DO NOTHING`,
          params: [newVersion()],
        }
  );
  await getDb().transaction(statements);
}

const SMS_NOT_READY =
  'ابتدا سامانه پیامکی را روی سرور تنظیم کنید (متغیر SMS_PROVIDER و متغیرهای وابسته)؛ بعد ورود با موبایل را روشن کنید.';

export async function updateSite(input: unknown): Promise<SiteSettings> {
  const site = cleanSite(input);
  if (site.phoneLoginEnabled && !smsStatus().configured) {
    // Only block turning it on; saving other settings must keep working.
    const [current] = await getDb().query(`SELECT data->>'phoneLoginEnabled' AS enabled FROM site_settings WHERE id = 1`);
    if (current?.enabled !== 'true') throw conflict(SMS_NOT_READY);
  }
  await getDb().transaction([
    {
      text: `INSERT INTO site_settings (id, data) VALUES (1, $1::jsonb)
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      params: [JSON.stringify(site)],
    },
    bumpVersion(),
  ]);
  return site;
}

async function listCollection(collection: CollectionName): Promise<Item[]> {
  const rows = await getDb().query(
    `SELECT ${ITEM_COLUMNS} FROM content_items WHERE collection = $1 ORDER BY sort_order, id`,
    [collection]
  );
  return rows.map(rowToItem);
}

async function assertStationExists(stationId: unknown): Promise<void> {
  const rows = await getDb().query(
    `SELECT 1 FROM content_items WHERE collection = 'stations' AND id = $1`,
    [stationId]
  );
  if (rows.length === 0) throw conflict('ایستگاه انتخاب‌شده وجود ندارد.');
}

export async function createItem(collection: CollectionName, input: unknown): Promise<Item> {
  const clean = cleanItem(collection, input);
  if (collection === 'questions') await assertStationExists(clean.data.stationId);

  const db = getDb();
  const id = clean.id ?? `${collection}-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
  let sortOrder = clean.sortOrder;
  if (sortOrder === undefined) {
    const [max] = await db.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS m FROM content_items WHERE collection = $1',
      [collection]
    );
    sortOrder = Number(max?.m ?? 0) + 10;
  }

  const existing = await db.query('SELECT 1 FROM content_items WHERE collection = $1 AND id = $2', [
    collection,
    id,
  ]);
  if (existing.length > 0) throw conflict(`موردی با شناسه «${id}» از قبل وجود دارد.`);

  await db.transaction([
    {
      text: `INSERT INTO content_items (${ITEM_COLUMNS}) VALUES ($1, $2, $3, $4, $5::jsonb)`,
      params: [collection, id, sortOrder, clean.isPublished, JSON.stringify(clean.data)],
    },
    bumpVersion(),
  ]);
  return { ...clean.data, id, sortOrder, isPublished: clean.isPublished };
}

export async function updateItem(collection: CollectionName, id: string, input: unknown): Promise<Item> {
  const db = getDb();
  const [current] = await db.query(
    'SELECT sort_order FROM content_items WHERE collection = $1 AND id = $2',
    [collection, id]
  );
  if (!current) throw notFound('این مورد پیدا نشد؛ ممکن است حذف شده باشد.');

  const clean = cleanItem(collection, input);
  if (collection === 'questions') await assertStationExists(clean.data.stationId);
  const sortOrder = clean.sortOrder ?? (current.sort_order as number);

  await db.transaction([
    {
      text: `UPDATE content_items SET data = $3::jsonb, is_published = $4, sort_order = $5, updated_at = now()
             WHERE collection = $1 AND id = $2`,
      params: [collection, id, JSON.stringify(clean.data), clean.isPublished, sortOrder],
    },
    bumpVersion(),
  ]);
  return { ...clean.data, id, sortOrder, isPublished: clean.isPublished };
}

export async function deleteItem(collection: CollectionName, id: string): Promise<void> {
  const db = getDb();
  if (collection === 'stations') {
    const [used] = await db.query(
      `SELECT COUNT(*)::int AS n FROM content_items WHERE collection = 'questions' AND data->>'stationId' = $1`,
      [id]
    );
    if (Number(used?.n) > 0) {
      throw conflict('ابتدا پرسش‌های این ایستگاه را منتقل یا حذف کنید.');
    }
  }
  const [existing] = await db.query('SELECT 1 AS ok FROM content_items WHERE collection = $1 AND id = $2', [
    collection,
    id,
  ]);
  if (!existing) throw notFound('این مورد پیدا نشد؛ ممکن است قبلاً حذف شده باشد.');

  await db.transaction([
    { text: 'DELETE FROM content_items WHERE collection = $1 AND id = $2', params: [collection, id] },
    bumpVersion(),
  ]);
}

export async function reorderCollection(collection: CollectionName, ids: string[]): Promise<Item[]> {
  const order = ids.map((id, index) => ({ id, ord: (index + 1) * 10 }));
  await getDb().transaction([
    {
      text: `UPDATE content_items AS c SET sort_order = x.ord, updated_at = now()
             FROM jsonb_to_recordset($2::jsonb) AS x(id text, ord integer)
             WHERE c.collection = $1 AND c.id = x.id`,
      params: [collection, JSON.stringify(order)],
    },
    bumpVersion(),
  ]);
  return listCollection(collection);
}
