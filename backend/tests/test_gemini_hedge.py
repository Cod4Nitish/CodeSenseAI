"""Multi-key hedging for Gemini calls: slow key is raced, failing key falls through, all-fail raises."""
import asyncio
import time

import pytest

from services import gemini_service as g


@pytest.fixture
def three_keys(monkeypatch):
    monkeypatch.setattr(g, "_clients", ["k1", "k2", "k3"])
    monkeypatch.setattr(g, "_HEDGE_S", 0.15)


def _run(coro):
    return asyncio.run(coro)


def test_slow_first_key_is_raced_by_second(three_keys, monkeypatch):
    async def fake(model, up, sp=None, client=None):
        if client == "k1":
            await asyncio.sleep(5)   # hung request
            return "slow"
        return f"fast-{client}"

    monkeypatch.setattr(g, "_call_model", fake)
    t = time.perf_counter()
    out = _run(g._call_hedged("m", "p"))
    assert out == "fast-k2"
    assert time.perf_counter() - t < 1.5   # did not wait for the hung key


def test_failed_key_falls_through_immediately(three_keys, monkeypatch):
    async def fake(model, up, sp=None, client=None):
        if client in ("k1", "k2"):
            raise RuntimeError("429 RESOURCE_EXHAUSTED")
        return "ok-k3"

    monkeypatch.setattr(g, "_call_model", fake)
    t = time.perf_counter()
    assert _run(g._call_hedged("m", "p")) == "ok-k3"
    assert time.perf_counter() - t < 1.0   # no hedge delay when a key fails outright


def test_all_keys_fail_raises_first_error(three_keys, monkeypatch):
    async def fake(model, up, sp=None, client=None):
        raise RuntimeError(f"boom-{client}")

    monkeypatch.setattr(g, "_call_model", fake)
    with pytest.raises(RuntimeError, match="boom-k1"):
        _run(g._call_hedged("m", "p"))


def test_single_key_is_a_plain_call(monkeypatch):
    monkeypatch.setattr(g, "_clients", ["only"])
    calls = []

    async def fake(model, up, sp=None, client=None):
        calls.append(client)
        return "ok"

    monkeypatch.setattr(g, "_call_model", fake)
    assert _run(g._call_hedged("m", "p")) == "ok"
    assert calls == ["only"]
