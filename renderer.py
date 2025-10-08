import requests
from bs4 import BeautifulSoup
import re
from typing import Dict, Any

class SimpleRenderer:
    def __init__(self, config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.config.user_agent
        })
    
    async def render(self, url: str) -> Dict[str, Any]:
        try:
            print(f"🎬 Fetching: {url}")
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts
            for script in soup(["script", "style"]):
                script.decompose()
            
            html = str(soup)
            
            # Fix asset URLs (same as your original fix)
            html = self._fix_asset_urls(html, self.config.base_origin)
            
            print(f"✅ Successfully fetched: {len(html)} characters")
            
            return {
                "html": html,
                "status": response.status_code,
                "headers": {
                    'content-type': 'text/html',
                    'x-prerendered': '1'
                }
            }
            
        except Exception as e:
            print(f"💥 Error: {e}")
            return {
                "html": f"<html><body><h1>Error: {e}</h1></body></html>",
                "status": 500,
                "headers": {}
            }
    
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
        
        # Fix relative URLs
        html = re.sub(
            r'href="/(.*?)"', 
            f'href="{base_origin}/\\1"', 
            html
        )
        
        html = re.sub(
            r'src="/(.*?)"', 
            f'src="{base_origin}/\\1"', 
            html
        )
        
        print("🔧 Fixed asset URLs")
        return html