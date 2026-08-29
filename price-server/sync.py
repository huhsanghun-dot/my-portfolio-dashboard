"""
Tiny cross-device sync store: lets the dashboard share its (otherwise
localStorage-only) holdings/transactions between devices via a short code,
with no user accounts. Backed by Upstash Redis's REST API (a free managed
key-value store — no fixed IP or long-lived server process needed, so it
fits the same "free host" constraint as the rest of this service).

Config (set as Secrets in the Render dashboard):
  UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
"""
import os
import secrets
import string

import requests

MAX_BYTES = 300_000
CODE_ALPHABET = "".join(c for c in string.ascii_uppercase + string.digits if c not in "0O1IL")
CODE_LENGTH = 6
# A code is inactive for a very long time before Upstash expires it, so an
# abandoned device pairing doesn't linger in storage forever.
TTL_SECONDS = 60 * 60 * 24 * 365


class SyncNotConfigured(Exception):
    pass


class SyncNotFound(Exception):
    pass


class SyncTooLarge(Exception):
    pass


def _base_url() -> str:
    url = os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        raise SyncNotConfigured()
    return url, token


def _key(code: str) -> str:
    return f"pf-sync:{code}"


def _generate_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def create_sync(body: str) -> str:
    if len(body.encode("utf-8")) > MAX_BYTES:
        raise SyncTooLarge()
    url, token = _base_url()
    headers = {"Authorization": f"Bearer {token}"}

    for _ in range(5):
        code = _generate_code()
        # setnx only writes if the key doesn't exist yet, so two near-simultaneous
        # sign-ups can never silently collide onto the same code.
        res = requests.post(f"{url}/setnx/{_key(code)}", headers=headers, data=body, timeout=10)
        res.raise_for_status()
        if res.json().get("result") == 1:
            requests.post(f"{url}/expire/{_key(code)}/{TTL_SECONDS}", headers=headers, timeout=10)
            return code
    raise RuntimeError("failed to allocate a unique sync code")


def read_sync(code: str) -> str:
    url, token = _base_url()
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{url}/get/{_key(code)}", headers=headers, timeout=10)
    res.raise_for_status()
    value = res.json().get("result")
    if value is None:
        raise SyncNotFound()
    return value


def write_sync(code: str, body: str) -> None:
    if len(body.encode("utf-8")) > MAX_BYTES:
        raise SyncTooLarge()
    url, token = _base_url()
    headers = {"Authorization": f"Bearer {token}"}

    exists = requests.get(f"{url}/exists/{_key(code)}", headers=headers, timeout=10)
    exists.raise_for_status()
    if exists.json().get("result") != 1:
        raise SyncNotFound()

    res = requests.post(f"{url}/set/{_key(code)}", headers=headers, data=body, timeout=10)
    res.raise_for_status()
    requests.post(f"{url}/expire/{_key(code)}/{TTL_SECONDS}", headers=headers, timeout=10)
