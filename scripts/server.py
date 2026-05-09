"""
Production server — FastAPI + HTTP Basic Auth + static file serving.
Serves the built React dashboard (/dashboard/dist) with authentication.

Configuration via environment variables:
  DASH_USER     dashboard username  (default: admin)
  DASH_PASSWORD dashboard password  (REQUIRED in production)
  DASH_PORT     port to listen on   (default: 8000)

Usage:
  set DASH_PASSWORD=sua_senha_aqui
  python scripts/server.py
"""
import os
import secrets
from pathlib import Path

# Load .env if present (without requiring python-dotenv)
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles

ROOT      = Path(__file__).resolve().parent.parent
DIST_DIR  = ROOT / "dashboard" / "dist"

DASH_USER     = os.environ.get("DASH_USER",     "admin")
DASH_PASSWORD = os.environ.get("DASH_PASSWORD", "")
DASH_PORT     = int(os.environ.get("DASH_PORT", "8000"))

if not DASH_PASSWORD:
    raise RuntimeError(
        "\n\nDASH_PASSWORD não definida.\n"
        "Defina antes de iniciar o servidor:\n"
        "  Windows: set DASH_PASSWORD=sua_senha\n"
        "  Linux:   export DASH_PASSWORD=sua_senha\n"
    )

if not DIST_DIR.exists():
    raise RuntimeError(
        f"\nBuild do dashboard não encontrado em: {DIST_DIR}\n"
        "Execute primeiro:\n"
        "  cd dashboard && npm run build\n"
    )

import base64

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

SECURITY_HEADERS = {
    "X-Content-Type-Options":    "nosniff",
    "X-Frame-Options":           "DENY",
    "X-XSS-Protection":          "1; mode=block",
    "Referrer-Policy":           "strict-origin-when-cross-origin",
    "Cache-Control":             "no-store",
    "Content-Security-Policy":   (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self';"
    ),
}

_REALM = 'Basic realm="FP&A Dashboard"'


@app.middleware("http")
async def auth_and_headers(request: Request, call_next):
    # /health is public
    if request.url.path == "/health":
        response = await call_next(request)
        for k, v in SECURITY_HEADERS.items():
            response.headers[k] = v
        return response

    # All other routes require Basic Auth
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Basic "):
        return Response(status_code=401, headers={"WWW-Authenticate": _REALM})

    try:
        decoded = base64.b64decode(authorization[6:]).decode("utf-8")
        username, password = decoded.split(":", 1)
    except Exception:
        return Response(status_code=401, headers={"WWW-Authenticate": _REALM})

    user_ok = secrets.compare_digest(username.encode(), DASH_USER.encode())
    pass_ok = secrets.compare_digest(password.encode(), DASH_PASSWORD.encode())
    if not (user_ok and pass_ok):
        return Response(status_code=401, headers={"WWW-Authenticate": _REALM})

    response = await call_next(request)
    for k, v in SECURITY_HEADERS.items():
        response.headers[k] = v
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="static")


if __name__ == "__main__":
    print(f"\n  Dashboard: http://localhost:{DASH_PORT}")
    print(f"  Usuário:   {DASH_USER}")
    print(f"  Senha:     {'*' * len(DASH_PASSWORD)}\n")
    uvicorn.run(app, host="0.0.0.0", port=DASH_PORT)
