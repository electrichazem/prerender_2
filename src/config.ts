export type WaitStrategy =
  | { type: 'network-idle'; timeoutMs: number }
  | { type: 'selector'; selector: string; timeoutMs: number }
  | { type: 'timeout'; timeoutMs: number };

export interface ServiceConfig {
  baseOrigin: string;
  port: number;
  cacheTtlSeconds: number;
  userAgent: string;
  maxRenderTimeMs: number;
  waitStrategy: WaitStrategy;
  blockedQueryParams: string[];
  allowedPathPrefixes: string[] | null;
}

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

function getNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig(): ServiceConfig {
  const baseOrigin = getEnv('BASE_ORIGIN');
  const port = getNumber('PORT', 3000);
  const cacheTtlSeconds = getNumber('CACHE_TTL_SECONDS', 600);
  const maxRenderTimeMs = getNumber('MAX_RENDER_TIME_MS', 15000);
  const userAgent = process.env.RENDER_USER_AGENT ||
    'Mozilla/5.0 (compatible; PrerenderBot/1.0; +https://example.com/bot)';

  const waitStrategyEnv = (process.env.WAIT_STRATEGY || 'network-idle').toLowerCase();
  const waitTimeout = getNumber('WAIT_TIMEOUT_MS', 8000);
  const selector = process.env.WAIT_SELECTOR || '#root, main, body';

  let waitStrategy: WaitStrategy;
  if (waitStrategyEnv === 'selector') {
    waitStrategy = { type: 'selector', selector, timeoutMs: waitTimeout };
  } else if (waitStrategyEnv === 'timeout') {
    waitStrategy = { type: 'timeout', timeoutMs: waitTimeout };
  } else {
    waitStrategy = { type: 'network-idle', timeoutMs: waitTimeout };
  }

  const blockedQueryParams = (process.env.BLOCKED_QUERY_PARAMS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const allowedPathPrefixes = (process.env.ALLOWED_PATH_PREFIXES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return {
    baseOrigin,
    port,
    cacheTtlSeconds,
    userAgent,
    maxRenderTimeMs,
    waitStrategy,
    blockedQueryParams,
    allowedPathPrefixes: allowedPathPrefixes.length ? allowedPathPrefixes : null,
  };
}





