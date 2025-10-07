import puppeteer, { Browser, HTTPRequest, Page } from 'puppeteer';
import { ServiceConfig, WaitStrategy } from './config.js';

export interface RenderResult {
  html: string;
  status: number;
  headers: Record<string, string>;
}

export class Renderer {
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly config: ServiceConfig) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process'
        ],
        headless: true
      });
    }
    return this.browserPromise;
  }

  async render(fullUrl: string): Promise<RenderResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setUserAgent(this.config.userAgent);
      await page.setRequestInterception(true);

      page.on('request', (req: HTTPRequest) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
          req.abort();
          return;
        }
        
        // Rewrite URLs that point to localhost:3000 to use the correct origin
        const requestUrl = req.url();
        console.log(`Request: ${requestUrl}`);
        
        if (requestUrl.includes('localhost:3000') || requestUrl.includes('127.0.0.1:3000')) {
          const url = new URL(requestUrl);
          const newUrl = new URL(url.pathname + url.search + url.hash, this.config.baseOrigin);
          console.log(`Rewriting ${requestUrl} -> ${newUrl.toString()}`);
          req.continue({ url: newUrl.toString() });
          return;
        }
        
        req.continue();
      });

      const response = await page.goto(fullUrl, {
        waitUntil: ['domcontentloaded'],
        timeout: this.config.maxRenderTimeMs
      });

      if (!response) {
        throw new Error('No response received');
      }

      await this.applyWaitStrategy(page, this.config.waitStrategy);

      // Inject base tag to fix relative URLs
      await page.evaluate((baseOrigin) => {
        const base = document.createElement('base');
        base.href = baseOrigin;
        document.head.insertBefore(base, document.head.firstChild);
      }, this.config.baseOrigin);

      let html = await page.content();

      // Also rewrite any remaining localhost:3000 URLs in the HTML content
      html = html.replace(/http:\/\/localhost:3000/g, this.config.baseOrigin);
      html = html.replace(/https:\/\/localhost:3000/g, this.config.baseOrigin);

      // Strip script tags and manifest links to avoid CORS/runtime errors when viewing snapshot in a browser
      // Remove all <script>... tags (both inline and external)
      html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      // Remove <link rel="manifest" ...>
      html = html.replace(/<link\b[^>]*rel=["']manifest["'][^>]*>/gi, '');
      
      const status = response.status();
      const headers = response.headers();
      return { html, status, headers: this.pickResponseHeaders(headers) };
    } finally {
      await page.close({ runBeforeUnload: false });
    }
  }

  private async applyWaitStrategy(page: Page, wait: WaitStrategy): Promise<void> {
    if (wait.type === 'network-idle') {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: wait.timeoutMs }).catch(() => undefined);
      return;
    }
    if (wait.type === 'selector') {
      await page.waitForSelector(wait.selector, { timeout: wait.timeoutMs }).catch(() => undefined);
      return;
    }
    // Fallback simple delay when using timeout strategy
    await new Promise<void>(resolve => setTimeout(resolve, wait.timeoutMs));
  }

  private pickResponseHeaders(headers: Record<string, string>): Record<string, string> {
    const allow = ['content-type', 'cache-control', 'etag', 'last-modified'];
    const out: Record<string, string> = {};
    for (const k of allow) {
      if (headers[k]) out[k] = headers[k];
    }
    out['x-prerendered'] = '1';
    return out;
  }
}






