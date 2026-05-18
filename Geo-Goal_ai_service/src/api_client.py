"""API client that uses M2MClient for auth — interacts with Geo-Goal backend."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import requests

from m2m_client import M2MClient


class APIClient:
    def __init__(self, api_base: str, m2m: M2MClient):
        self.api_base = api_base.rstrip("/")
        self.m2m = m2m

    def _headers(self) -> Dict[str, str]:
        token = self.m2m.get_token()
        return {"Authorization": f"Bearer {token}"}

    # ------------------------------------------------------------------
    # Public endpoints
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Analysis job endpoints (for AI service worker)
    # ------------------------------------------------------------------

    def get_pending_analysis(self) -> List[Dict[str, Any]]:
        """Fetch all queued analysis jobs ready for processing."""
        url = f"{self.api_base}/public/matches/pending-analysis"
        r = requests.get(url, headers=self._headers(), timeout=20)
        r.raise_for_status()
        return r.json()

    def claim_analysis_job(self, match_id: int) -> Dict[str, Any]:
        """Claim a queued job for processing. Returns 409 if already claimed."""
        url = f"{self.api_base}/public/matches/{match_id}/analysis/claim"
        r = requests.put(url, headers=self._headers(), timeout=20)
        r.raise_for_status()
        return r.json()

    def push_tracking_batch(self, match_id: int, payload: Dict[str, Any]) -> Any:
        """POST batch frame data to the Geo-Goal backend."""
        url = f"{self.api_base}/public/matches/{match_id}/tracking/batch"
        r = requests.post(
            url,
            json=payload,
            headers=self._headers(),
            timeout=120,
        )
        r.raise_for_status()
        return r.json()

    def report_progress(
        self,
        match_id: int,
        status: str,
        progress: int = 0,
        current_step: str = "",
        frames_processed: Optional[int] = None,
        total_frames: Optional[int] = None,
        error_msg: str = "",
    ) -> Any:
        """PUT progress update to Geo-Goal backend."""
        url = f"{self.api_base}/public/matches/{match_id}/analysis/progress"
        payload: Dict[str, Any] = {"status": status, "progress": progress}
        if current_step:
            payload["currentStep"] = current_step
        if frames_processed is not None:
            payload["framesProcessed"] = frames_processed
        if total_frames is not None:
            payload["totalFrames"] = total_frames
        if error_msg:
            payload["error"] = error_msg
        r = requests.put(
            url,
            json=payload,
            headers=self._headers(),
            timeout=20,
        )
        r.raise_for_status()
        return r.json()

    def download_video(self, url: str, dest_path: str) -> str:
        """Download a video from Supabase URL to a local path. Returns dest_path."""
        dest = Path(dest_path)
        dest.parent.mkdir(parents=True, exist_ok=True)

        with httpx.stream("GET", url, follow_redirects=True, timeout=600) as r:
            r.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in r.iter_bytes(chunk_size=8 * 1024 * 1024):
                    f.write(chunk)

        print(f"[download] {url} -> {dest} ({dest.stat().st_size} bytes)")
        return str(dest)
