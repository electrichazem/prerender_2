import express, { Request, Response } from 'express';
import { InMemoryTtlCache } from './cache.js';
import { loadConfig } from './config.js';
import { Renderer } from './renderer.js';

const config = loadConfig();
const cache = new InMemoryTtlCache(config.cacheTtlSeconds);
const renderer = new Renderer(config);

export function createServer() {
  const app = express();

  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.get('/metrics', (_req: Request, res: Response) => {
    res.status(200).json({ cacheTtlSeconds: config.cacheTtlSeconds });
  });

  app.get('/render', async (req: Request, res: Response) => {
    try {
      const rawUrl = (req.query.url as string) || '/';
      if (!rawUrl.startsWith('/')) {
        return res.status(400).json({ error: 'url must start with /' });
      }

      if (config.allowedPathPrefixes && !config.allowedPathPrefixes.some(p => rawUrl.startsWith(p))) {
        return res.status(403).json({ error: 'path not allowed' });
      }

      const url = new URL(rawUrl, config.baseOrigin);
      for (const qp of config.blockedQueryParams) {
        url.searchParams.delete(qp);
      }

      const cacheKey = url.toString();
      const cached = cache.get(cacheKey);
      if (cached) {
        for (const [k, v] of Object.entries(cached.headers)) res.setHeader(k, v);
        res.setHeader('x-cache', 'HIT');
        return res.status(cached.status).send(cached.html);
      }

      const { html, status, headers } = await renderer.render(url.toString());
      cache.set(cacheKey, { html, status, headers });

      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
      res.setHeader('x-cache', 'MISS');
      res.status(status).send(html);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });

  return app;
}






