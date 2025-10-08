from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from simple_renderer import SimpleRenderer  # CHANGED THIS LINE
from config import Config

app = FastAPI(title="Prerender Service")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load config
config = Config()
renderer = SimpleRenderer(config)  # CHANGED THIS LINE

@app.get("/")
async def root():
    return {"status": "Prerender service up"}

@app.get("/healthz")
async def health_check():
    return {"ok": True}

@app.get("/render")
async def render_url(url: str = Query(..., description="URL to render")):
    try:
        if not url.startswith('/'):
            raise HTTPException(status_code=400, detail="URL must start with /")
        
        full_url = f"{config.base_origin}{url}"
        result = await renderer.render(full_url)
        
        return HTMLResponse(
            content=result["html"],
            status_code=result["status"],
            headers=result["headers"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.port)