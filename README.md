# Prerender Service (Dynamic Rendering)

Render your CSR React site to static HTML for crawlers via a simple API.

## Endpoints
- `GET /healthz`
- `GET /metrics`
- `GET /render?url=/path` → renders `BASE_ORIGIN + /path`

## Env
- `BASE_ORIGIN` (required), e.g. `https://yourdomain.com`
- `PORT` (default `3000`)
- `CACHE_TTL_SECONDS` (default `600`)
- `MAX_RENDER_TIME_MS` (default `15000`)
- `RENDER_USER_AGENT` (optional)
- `WAIT_STRATEGY` (`network-idle` | `selector` | `timeout`, default `network-idle`)
- `WAIT_SELECTOR` (when `WAIT_STRATEGY=selector`)
- `WAIT_TIMEOUT_MS` (default `8000`)
- `BLOCKED_QUERY_PARAMS` (csv)
- `ALLOWED_PATH_PREFIXES` (csv)

## Example
```
GET /render?url=/products/widget-123
```
Returns origin status, selected headers, body HTML, plus `x-prerendered` and `x-cache` headers.

## BunnyCDN routing
Use Edge Rules: if User-Agent is a known crawler → rewrite to
```
https://<prerender-host>/render?url={path+query}
```
Else → route to your normal origin. Ensure `{path+query}` is URL-encoded.

## Deploy (DigitalOcean)
- Build with provided Dockerfile; deploy on DO App Platform or a Droplet
- Set env vars; allow outbound to `BASE_ORIGIN`
- For multiple instances, add Redis-backed cache (not included here)

## Notes
- Images/media/fonts are skipped to speed up rendering
- Prefer `selector` wait if your app has a stable content root
- Keep this service private behind your CDN/proxy




