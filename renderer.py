from playwright.async_api import async_playwright
import asyncio
from typing import Dict, Any
import re

class Renderer:
    def __init__(self, config):
        self.config = config
        self.browser = None
        self.playwright = None
        
    async def start_browser(self):
        if not self.browser:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            print("✅ Browser launched successfully")
        return self.browser
    
    async def render(self, url: str) -> Dict[str, Any]:
        print(f"🎬 Starting render for: {url}")
        
        browser = await self.start_browser()
        page = await browser.new_page()
        
        try:
            # Set user agent
            await page.set_extra_http_headers({
                'User-Agent': self.config.user_agent
            })
            
            # Block unnecessary resources but allow all
            await page.route("**/*", lambda route: route.abort() 
                        if route.request.resource_type in ["image", "font", "media"] 
                        else route.continue_())
            
            print("🌐 Navigating to page...")
            response = await page.goto(url, wait_until="domcontentloaded", timeout=self.config.max_render_time_ms)
            
            if not response:
                raise Exception("No response received")
            
            print(f"📊 Response status: {response.status}")
            
            # Wait for page to load
            await page.wait_for_timeout(3000)
            
            # Get page content
            html = await page.content()
            print(f"📄 Retrieved HTML length: {len(html)} characters")
            
            # FIX: Replace localhost URLs with actual domain
            html = self._fix_asset_urls(html, self.config.base_origin)
            
            # Clean HTML
            html = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', html)
            html = re.sub(r'<link\b[^>]*rel=["\']manifest["\'][^>]*>', '', html)
            
            headers = {
                'content-type': 'text/html',
                'x-prerendered': '1'
            }
            
            print("✅ Render completed successfully")
            return {
                "html": html,
                "status": response.status,
                "headers": headers
            }
            
        except Exception as e:
            print(f"💥 Error: {e}")
            return {
                "html": f"<html><body><h1>Error: {e}</h1></body></html>",
                "status": 500,
                "headers": {}
            }
        finally:
            await page.close()

    def _fix_asset_urls(self, html: str, base_origin: str) -> str:
        """Fix asset URLs that point to localhost"""
        import re
        
        # Replace localhost:8000 with actual domain
        html = re.sub(
            r'http://localhost:8000', 
            base_origin, 
            html, 
            flags=re.IGNORECASE
        )
        
        # Also fix relative URLs that might be using base href
        html = re.sub(
            r'href="/(.*?)"', 
            f'href="{base_origin}/\\1"', 
            html
        )
        
        # Fix src attributes
        html = re.sub(
            r'src="/(.*?)"', 
            f'src="{base_origin}/\\1"', 
            html
        )
        
        # Fix manifest.json and other meta URLs
        html = re.sub(
            r'content="/(.*?)"', 
            f'content="{base_origin}/\\1"', 
            html
        )
        
        print("🔧 Fixed asset URLs to point to actual domain")
        return html
    async def close(self):
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()