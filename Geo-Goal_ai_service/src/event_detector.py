"""
event_detector.py — Fase 7 (Sub-fases A, B, C)
Detección automática de eventos desde frames de tracking.

Detecta:
  - ball_out (7.A): balón fuera del campo ≥ N frames consecutivos
  - goal (7.B): heurística multi-señal (≥3 de 4 señales)
  - pass / interception (7.C): cambio de posesor del balón

Todos los eventos generados llevan:
  - confidence: float [0, 1]
  - requires_review: True  (el admin confirma o rechaza desde la UI)
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Tuple

# ──────────────────────────────────────────────────────────────────────────────
# Constantes de campo
# ──────────────────────────────────────────────────────────────────────────────
PITCH_W = 105.0      # metros
PITCH_H = 68.0       # metros
GOAL_Y_MIN = (PITCH_H / 2) - 3.66   # 30.34 m
GOAL_Y_MAX = (PITCH_H / 2) + 3.66   # 37.66 m
CENTER_X = PITCH_W / 2              # 52.5 m
CENTER_Y = PITCH_H / 2              # 34.0 m


@dataclass
class PlayerPos:
    """Posición de un jugador en un frame."""
    player_id: int
    team: str       # "home" | "away" | "referee" | "unknown"
    x: float
    y: float


@dataclass
class FrameSnapshot:
    """Representación mínima de un frame para el detector."""
    frame_idx: int
    timestamp_ms: int
    ball: Optional[Tuple[float, float]]   # (x, y) en metros, o None
    players: List[PlayerPos]


# ──────────────────────────────────────────────────────────────────────────────
# 7.A — Balón fuera de campo
# ──────────────────────────────────────────────────────────────────────────────

def detect_ball_out_events(frames: List[FrameSnapshot], out_buffer: int = 5) -> List[Dict[str, Any]]:
    """
    Detecta cuando el balón sale del campo durante ≥ out_buffer frames consecutivos.
    Clasifica como 'throw_in' (salió por lateral) o 'goal_kick_or_corner' (salió por línea de fondo).
    """
    events: List[Dict[str, Any]] = []
    out_streak = 0
    last_inside_idx = -1

    for i, fd in enumerate(frames):
        if fd.ball is None:
            continue
        x, y = fd.ball
        is_inside = (0.0 <= x <= PITCH_W) and (0.0 <= y <= PITCH_H)

        if is_inside:
            out_streak = 0
            last_inside_idx = i
        else:
            out_streak += 1
            if out_streak == out_buffer:
                # Clasificar por dónde salió
                if last_inside_idx >= 0 and frames[last_inside_idx].ball is not None:
                    last_x, _ = frames[last_inside_idx].ball  # type: ignore[misc]
                    out_type = "goal_kick_or_corner" if (last_x < 2 or last_x > PITCH_W - 2) else "throw_in"
                else:
                    out_type = "throw_in"

                start_idx = max(0, i - out_buffer)
                events.append({
                    "frame_idx": start_idx,
                    "timestamp_ms": frames[start_idx].timestamp_ms,
                    "event_type": "ball_out",
                    "subtype": out_type,
                    "ball_x": float(x),
                    "ball_y": float(y),
                    "confidence": 0.80,
                    "requires_review": True,
                })

    return events


# ──────────────────────────────────────────────────────────────────────────────
# 7.B — Gol (heurística multi-señal)
# ──────────────────────────────────────────────────────────────────────────────

def detect_goal_events(frames: List[FrameSnapshot], fps: float = 5.0) -> List[Dict[str, Any]]:
    """
    Detecta goles candidatos combinando ≥3 de 4 señales:
      1. Balón cruzó la línea de gol dentro del ancho de la portería
      2. Reanudación desde el centro (≤30s después)
      3. Aglomeración de jugadores cerca de la portería (≤16s después)
      4. Pausa de movimiento general (≤20s después)
    """
    events: List[Dict[str, Any]] = []
    i = 0
    skip_until = -1

    while i < len(frames):
        if i < skip_until:
            i += 1
            continue

        fd = frames[i]
        if fd.ball is None:
            i += 1
            continue

        x, y = fd.ball

        # Señal 1: cruzó la línea de gol
        crossed = (x < 0 or x > PITCH_W) and (GOAL_Y_MIN <= y <= GOAL_Y_MAX)
        if not crossed:
            i += 1
            continue

        side = "home_goal" if x > PITCH_W else "away_goal"
        signals = 1

        look_ahead_30s = int(fps * 30)
        look_ahead_16s = int(fps * 16)
        look_ahead_20s = int(fps * 20)
        window_end = min(len(frames), i + look_ahead_30s)

        # Señal 2: reanudación desde el centro
        for fd2 in frames[i + 1:window_end]:
            if fd2.ball is None:
                continue
            bx, by = fd2.ball
            if abs(bx - CENTER_X) < 5 and abs(by - CENTER_Y) < 5:
                signals += 1
                break

        # Señal 3: aglomeración ≥6 jugadores cerca de la portería (dentro de 20m)
        goal_x = PITCH_W if side == "home_goal" else 0.0
        for fd2 in frames[i + 1:min(len(frames), i + look_ahead_16s)]:
            near = sum(1 for p in fd2.players if abs(p.x - goal_x) < 20)
            if near >= 6:
                signals += 1
                break

        # Señal 4: pausa de movimiento (velocidad media de jugadores ≈ 0)
        speeds = []
        prev_positions: Dict[int, Tuple[float, float]] = {}
        for fd2 in frames[i + 1:min(len(frames), i + look_ahead_20s)]:
            for p in fd2.players:
                if p.player_id in prev_positions:
                    px, py = prev_positions[p.player_id]
                    spd = ((p.x - px) ** 2 + (p.y - py) ** 2) ** 0.5
                    speeds.append(spd)
                prev_positions[p.player_id] = (p.x, p.y)

        if speeds:
            avg_speed = sum(speeds) / len(speeds)
            if avg_speed < 0.3:   # muy poca velocidad → jugadores parados
                signals += 1

        if signals >= 3:
            confidence = 0.60 + 0.10 * (signals - 3)   # 0.60, 0.70, 0.80 según señales
            events.append({
                "frame_idx": i,
                "timestamp_ms": fd.timestamp_ms,
                "event_type": "goal",
                "subtype": side,
                "ball_x": float(x),
                "ball_y": float(y),
                "confidence": round(min(0.90, confidence), 2),
                "signals": signals,
                "requires_review": True,
            })
            skip_until = i + look_ahead_30s   # evitar duplicados dentro de 30s

        i += 1

    return events


# ──────────────────────────────────────────────────────────────────────────────
# 7.C — Pases / Interceptaciones
# ──────────────────────────────────────────────────────────────────────────────

def detect_pass_events(
    frames: List[FrameSnapshot],
    max_ball_dist_m: float = 3.0,
    min_duration_frames: int = 3,
) -> List[Dict[str, Any]]:
    """
    Detecta pases rastreando el posesor más cercano al balón.
    - Cuando el posesor cambia entre jugadores del mismo equipo → pass
    - Cuando cambia de equipo → interception
    - Filtra cambios muy rápidos (< min_duration_frames) para reducir ruido.
    """
    events: List[Dict[str, Any]] = []

    @dataclass
    class Carrier:
        player_id: int
        team: str
        frame_idx: int
        x_ball: float
        y_ball: float

    last_carrier: Optional[Carrier] = None
    carrier_since: int = 0

    for i, fd in enumerate(frames):
        if fd.ball is None:
            continue
        bx, by = fd.ball

        # Jugador más cercano dentro de max_ball_dist_m
        nearest: Optional[PlayerPos] = None
        nearest_d = max_ball_dist_m
        for p in fd.players:
            if p.team in ("referee", "unknown"):
                continue
            d = ((p.x - bx) ** 2 + (p.y - by) ** 2) ** 0.5
            if d < nearest_d:
                nearest_d = d
                nearest = p

        if nearest is None:
            last_carrier = None
            continue

        if last_carrier is None:
            last_carrier = Carrier(nearest.player_id, nearest.team, i, bx, by)
            carrier_since = i
            continue

        if nearest.player_id != last_carrier.player_id:
            duration = i - carrier_since
            if duration >= min_duration_frames:
                same_team = last_carrier.team == nearest.team
                events.append({
                    "frame_idx": last_carrier.frame_idx,
                    "timestamp_ms": frames[last_carrier.frame_idx].timestamp_ms,
                    "event_type": "pass" if same_team else "interception",
                    "from_player_id": last_carrier.player_id,
                    "to_player_id": nearest.player_id,
                    "from_team": last_carrier.team,
                    "to_team": nearest.team,
                    "outcome": "complete" if same_team else "failed",
                    "x_start": last_carrier.x_ball,
                    "y_start": last_carrier.y_ball,
                    "x_end": float(bx),
                    "y_end": float(by),
                    "confidence": 0.70,
                    "requires_review": False,   # pases no requieren revisión por defecto
                })

            last_carrier = Carrier(nearest.player_id, nearest.team, i, bx, by)
            carrier_since = i

    return events


# ──────────────────────────────────────────────────────────────────────────────
# Función principal: detectar todos los eventos
# ──────────────────────────────────────────────────────────────────────────────

def detect_all_events(
    frames: List[FrameSnapshot],
    fps: float = 5.0,
    detect_out: bool = True,
    detect_goals: bool = True,
    detect_passes: bool = True,
) -> List[Dict[str, Any]]:
    """
    Ejecuta todos los detectores y devuelve la lista unificada de eventos
    ordenados por timestamp.
    """
    all_events: List[Dict[str, Any]] = []

    if detect_out:
        all_events.extend(detect_ball_out_events(frames))

    if detect_goals:
        all_events.extend(detect_goal_events(frames, fps=fps))

    if detect_passes:
        all_events.extend(detect_pass_events(frames))

    all_events.sort(key=lambda e: e.get("timestamp_ms", 0))
    return all_events

