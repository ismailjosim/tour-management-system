/* eslint-disable no-console */
import { NextFunction, Request, RequestHandler, Response } from 'express';
import zlib from 'zlib';

interface RateLimitStoreValue {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitStoreValue>>();

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

export const createRateLimiter = ({
  windowMs,
  max,
  message = 'Too many requests. Please try again later.',
  keyPrefix,
}: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix: string;
}): RequestHandler => {
  const store = stores.get(keyPrefix) ?? new Map<string, RateLimitStoreValue>();
  stores.set(keyPrefix, store);

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const record = store.get(key);

    if (!record || record.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
      return res.status(429).json({
        success: false,
        message,
        errorSources: [],
      });
    }

    next();
  };
};

export const lightweightCompression: RequestHandler = (req, res, next) => {
  const acceptsGzip = req.headers['accept-encoding']?.includes('gzip');

  if (!acceptsGzip || req.method === 'HEAD') {
    return next();
  }

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  const chunks: Buffer[] = [];

  res.write = ((chunk: unknown) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    return true;
  }) as typeof res.write;

  res.end = ((chunk?: unknown) => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }

    const body = Buffer.concat(chunks);
    const contentType = res.getHeader('Content-Type')?.toString() ?? '';
    const shouldCompress =
      body.length > 1024 &&
      res.statusCode < 300 &&
      (contentType.includes('application/json') || contentType.includes('text/'));

    if (!shouldCompress) {
      return originalEnd(body);
    }

    try {
      if (res.headersSent) {
        return originalEnd(body);
      }
      const compressed = zlib.gzipSync(body);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', compressed.length);
      originalWrite(compressed);
      originalEnd();
    } catch (error) {
      console.error('error in compression:', error);
      if (!res.headersSent) {
        originalEnd(body);
      }
    }

    return res;
  }) as typeof res.end;

  next();
};
