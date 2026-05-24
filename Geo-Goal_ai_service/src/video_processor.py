"""
Geo-Goal AI Video Processor — Phase 1
Pipeline: Detection → Homography → Perspective Transform → Export

Core mathematical foundation (thesis OE1-OE4):
  - DLT (Direct Linear Transform) for homography estimation
  - Homogeneous coordinates [x, y, 1]^T
  - 3x3 homography matrix H mapping source (pixels) → destination (pitch coords)
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import supervision as sv
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Standard football pitch dimensions (metres) — FIFA ranges: 100-110 x 64-75
PITCH_LENGTH_M = 105.0
PITCH_WIDTH_M = 68.0

# Default source points (pixel coords) for a tactical-cam frame of
# Belgium vs Russia EURO 2020 — override with manual annotation.
# These are example values; you MUST run annotate_keypoints() on your frame.
DEFAULT_SRC_PTS = np.array(
    [
        [509, 183],   # top-left corner of penalty area (or pitch corner)
        [639, 307],  # top-right
        [0, 306],  # bottom-right
        [125, 184],   # bottom-left
    ],
    dtype=np.float32,
)

# Corresponding pitch-coordinate destination (metres from top-left origin)
DEFAULT_DST_PTS = np.array(
    [
        [0, 0],
        [PITCH_LENGTH_M, 0],
        [PITCH_LENGTH_M, PITCH_WIDTH_M],
        [0, PITCH_WIDTH_M],
    ],
    dtype=np.float32,
)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class Player2D:
    """A player projected onto the 2D pitch plane."""

    id: int
    x: float  # metres (length axis)
    y: float  # metres (width axis)
    team: str  # "home" | "away" | "referee" | "unknown"


@dataclass
class FrameData:
    """All extracted data for a single video frame."""

    frame_idx: int
    timestamp_ms: int
    players: List[Player2D] = field(default_factory=list)
    ball: Optional[Tuple[float, float]] = None  # (x, y) in metres
    confidence: float = 1.0  # mean YOLO detection confidence for this frame


# ---------------------------------------------------------------------------
# 1. Object Detector (YOLOv8)
# ---------------------------------------------------------------------------


class ObjectDetector:
    """Wraps a YOLO model for player/ball detection.

    COCO classes used:
      0  — person   → player
      32 — sports ball → football
    """

    def __init__(self, model_name: str = "yolov8n.pt", device: str = "cpu") -> None:
        self.model = YOLO(model_name)
        self.device = device

    def detect(self, frame: np.ndarray, conf: float = 0.3) -> sv.Detections:
        """Run inference and return supervision Detections filtered to person+ball."""
        results = self.model(frame, device=self.device, conf=conf, verbose=False)
        if results[0].boxes is None:
            return sv.Detections.empty()
        detections = sv.Detections.from_ultralytics(results[0])
        # Keep only COCO classes we care about
        mask = np.isin(detections.class_id, [0, 32])
        return detections[mask]


# ---------------------------------------------------------------------------
# 2. Object Tracker (ByteTrack via supervision)
# ---------------------------------------------------------------------------


class ObjectTracker:
    """Assigns persistent IDs to players across frames using ByteTrack."""

    def __init__(self) -> None:
        self.tracker = sv.ByteTrack()

    def track(self, detections: sv.Detections) -> sv.Detections:
        """Update tracker and return detections with tracker_id field."""
        return self.tracker.update_with_detections(detections)


# ---------------------------------------------------------------------------
# 3. Team Classifier (K-Means on jersey colour)
# ---------------------------------------------------------------------------


class TeamClassifier:
    """Separates players into two teams + referee by clustering jersey colours.

    Algorithm:
      1. Extract a tight crop of each player's upper body from their bbox.
      2. Build a colour histogram in HSV space.
      3. Run K-Means (k=3) to partition into home / away / referee clusters.
      4. If player_tags are provided, override labels for matched detections.
    """

    def __init__(self, player_tags: Optional[List[Dict[str, Any]]] = None) -> None:
        self._centroids: Optional[np.ndarray] = None
        self._home_label: Optional[int] = None
        self._away_label: Optional[int] = None
        self._ref_label: Optional[int] = None
        self._player_tags = player_tags  # [{ x, y, label }, ...] in pixel coords

    def fit_predict(
        self,
        frame: np.ndarray,
        detections: sv.Detections,
    ) -> List[str]:
        """Fit K-Means on first call; return team labels for every detection."""
        from sklearn.cluster import KMeans

        features = self._extract_colour_features(frame, detections)

        if len(features) < 3:
            return ["unknown"] * len(detections)

        kmeans = KMeans(n_clusters=3, n_init=10, random_state=42)
        labels = kmeans.fit_predict(features)
        self._centroids = kmeans.cluster_centers_

        # Heuristic: referee wears black/dark -> lowest V channel mean
        v_means = [self._centroids[i][2] for i in range(3)]
        self._ref_label = int(np.argmin(v_means))

        # Remaining two clusters are the teams
        team_ids = [i for i in range(3) if i != self._ref_label]
        self._home_label = team_ids[0]
        self._away_label = team_ids[1]

        result = self._label(labels)

        # Override with player_tags (ground truth)
        if self._player_tags:
            result = self._apply_player_tags(detections, result)

        return result

    def predict(self, frame: np.ndarray, detections: sv.Detections) -> List[str]:
        """Re-use fitted clusters on subsequent frames."""
        if self._centroids is None or len(detections) == 0:
            return self.fit_predict(frame, detections)

        features = self._extract_colour_features(frame, detections)
        dists = np.linalg.norm(features[:, None, :] - self._centroids[None, :, :], axis=2)
        labels = np.argmin(dists, axis=1)
        return self._label(labels)

    def _apply_player_tags(
        self,
        detections: sv.Detections,
        current_labels: List[str],
    ) -> List[str]:
        """Override labels for detections closest to each player tag."""
        if not self._player_tags or len(detections) == 0:
            return current_labels

        labels = list(current_labels)
        used_detections: set = set()

        for tag in self._player_tags:
            tx, ty = tag.get("x", 0), tag.get("y", 0)
            tag_label = tag.get("label", "unknown")
            if tag_label == "referee":
                continue  # skip unlabeled

            # Find nearest detection bbox center
            best_idx = -1
            best_dist = float("inf")
            for i, xyxy in enumerate(detections.xyxy.astype(int)):
                if i in used_detections:
                    continue
                cx = (xyxy[0] + xyxy[2]) / 2.0
                cy = (xyxy[1] + xyxy[3]) / 2.0
                dist = (cx - tx) ** 2 + (cy - ty) ** 2
                if dist < best_dist:
                    best_dist = dist
                    best_idx = i

            # Only override if within reasonable distance (150px radius)
            if best_idx >= 0 and best_dist < 150 * 150:
                labels[best_idx] = tag_label
                used_detections.add(best_idx)

        return labels

    # ------------------------------------------------------------------
    def _extract_colour_features(
        self, frame: np.ndarray, detections: sv.Detections
    ) -> np.ndarray:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        feats = []
        for xyxy in detections.xyxy.astype(int):
            x1, y1, x2, y2 = xyxy
            # Upper third of the bounding box (jersey region)
            crop = hsv[y1 : y1 + (y2 - y1) // 3, x1:x2]
            if crop.size == 0:
                feats.append([0, 0, 0])
                continue
            # Mean H, S, V — robust to small variations
            h_mean = np.mean(crop[:, :, 0])
            s_mean = np.mean(crop[:, :, 1])
            v_mean = np.mean(crop[:, :, 2])
            feats.append([h_mean, s_mean, v_mean])
        return np.array(feats, dtype=np.float32)

    def _label(self, ids: np.ndarray) -> List[str]:
        result: List[str] = []
        for i in ids:
            if i == self._home_label:
                result.append("home")
            elif i == self._away_label:
                result.append("away")
            elif i == self._ref_label:
                result.append("referee")
            else:
                result.append("unknown")
        return result


# ---------------------------------------------------------------------------
# 4. Homography Calculator (DLT — thesis OE2 & OE3)
# ---------------------------------------------------------------------------


class HomographyCalculator:
    """Estimates the 3×3 homography matrix from ≥4 point correspondences.

    Two implementations provided:
      - _dlt_manual(): for the thesis — documents the linear system explicitly.
      - _dlt_cv2():    production path using OpenCV (RANSAC-robust).
    """

    def compute(
        self,
        src_pts: np.ndarray,  # shape (N, 2) — pixel coordinates
        dst_pts: np.ndarray,  # shape (N, 2) — pitch coordinates (metres)
        method: str = "cv2",
    ) -> np.ndarray:
        """Return 3×3 homography matrix H such that dst ≅ H ⋅ src."""
        if method == "manual":
            return self._dlt_manual(src_pts, dst_pts)
        return self._dlt_cv2(src_pts, dst_pts)

    # ------------------------------------------------------------------
    # Manual DLT (thesis — Objective 2 & 3)
    # ------------------------------------------------------------------
    @staticmethod
    def _dlt_manual(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
        """
        Solve for H using the Direct Linear Transform.

        For each correspondence (x_i, y_i) → (X_i, Y_i) in homogeneous coords:

            [x_i, y_i, 1]^T  →  [X_i, Y_i, 1]^T  (up to scale)

        The cross-product [X_i, Y_i, 1]^T × H ⋅ [x_i, y_i, 1]^T = 0
        yields two linearly-independent equations per point:

            [ 0^T   , -w'_i·p_i^T ,  y'_i·p_i^T ] ⋅ h = 0
            [ w'_i·p_i^T , 0^T    , -x'_i·p_i^T ] ⋅ h = 0

        where p_i = [x_i, y_i, 1], h = vec(H) (9×1 column-major).

        Stacking 2N equations → A·h = 0, solved via SVD.
        """
        N = src.shape[0]
        A = np.zeros((2 * N, 9), dtype=np.float64)

        for i in range(N):
            x, y = src[i]
            X, Y = dst[i]
            # Row 2i:   [0,0,0, -x, -y, -1, Y·x, Y·y, Y]
            A[2 * i] = [0, 0, 0, -x, -y, -1, Y * x, Y * y, Y]
            # Row 2i+1: [x, y, 1,  0,  0,  0, -X·x, -X·y, -X]
            A[2 * i + 1] = [x, y, 1, 0, 0, 0, -X * x, -X * y, -X]

        # SVD: A = U·Σ·V^T  →  h = last column of V (minimum singular vector)
        _, _, Vt = np.linalg.svd(A)
        h = Vt[-1]  # shape (9,)
        H = h.reshape(3, 3)

        # Normalise so H[2, 2] = 1
        return H / H[2, 2]

    # ------------------------------------------------------------------
    # OpenCV DLT with RANSAC (production)
    # ------------------------------------------------------------------
    @staticmethod
    def _dlt_cv2(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
        H, _mask = cv2.findHomography(
            src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.0
        )
        if H is None:
            raise RuntimeError("cv2.findHomography failed — try more/better keypoints")
        return H


# ---------------------------------------------------------------------------
# 5. Perspective Transformer (thesis OE4)
# ---------------------------------------------------------------------------


class PerspectiveTransformer:
    """Applies the homography H to project player pixel coords → pitch coords.

    The *base point* of a player is the midpoint of the bottom edge of their
    bounding box — this approximates where their feet touch the ground,
    which is the point that lies on the pitch plane.
    """

    def __init__(self, H: np.ndarray) -> None:
        self.H = H

    def player_base_point(self, xyxy: np.ndarray) -> Tuple[float, float]:
        """Given bbox [x1, y1, x2, y2], return (px, py) of centre-bottom."""
        x_centre = (xyxy[0] + xyxy[2]) / 2.0
        y_bottom = xyxy[3]  # bottom edge
        return float(x_centre), float(y_bottom)

    def pixel_to_pitch(self, px: float, py: float) -> Tuple[float, float]:
        """Map a single pixel coordinate to pitch metres via H."""
        vec = np.array([[px], [py], [1.0]], dtype=np.float64)
        projected = self.H @ vec
        # De-homogenise
        x = projected[0, 0] / projected[2, 0]
        y = projected[1, 0] / projected[2, 0]
        return float(x), float(y)


# ---------------------------------------------------------------------------
# 6. Data Exporter
# ---------------------------------------------------------------------------


class DataExporter:
    """Serialises FrameData to JSON and optionally POSTs to the Geo-Goal API.

    Backend contract (POST /api/public/matches/:matchId/tracking/batch):
      {
        frames: [{
          timestampMs: number,
          ball: { x?, y?, z? },
          players: [{ playerId, teamId, x, y }],
          source: "video",
          confidence: number,
          coordSystem: "meters",
        }],
        pitch: { length_m, width_m }
      }
    """

    # Map classifier string labels to numeric team IDs
    TEAM_MAP: Dict[str, int] = {"home": 1, "away": 2, "referee": 0, "unknown": -1}

    def __init__(self, output_dir: str, api_base: Optional[str] = None) -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.api_base = api_base
        self._frames: List[Dict[str, Any]] = []

    def add_frame(self, fd: FrameData, confidence: float = 1.0) -> None:
        self._frames.append(
            {
                "timestampMs": fd.timestamp_ms,
                "ball": (
                    {"x": round(fd.ball[0], 3), "y": round(fd.ball[1], 3)}
                    if fd.ball is not None
                    else None
                ),
                "players": [
                    {
                        "playerId": p.id,
                        "teamId": self.TEAM_MAP.get(p.team, -1),
                        "x": round(p.x, 3),
                        "y": round(p.y, 3),
                    }
                    for p in fd.players
                ],
                "source": "video",
                "confidence": round(confidence, 4),
                "coordSystem": "meters",
            }
        )

    def save(self, filename: str = "match_data.json") -> str:
        path = self.output_dir / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "pitch": {"length_m": PITCH_LENGTH_M, "width_m": PITCH_WIDTH_M},
                    "frames": self._frames,
                },
                f,
                indent=2,
            )
        return str(path)

    def push_to_api(
        self, match_id: int, m2m_token: str
    ) -> Any:
        """POST batch frame data to the Geo-Goal backend."""
        import requests

        if not self.api_base:
            raise ValueError("api_base not set — cannot push")
        url = f"{self.api_base.rstrip('/')}/public/matches/{match_id}/tracking/batch"
        payload = {
            "pitch": {"length_m": PITCH_LENGTH_M, "width_m": PITCH_WIDTH_M},
            "frames": self._frames,
        }
        r = requests.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {m2m_token}"},
            timeout=120,
        )
        r.raise_for_status()
        return r.json()

    def report_progress(
        self,
        match_id: int,
        m2m_token: str,
        status: str,
        progress: int = 0,
        current_step: str = "",
        frames_processed: Optional[int] = None,
        total_frames: Optional[int] = None,
        error_msg: str = "",
    ) -> Any:
        """PUT progress update to Geo-Goal backend."""
        import requests

        if not self.api_base:
            return None
        url = f"{self.api_base.rstrip('/')}/public/matches/{match_id}/analysis/progress"
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
            headers={"Authorization": f"Bearer {m2m_token}"},
            timeout=20,
        )
        r.raise_for_status()
        return r.json()


# ---------------------------------------------------------------------------
# 7. Pitch Visualizer (matplotlib — for validation)
# ---------------------------------------------------------------------------


class PitchVisualizer:
    """Draws a top-down 2D pitch with player positions for visual validation."""

    @staticmethod
    def draw(
        frame_data: FrameData,
        save_path: Optional[str] = None,
    ) -> None:
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches

        fig, ax = plt.subplots(figsize=(12, 8))
        ax.set_xlim(-5, PITCH_LENGTH_M + 5)
        ax.set_ylim(-5, PITCH_WIDTH_M + 5)
        ax.set_aspect("equal")
        ax.set_title(f"Frame {frame_data.frame_idx} — Tactical View")

        # Pitch outline
        ax.add_patch(
            mpatches.Rectangle((0, 0), PITCH_LENGTH_M, PITCH_WIDTH_M, fill=False, lw=2)
        )
        # Half-way line
        ax.axvline(PITCH_LENGTH_M / 2, color="black", ls="--", lw=1)
        # Centre circle
        centre = plt.Circle((PITCH_LENGTH_M / 2, PITCH_WIDTH_M / 2), 9.15, fill=False, lw=1)
        ax.add_patch(centre)

        # Draw players
        colours = {"home": "red", "away": "blue", "referee": "yellow", "unknown": "gray"}
        for p in frame_data.players:
            ax.scatter(
                p.x, p.y,
                c=colours.get(p.team, "gray"),
                s=60,
                edgecolors="black",
                zorder=5,
            )
            ax.annotate(str(p.id), (p.x + 0.5, p.y + 0.5), fontsize=7)

        # Ball
        if frame_data.ball is not None:
            ax.scatter(
                frame_data.ball[0], frame_data.ball[1],
                c="white",
                s=100,
                edgecolors="black",
                linewidths=1.5,
                zorder=10,
                marker="o",
            )

        handles = [
            mpatches.Patch(color="red", label="Home"),
            mpatches.Patch(color="blue", label="Away"),
            mpatches.Patch(color="yellow", label="Referee"),
        ]
        ax.legend(handles=handles, loc="upper right")
        ax.set_xlabel("Pitch length (m)")
        ax.set_ylabel("Pitch width (m)")
        ax.invert_yaxis()  # pitch top = y=0 in broadcast view

        if save_path:
            fig.savefig(save_path, dpi=150, bbox_inches="tight")
            plt.close(fig)
        else:
            plt.show()


# ---------------------------------------------------------------------------
# 8. Video Processor (Orchestrator)
# ---------------------------------------------------------------------------


class VideoProcessor:
    """High-level pipeline orchestrator.

    Usage:
        vp = VideoProcessor("yolov8n.pt")
        vp.load_video("belgium_russia.mp4")
        vp.set_homography()  # uses default src/dst — call after annotating
        vp.process(export_json="output/match_data.json")
    """

    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        device: str = "cpu",
        api_base: Optional[str] = None,
        output_dir: str = "./output",
        player_tags: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        self.detector = ObjectDetector(model_name, device)
        self.tracker = ObjectTracker()
        self.classifier = TeamClassifier(player_tags=player_tags)
        self.transformer: Optional[PerspectiveTransformer] = None
        self.exporter = DataExporter(output_dir, api_base=api_base)
        self.H: Optional[np.ndarray] = None
        self._cap: Optional[cv2.VideoCapture] = None
        self._fps: float = 25.0
        self._total_frames: int = 0

    # ------------------------------------------------------------------
    # Load video
    # ------------------------------------------------------------------
    def load_video(self, video_path: str) -> "VideoProcessor":
        self._cap = cv2.VideoCapture(video_path)
        if not self._cap.isOpened():
            raise FileNotFoundError(f"Cannot open video: {video_path}")
        self._fps = self._cap.get(cv2.CAP_PROP_FPS) or 25.0
        self._total_frames = int(self._cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"[video] {video_path}: {self._total_frames} frames @ {self._fps:.1f} fps")
        return self

    # ------------------------------------------------------------------
    # Homography setup
    # ------------------------------------------------------------------
    def set_homography(
        self,
        src_pts: Optional[np.ndarray] = None,
        dst_pts: Optional[np.ndarray] = None,
        method: str = "cv2",
    ) -> "VideoProcessor":
        """Set source→destination points and compute H.

        If src_pts/dst_pts are None, DEFAULT_SRC_PTS / DEFAULT_DST_PTS are used.
        """
        src = src_pts if src_pts is not None else DEFAULT_SRC_PTS
        dst = dst_pts if dst_pts is not None else DEFAULT_DST_PTS
        calculator = HomographyCalculator()
        self.H = calculator.compute(src, dst, method=method)
        self.transformer = PerspectiveTransformer(self.H)
        print(f"[homography] H computed ({method}):\n{self.H}")
        return self

    # ------------------------------------------------------------------
    # Frame-by-frame processing
    # ------------------------------------------------------------------
    def process(
        self,
        max_frames: int = -1,
        frame_skip: int = 0,
        visualize_every: int = 0,
        export_json: Optional[str] = None,
        push_match_id: Optional[int] = None,
        job_id: Optional[int] = None,
    ) -> List[FrameData]:
        """Run the full pipeline over the loaded video.

        Args:
            max_frames: cap total frames processed (-1 = all).
            frame_skip: process every Nth frame (0 = every frame).
            visualize_every: save a pitch plot every N frames (0 = off).
            export_json: if set, write JSON to this path (relative to output_dir).
            push_match_id: if set, POST data to API for this match.
            job_id: if set, PUT progress updates to the backend during processing.
        """
        if self._cap is None:
            raise RuntimeError("No video loaded — call load_video() first")
        if self.transformer is None:
            raise RuntimeError("No homography set — call set_homography() first")

        # Determine total frames for progress percentage
        estimated_total = self._total_frames
        if frame_skip > 0:
            estimated_total = estimated_total // (frame_skip + 1)
        if max_frames > 0:
            estimated_total = min(estimated_total, max_frames)

        # Get M2M token early if we need progress reporting
        m2m_token = ""
        if job_id is not None and push_match_id is not None:
            from m2m_client import M2MClient
            api_base = self.exporter.api_base or os.environ.get("GEO_API_URL", "")
            client_id = os.environ.get("M2M_CLIENT_ID", "")
            client_secret = os.environ.get("M2M_CLIENT_SECRET", "")
            m2m = M2MClient(api_base, client_id, client_secret)
            m2m_token = m2m.get_token()

        # Report step: detection
        if job_id is not None and push_match_id is not None:
            try:
                self.exporter.report_progress(
                    push_match_id, m2m_token, "processing",
                    progress=0, current_step="detection",
                    total_frames=estimated_total,
                )
                print("[progress] step=detection")
            except Exception as e:
                print(f"[progress] warn: {e}")

        all_frames: List[FrameData] = []
        frame_idx = 0
        processed = 0
        last_report_pct = -1
        t0 = time.time()

        while True:
            ret, frame = self._cap.read()
            if not ret:
                break
            if max_frames > 0 and processed >= max_frames:
                break

            # Frame-skip
            if frame_skip > 0 and frame_idx % (frame_skip + 1) != 0:
                frame_idx += 1
                continue

            fd = self._process_frame(frame, frame_idx)
            all_frames.append(fd)
            self.exporter.add_frame(fd, confidence=fd.confidence)

            if visualize_every > 0 and frame_idx % visualize_every == 0:
                PitchVisualizer.draw(
                    fd,
                    save_path=str(
                        self.exporter.output_dir / f"frame_{frame_idx:06d}.png"
                    ),
                )
                print(f"[viz] saved frame {frame_idx} plot")

            processed += 1
            frame_idx += 1

            # Report progress every ~5%
            if job_id is not None and push_match_id is not None and estimated_total > 0:
                pct = int(processed / estimated_total * 100)
                if pct - last_report_pct >= 5:
                    step_label = "tracking"
                    if pct > 80:
                        step_label = "export"
                    try:
                        self.exporter.report_progress(
                            push_match_id, m2m_token, "processing",
                            progress=pct, current_step=step_label,
                            frames_processed=processed,
                            total_frames=estimated_total,
                        )
                        print(f"[progress] {pct}% — {processed}/{estimated_total} frames — step={step_label}")
                    except Exception as e:
                        print(f"[progress] warn: {e}")
                    last_report_pct = pct

        elapsed = time.time() - t0
        print(
            f"[process] {processed} frames in {elapsed:.1f}s "
            f"({processed / elapsed:.1f} fps)"
        )

        # Export JSON
        if export_json:
            path = self.exporter.save(export_json)
            print(f"[export] saved to {path}")

        # Push to API
        if push_match_id is not None:
            # Refresh M2M token if not already fetched
            if not m2m_token:
                from m2m_client import M2MClient
                api_base = self.exporter.api_base or os.environ.get("GEO_API_URL", "")
                client_id = os.environ.get("M2M_CLIENT_ID", "")
                client_secret = os.environ.get("M2M_CLIENT_SECRET", "")
                m2m = M2MClient(api_base, client_id, client_secret)
                m2m_token = m2m.get_token()

            try:
                resp = self.exporter.push_to_api(push_match_id, m2m_token)
                print(f"[push] uploaded to match {push_match_id}: {resp}")

                # Report completion
                if job_id is not None:
                    try:
                        self.exporter.report_progress(
                            push_match_id, m2m_token, "completed",
                            progress=100, current_step="done",
                            frames_processed=processed,
                            total_frames=estimated_total,
                        )
                        print("[progress] completed")
                    except Exception as e:
                        print(f"[progress] warn on completion report: {e}")
            except Exception as e:
                print(f"[push] FAILED: {e}")
                # Report failure
                if job_id is not None:
                    try:
                        self.exporter.report_progress(
                            push_match_id, m2m_token, "failed",
                            progress=last_report_pct, current_step="export",
                            frames_processed=processed,
                            error_msg=str(e)[:1000],
                        )
                        print("[progress] failed")
                    except Exception as e2:
                        print(f"[progress] warn on failure report: {e2}")
                raise

        return all_frames

    # ------------------------------------------------------------------
    def _process_frame(self, frame: np.ndarray, frame_idx: int) -> FrameData:
        timestamp_ms = int(frame_idx / self._fps * 1000)

        # 1. Detect
        detections = self.detector.detect(frame)
        mean_conf = 1.0
        if len(detections) == 0:
            return FrameData(frame_idx=frame_idx, timestamp_ms=timestamp_ms)

        # Per-frame confidence = mean of all detection scores
        if detections.confidence is not None and len(detections.confidence) > 0:
            mean_conf = float(np.mean(detections.confidence))

        fd = FrameData(
            frame_idx=frame_idx,
            timestamp_ms=timestamp_ms,
            confidence=mean_conf,
        )

        # 2. Track
        detections = self.tracker.track(detections)

        # 3. Classify teams (fit on first frame, predict thereafter)
        if frame_idx == 0:
            teams = self.classifier.fit_predict(frame, detections)
        else:
            teams = self.classifier.predict(frame, detections)

        # 4. Project players → pitch
        for i in range(len(detections)):
            xyxy = detections.xyxy[i]
            class_id = detections.class_id[i] if detections.class_id is not None else -1
            tracker_id = (
                int(detections.tracker_id[i])
                if detections.tracker_id is not None
                else i
            )

            bp = self.transformer.player_base_point(xyxy)
            x, y = self.transformer.pixel_to_pitch(*bp)

            # Ball
            if class_id == 32:
                fd.ball = (x, y)
                continue

            fd.players.append(
                Player2D(
                    id=tracker_id,
                    x=x,
                    y=y,
                    team=teams[i] if i < len(teams) else "unknown",
                )
            )

        return fd


# ---------------------------------------------------------------------------
# Utility: Manual Keypoint Annotation Tool
# ---------------------------------------------------------------------------


def annotate_keypoints(
    video_path: str,
    frame_number: int = 0,
    num_points: int = 4,
) -> np.ndarray:
    """Open a video frame and let the user click N keypoints.

    Returns an (N, 2) float32 array of pixel coordinates.
    Click the points in order; press ESC to discard; ENTER to confirm.

    Typical keypoint order (football pitch):
      0: near touchline / goal-line intersection (left)
      1: near touchline / goal-line intersection (right)
      2: far  touchline / goal-line intersection (right)
      3: far  touchline / goal-line intersection (left)
    (adjust to whatever four coplanar points you can identify clearly.)
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open: {video_path}")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_number >= total:
        cap.release()
        raise IndexError(f"Frame {frame_number} out of range ({total} frames)")

    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        raise RuntimeError(f"Failed to read frame {frame_number}")

    points: List[Tuple[int, int]] = []
    window = "Annotate Keypoints (click in order, ENTER to confirm, ESC to discard)"

    def _on_click(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN and len(points) < num_points:
            points.append((x, y))

    cv2.namedWindow(window)
    cv2.setMouseCallback(window, _on_click)

    print(f"Click {num_points} points on the frame in order. ENTER=confirm, ESC=discard")

    while True:
        disp = frame.copy()
        for i, (px, py) in enumerate(points):
            cv2.circle(disp, (px, py), 5, (0, 255, 0), -1)
            cv2.putText(
                disp, str(i), (px + 8, py - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2,
            )
        cv2.imshow(window, disp)
        key = cv2.waitKey(20) & 0xFF

        if key == 13:  # ENTER
            if len(points) >= num_points:
                break
            print(f"Need {num_points} points, only have {len(points)}")
        elif key == 27:  # ESC
            points.clear()
            break

    cv2.destroyAllWindows()

    if len(points) < num_points:
        raise RuntimeError("Annotation cancelled or incomplete")

    print("Annotated source points:")
    for i, (px, py) in enumerate(points):
        print(f"  {i}: ({px}, {py})")
    return np.array(points, dtype=np.float32)
