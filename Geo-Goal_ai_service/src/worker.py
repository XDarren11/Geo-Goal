"""Background worker that polls for pending analysis jobs and processes them."""
from __future__ import annotations

import asyncio
import os
import traceback
from typing import Any, Optional

import numpy as np

from api_client import APIClient
from m2m_client import M2MClient
from video_processor import VideoProcessor


class AnalysisWorker:
    """Polls Geo-Goal backend for queued analysis jobs and processes them."""

    def __init__(
        self,
        api_client: APIClient,
        poll_interval: int = 30,
        model_name: str = "yolov8n.pt",
        device: str = "cpu",
    ) -> None:
        self.api = api_client
        self.poll_interval = poll_interval
        self.model_name = model_name
        self.device = device
        self._running = False
        self._current_job: Optional[int] = None

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def current_job(self) -> Optional[int]:
        return self._current_job

    async def start(self) -> None:
        """Start the polling loop."""
        self._running = True
        print(f"[worker] Starting — poll interval: {self.poll_interval}s, device: {self.device}")
        while self._running:
            try:
                await self._poll_and_process()
            except Exception as e:
                print(f"[worker] Poll loop error: {e}")
                traceback.print_exc()
            await asyncio.sleep(self.poll_interval)

    def stop(self) -> None:
        """Gracefully stop the worker."""
        self._running = False
        print("[worker] Stopping...")

    async def process_job(self, job: dict) -> None:
        """Process a single analysis job end-to-end."""
        job_id = job["jobId"]
        match_id = job["matchId"]
        video_url = job.get("videoSupabaseUrl")
        src_pts_raw = job.get("srcPts")

        if not video_url:
            print(f"[worker] Job {job_id}: no videoSupabaseUrl, skipping")
            return

        if not src_pts_raw:
            print(f"[worker] Job {job_id}: no srcPts, skipping")
            return

        self._current_job = job_id
        output_dir = f"./output/{match_id}"
        video_path: Optional[str] = None

        try:
            # 1. Claim the job
            print(f"[worker] Job {job_id}: claiming match {match_id}...")
            claimed = self.api.claim_analysis_job(match_id)
            print(f"[worker] Job {job_id}: claimed — status: {claimed.get('status')}")

            # 2. Download video from Supabase
            self.api.report_progress(match_id, "processing", progress=5, current_step="downloading")
            print(f"[worker] Job {job_id}: downloading video from {video_url}...")
            video_path = self.api.download_video(video_url, f"./uploads/{match_id}.mp4")

            # 3. Build src_pts array
            src_pts = np.array([[pt["x"], pt["y"]] for pt in src_pts_raw], dtype=np.float32)

            # 4. Process video
            print(f"[worker] Job {job_id}: processing video...")
            player_tags = job.get("playerTags")
            print(f"[worker] Job {job_id}: {len(player_tags) if player_tags else 0} player tags from job")
            vp = VideoProcessor(
                model_name=self.model_name,
                device=self.device,
                api_base=self.api.api_base,
                output_dir=output_dir,
                player_tags=player_tags,
            )
            vp.load_video(video_path)
            vp.set_homography(src_pts=src_pts, method="cv2")

            # Override progress reporting to go through our API client
            self._instrument_progress(vp, match_id)

            vp.process(
                export_json="match_data.json",
                push_match_id=match_id,
            )

            # 5. Mark completed
            self.api.report_progress(
                match_id, "completed",
                progress=100, current_step="done",
                frames_processed=vp._total_frames,
                total_frames=vp._total_frames,
            )
            print(f"[worker] Job {job_id}: completed successfully")

        except Exception as e:
            error_msg = str(e)[:1000]
            print(f"[worker] Job {job_id}: FAILED — {error_msg}")
            traceback.print_exc()
            try:
                self.api.report_progress(
                    match_id, "failed",
                    progress=0, current_step="error",
                    error_msg=error_msg,
                )
            except Exception as report_err:
                print(f"[worker] Job {job_id}: failed to report failure: {report_err}")

        finally:
            self._current_job = None
            # Cleanup downloaded video
            if video_path:
                try:
                    os.unlink(video_path)
                    print(f"[worker] Job {job_id}: cleaned up {video_path}")
                except Exception:
                    pass

    def _instrument_progress(self, vp: VideoProcessor, match_id: int) -> None:
        """Wrap the exporter to use our API client for progress reporting."""

        def _report(
            _match_id: int,
            _m2m_token: str,
            status: str,
            progress: int = 0,
            current_step: str = "",
            frames_processed: Optional[int] = None,
            total_frames: Optional[int] = None,
            error_msg: str = "",
        ) -> None:
            try:
                self.api.report_progress(
                    match_id,
                    status,
                    progress=progress,
                    current_step=current_step,
                    frames_processed=frames_processed,
                    total_frames=total_frames,
                    error_msg=error_msg,
                )
            except Exception as e:
                print(f"[worker] Progress report failed: {e}")

        vp.exporter.report_progress = _report  # type: ignore

        def _push(_match_id: int, _m2m_token: str) -> Any:
            payload = {
                "pitch": {"length_m": 105.0, "width_m": 68.0},
                "frames": vp.exporter._frames,
            }
            return self.api.push_tracking_batch(match_id, payload)

        vp.exporter.push_to_api = _push  # type: ignore

    async def _poll_and_process(self) -> None:
        """Check for pending jobs and process the first available one."""
        try:
            jobs = self.api.get_pending_analysis()
        except Exception as e:
            print(f"[worker] Failed to fetch pending jobs: {e}")
            return

        if not jobs:
            return

        print(f"[worker] Found {len(jobs)} pending job(s)")

        # Process only the first pending job per poll cycle
        job = jobs[0]
        await self.process_job(job)
