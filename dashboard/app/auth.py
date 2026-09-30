"""Optional passcode for the caregiver screens.

Off unless the environment variable TRODES_PASSCODE is set (4-8 digits), so the
self-test, the simulator and every existing set-up behave exactly as before.

When it is on:
  * the device ingest endpoints (POST /api/v1/status, /alert, /door) and
    GET /api/v1/health stay open - the wearable and the door nodes carry no
    passcode, so the firmware needs no change;
  * the "home" page and its files (/static/v2/...) and /api/v1/auth/* stay open,
    because the page is where the passcode is typed; it holds no data itself;
  * everything else - the classic page, every read endpoint and Acknowledge -
    needs the session cookie set by POST /api/v1/auth/login. A page request
    without it is sent to the login screen, an API request gets 401;
  * five wrong codes within 5 minutes lock the login for 60 s. The lock is
    global, not per address: behind a tunnel every request arrives from the
    tunnel's own address.

The session is an HMAC of its issue time with a key made at start-up, so it
lasts 12 hours and a server restart signs everyone out.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

PASSCODE = os.environ.get("TRODES_PASSCODE", "").strip()
COOKIE = "trodes_session"
MAX_AGE_S = 12 * 3600
LOCK_AFTER = 5
LOCK_WINDOW_S = 300
LOCK_FOR_S = 60

_KEY = secrets.token_bytes(32)
_failures: list[float] = []
_locked_until = 0.0

OPEN_EXACT = {
    ("POST", "/api/v1/status"),
    ("POST", "/api/v1/alert"),
    ("POST", "/api/v1/door"),
    ("GET", "/api/v1/health"),
    ("GET", "/"),              # the home page itself carries the lock screen, no data
}
OPEN_PREFIXES = ("/static/v2/", "/api/v1/auth/")
LOGIN_PAGE = "/"


def enabled() -> bool:
    return bool(PASSCODE)


def _sign(issued: int) -> str:
    mac = hmac.new(_KEY, str(issued).encode(), hashlib.sha256).hexdigest()
    return f"{issued}.{mac}"


def _valid(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    issued = token.split(".", 1)[0]
    if not issued.isdigit() or time.time() - int(issued) > MAX_AGE_S:
        return False
    return hmac.compare_digest(_sign(int(issued)), token)


def authenticated(request: Request) -> bool:
    return (not enabled()) or _valid(request.cookies.get(COOKIE))


async def middleware(request: Request, call_next):
    if not enabled():
        return await call_next(request)
    path, method = request.url.path, request.method
    if (method == "OPTIONS" or (method, path) in OPEN_EXACT
            or path.startswith(OPEN_PREFIXES) or authenticated(request)):
        return await call_next(request)
    if path.startswith("/api/"):
        return JSONResponse({"detail": "passcode required"}, status_code=401)
    return RedirectResponse(LOGIN_PAGE, status_code=303)


router = APIRouter()


class LoginIn(BaseModel):
    passcode: str


@router.get("/api/v1/auth/status")
def auth_status(request: Request):
    return {
        "required": enabled(),
        "authenticated": authenticated(request),
        "length": len(PASSCODE) if enabled() else 0,
    }


@router.post("/api/v1/auth/login")
def auth_login(body: LoginIn):
    global _locked_until
    if not enabled():
        return {"ok": True}
    t = time.time()
    if t < _locked_until:
        return JSONResponse({"ok": False, "locked_for": int(_locked_until - t) + 1}, status_code=429)
    if hmac.compare_digest(body.passcode.strip().encode(), PASSCODE.encode()):
        _failures.clear()
        resp = JSONResponse({"ok": True})
        resp.set_cookie(COOKIE, _sign(int(t)), max_age=MAX_AGE_S, httponly=True, samesite="lax", path="/")
        return resp
    _failures[:] = [f for f in _failures if t - f < LOCK_WINDOW_S] + [t]
    if len(_failures) >= LOCK_AFTER:
        _failures.clear()
        _locked_until = t + LOCK_FOR_S
        return JSONResponse({"ok": False, "locked_for": LOCK_FOR_S}, status_code=429)
    return JSONResponse({"ok": False, "tries_left": LOCK_AFTER - len(_failures)}, status_code=401)


@router.post("/api/v1/auth/logout")
def auth_logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE, path="/")
    return resp
