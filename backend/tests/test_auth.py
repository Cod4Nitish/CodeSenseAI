"""Integration tests for the authentication routes. by Nitish Singh"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def test_register_returns_token_and_profile(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "bob@example.com", "full_name": "Bob", "password": "Passw0rd"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "bob@example.com"
    assert body["user"]["plan"] == "Developer Pro"
    assert "hashed_password" not in body["user"]


async def test_register_rejects_weak_password(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "weak@example.com", "full_name": "Weak", "password": "allletters"},
    )
    assert resp.status_code == 422


async def test_register_rejects_bad_email(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "full_name": "X", "password": "Passw0rd"},
    )
    assert resp.status_code == 422


async def test_duplicate_email_conflicts(client: AsyncClient, registered: dict):
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": registered["email"],
            "full_name": "Impostor",
            "password": "Passw0rd1",
        },
    )
    assert resp.status_code == 409


async def test_login_happy_path(client: AsyncClient, registered: dict):
    resp = await client.post(
        "/api/auth/login",
        json={"email": registered["email"], "password": registered["password"]},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == registered["email"]


async def test_login_wrong_password_is_401(client: AsyncClient, registered: dict):
    resp = await client.post(
        "/api/auth/login",
        json={"email": registered["email"], "password": "wrong-password"},
    )
    assert resp.status_code == 401


async def test_me_requires_bearer_token(client: AsyncClient):
    assert (await client.get("/api/auth/me")).status_code == 401


async def test_me_returns_profile_with_token(client: AsyncClient, registered: dict):
    resp = await client.get("/api/auth/me", headers=registered["headers"])
    assert resp.status_code == 200
    assert resp.json()["email"] == registered["email"]


async def test_me_rejects_garbage_token(client: AsyncClient):
    resp = await client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"}
    )
    assert resp.status_code == 401


async def test_demo_login_is_idempotent(client: AsyncClient):
    first = await client.post("/api/auth/demo")
    second = await client.post("/api/auth/demo")
    assert first.status_code == second.status_code == 200
    assert first.json()["user"]["id"] == second.json()["user"]["id"]
    assert first.json()["user"]["is_demo"] is True
