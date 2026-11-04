"""
CodeSense AI — password hashing and JWT issuance / verification.
by Nitish Singh

Design notes
------------
* Passwords are hashed with **bcrypt** directly (the ``bcrypt`` package) rather
  than through ``passlib``. ``passlib`` has been unmaintained since 2020 and its
  bcrypt backend breaks against ``bcrypt >= 4.1``; calling ``bcrypt`` straight is
  fewer moving parts and fully supported on Python 3.14.
* bcrypt silently truncates input beyond 72 bytes. We hash-normalise longer
  passphrases through SHA-256 first (then base64) so the *entire* secret
  contributes entropy — a standard mitigation with no 72-byte cliff.
* Tokens are stateless HS256 JWTs: ``sub`` (user id), ``iat``, ``exp`` and a
  ``type`` claim so an access token can never be replayed where another token
  class is expected.
"""

from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Final

import bcrypt
from jose import JWTError, jwt

from core.config import settings

_BCRYPT_MAX_BYTES: Final = 72
ACCESS_TOKEN_TYPE: Final = "access"


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def _normalise(password: str) -> bytes:
    """
    Return a byte string safe to feed to bcrypt.

    Short passwords pass straight through. Anything longer than bcrypt's 72-byte
    limit is folded through SHA-256 + base64 so no entropy is silently dropped.
    """
    raw = password.encode("utf-8")
    if len(raw) <= _BCRYPT_MAX_BYTES:
        return raw
    return base64.b64encode(hashlib.sha256(raw).digest())


def hash_password(password: str) -> str:
    """Hash a plaintext password. Returns a UTF-8 bcrypt digest string."""
    salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    return bcrypt.hashpw(_normalise(password), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time comparison of a candidate password against a stored digest."""
    try:
        return bcrypt.checkpw(_normalise(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed hash on record — treat as a failed match, never raise.
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
def create_access_token(
    subject: str | int,
    *,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """
    Mint a signed access token.

    Args:
        subject: The user identifier placed in the ``sub`` claim.
        expires_delta: Optional lifetime override; defaults to the configured
            ``access_token_expire_minutes``.
        extra_claims: Optional additional claims merged into the payload.

    Returns:
        A compact-serialised JWT string.
    """
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": ACCESS_TOKEN_TYPE,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Verify signature + expiry and return the token payload.

    Raises:
        ValueError: If the token is invalid, expired, or not an access token.
    """
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
    except JWTError as exc:  # signature / expiry / malformed
        raise ValueError(f"Could not validate credentials: {exc}") from exc

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise ValueError("Wrong token type.")
    if "sub" not in payload:
        raise ValueError("Token is missing a subject.")
    return payload
