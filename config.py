import os
from typing import List

class Config:
    def __init__(self):
        self.base_origin = os.getenv("BASE_ORIGIN", "https://www.puzzle-technology.com")
        self.port = int(os.getenv("PORT", "8000"))
        self.user_agent = os.getenv("RENDER_USER_AGENT", "Mozilla/5.0 (compatible; PrerenderBot/1.0)")
        self.max_render_time_ms = int(os.getenv("MAX_RENDER_TIME_MS", "15000"))
        
        # Wait strategy
        wait_strategy = os.getenv("WAIT_STRATEGY", "network-idle")
        if wait_strategy == "selector":
            self.wait_strategy = {"type": "selector", "selector": os.getenv("WAIT_SELECTOR", "#root")}
        elif wait_strategy == "timeout":
            self.wait_strategy = {"type": "timeout"}
        else:
            self.wait_strategy = {"type": "network-idle"}