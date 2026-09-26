import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { ApiError, badRequest } from './http.js';

const MB = 1024 * 1024;

const KINDS = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * MB },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'], maxBytes: 50 * MB },
  video: { types: ['video/mp4', 'video/webm'], maxBytes: 200 * MB },
} as const;

type Kind = keyof typeof KINDS;

/**
 * Issues a short-lived token so the browser can upload the file straight to
 * Vercel Blob (function bodies are limited to 4.5 MB, far below audio/video
 * sizes). The caller must already have checked the admin session.
 */
export async function createUploadToken(request: Request, body: unknown): Promise<unknown> {
  const payload = body as HandleUploadBody;
  if (payload?.type !== 'blob.generate-client-token') {
    throw badRequest('نوع درخواست بارگذاری پشتیبانی نمی‌شود.');
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ApiError(500, 'config', 'فضای ذخیره فایل (BLOB_READ_WRITE_TOKEN) تنظیم نشده است.');
  }

  return handleUpload({
    body: payload,
    request,
    onBeforeGenerateToken: async (pathname) => {
      const kind = pathname.split('/')[0] as Kind;
      const rules = KINDS[kind];
      if (!rules) throw badRequest('نوع فایل باید تصویر، صوت یا ویدئو باشد.');
      return {
        allowedContentTypes: [...rules.types],
        maximumSizeInBytes: rules.maxBytes,
        addRandomSuffix: true,
        validUntil: Date.now() + 30 * 60 * 1000,
      };
    },
  });
}
