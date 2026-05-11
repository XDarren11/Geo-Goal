"""Simple API client that uses M2MClient for auth."""
from __future__ import annotations

import os
from typing import Any, Dict

import requests

from m2m_client import M2MClient


class APIClient:
    def __init__(self, api_base: str, m2m: M2MClient):
        self.api_base = api_base.rstrip("/")
        self.m2m = m2m

    def _headers(self) -> Dict[str, str]:
        token = self.m2m.get_token()
        return {"Authorization": f"Bearer {token}"}

    def get_match_analytics(self, match_id: int) -> Any:
        url = f"{self.api_base}/public/matches/{match_id}/analytics"
        r = requests.get(url, headers=self._headers(), timeout=20)
        r.raise_for_status()
        return r.json()

    def get_match_detail(self, match_id: int) -> Any:
        url = f"{self.api_base}/public/matches/{match_id}/detail"
        r = requests.get(url, headers=self._headers(), timeout=20)
        r.raise_for_status()
        return r.json()
