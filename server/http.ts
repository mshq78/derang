export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = 'bad_request') =>
  new ApiError(400, code, message);
export const notFound = (message = 'مسیر یا مورد درخواستی پیدا نشد.') =>
  new ApiError(404, 'not_found', message);
export const conflict = (message: string) => new ApiError(409, 'conflict', message);

const NO_STORE = 'no-store';

export function json(data: unknown, status = 200, cacheControl = NO_STORE): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: { 'Cache-Control': NO_STORE } });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return json({ error: { code: err.code, message: err.message } }, err.status);
  }
  console.error('[api] unexpected error', err);
  return json(
    { error: { code: 'internal', message: 'خطای داخلی سرور. لطفاً دوباره تلاش کنید.' } },
    500
  );
}

const MAX_BODY_BYTES = 4 * 1024 * 1024;

export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) {
    throw new ApiError(413, 'payload_too_large', 'حجم درخواست بیش از حد مجاز است.');
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new ApiError(413, 'payload_too_large', 'حجم درخواست بیش از حد مجاز است.');
  }
  if (!text) throw badRequest('بدنه درخواست خالی است.');
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest('بدنه درخواست JSON معتبر نیست.');
  }
}
