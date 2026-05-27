/**
 * Charts.tsx — Pure React Native chart primitives (no SVG required)
 * Used across player/team/coach dashboards for a premium look.
 */
import React from 'react';
import { View, Text } from 'react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function ratingColor(r: number): string {
  if (r >= 8.5) return '#39FF14';
  if (r >= 7.5) return '#10b981';
  if (r >= 6.5) return '#34d399';
  if (r >= 5.5) return '#fbbf24';
  if (r >= 4) return '#f97316';
  return '#ef4444';
}

// ─── DashSection ──────────────────────────────────────────────────────────────

export function DashSection({
  title,
  accent = '#39FF14',
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10,
          gap: 8,
        }}
      >
        <View
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            backgroundColor: accent,
          }}
        />
        <Text
          style={{
            color: '#fff',
            fontWeight: '800',
            fontSize: 14,
            letterSpacing: 0.3,
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

// ─── RatingRing ───────────────────────────────────────────────────────────────

export function RatingRing({
  rating,
  size = 72,
  showGlow = true,
}: {
  rating: number;
  size?: number;
  showGlow?: boolean;
}) {
  const color = ratingColor(rating);
  const r = size / 2;

  return (
    <View
      style={{
        width: size + 18,
        height: size + 18,
        borderRadius: r + 9,
        backgroundColor: color + '18',
        alignItems: 'center',
        justifyContent: 'center',
        ...(showGlow
          ? { shadowColor: color, shadowOpacity: 0.55, shadowRadius: 14, elevation: 10 }
          : {}),
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 3.5,
          borderColor: color,
          backgroundColor: '#0d1117',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color,
            fontSize: size * 0.29,
            fontWeight: '900',
            letterSpacing: -0.5,
          }}
        >
          {rating.toFixed(1)}
        </Text>
        <Text style={{ color: color + '99', fontSize: 9, fontWeight: '700', marginTop: -2 }}>
          RATING
        </Text>
      </View>
    </View>
  );
}

// ─── StatBadge ────────────────────────────────────────────────────────────────

export function StatBadge({
  label,
  value,
  pct,
  color,
  size = 58,
}: {
  label: string;
  value: string | number;
  /** 0–1, controls fill height */
  pct: number;
  color: string;
  size?: number;
}) {
  const clampedPct = Math.min(1, Math.max(0, pct));

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2.5,
          borderColor: color + '60',
          backgroundColor: '#111827',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Fill from bottom */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${Math.round(clampedPct * 100)}%`,
            backgroundColor: color + '35',
          }}
        />
        <Text style={{ color, fontSize: size * 0.29, fontWeight: '900', zIndex: 1 }}>
          {value}
        </Text>
      </View>
      <Text
        style={{
          color: '#9ca3af',
          fontSize: 9,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── HexPerformanceGrid ───────────────────────────────────────────────────────
// 6 stats arranged around a central RatingRing in a honeycomb layout

export type HexStat = { label: string; value: string | number; pct: number; color: string };

export function HexPerformanceGrid({
  rating,
  stats,
}: {
  rating: number;
  /** Exactly 6 stats: [topLeft, topRight, midLeft, midRight, botLeft, botRight] */
  stats: HexStat[];
}) {
  const BADGE = 58;
  const RING = 76;
  const OFFSET = BADGE * 0.5;

  const [s0, s1, s2, s3, s4, s5] = stats;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      {/* Row 1 — offset right */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 20,
          marginLeft: OFFSET,
          marginBottom: 6,
        }}
      >
        <StatBadge {...s0} size={BADGE} />
        <StatBadge {...s1} size={BADGE} />
      </View>

      {/* Row 2 — middle with ring */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <StatBadge {...s2} size={BADGE} />
        <RatingRing rating={rating} size={RING} />
        <StatBadge {...s3} size={BADGE} />
      </View>

      {/* Row 3 — offset right */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 20,
          marginLeft: OFFSET,
        }}
      >
        <StatBadge {...s4} size={BADGE} />
        <StatBadge {...s5} size={BADGE} />
      </View>
    </View>
  );
}

// ─── StatBar ──────────────────────────────────────────────────────────────────

export function StatBar({
  label,
  value,
  max,
  color,
  showValue = true,
  height = 8,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  showValue?: boolean;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <View style={{ marginBottom: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600' }}>{label}</Text>
        {showValue && (
          <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{value}</Text>
        )}
      </View>
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: '#1f2937',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height,
            width: `${Math.round(pct * 100)}%`,
            borderRadius: height / 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

// ─── WinLoseBar ───────────────────────────────────────────────────────────────

export function WinLoseBar({
  wins,
  draws,
  losses,
  showLabels = true,
}: {
  wins: number;
  draws: number;
  losses: number;
  showLabels?: boolean;
}) {
  const total = wins + draws + losses;

  return (
    <View>
      {showLabels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>
            {wins}V
          </Text>
          <Text style={{ color: '#9ca3af', fontWeight: '700', fontSize: 13 }}>
            {draws}E
          </Text>
          <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>
            {losses}D
          </Text>
          <Text style={{ color: '#39FF14', fontWeight: '700', fontSize: 13 }}>
            {total > 0 ? Math.round((wins / total) * 100) : 0}% victorias
          </Text>
        </View>
      )}
      <View
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: '#1f2937',
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        <View style={{ flex: Math.max(wins, 0.001), backgroundColor: '#10b981' }} />
        <View style={{ flex: Math.max(draws, 0.001), backgroundColor: '#6b7280' }} />
        <View style={{ flex: Math.max(losses, 0.001), backgroundColor: '#ef4444' }} />
      </View>
    </View>
  );
}

// ─── MiniBarChart ─────────────────────────────────────────────────────────────
// Vertical bar chart for rating history

export function MiniBarChart({
  data,
  maxVal,
  barColor,
  height = 60,
  barWidth = 6,
}: {
  data: number[];
  maxVal?: number;
  barColor?: string;
  height?: number;
  barWidth?: number;
}) {
  const peak = maxVal ?? Math.max(...data, 1);
  const color = barColor ?? '#39FF14';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        height,
        gap: 3,
      }}
    >
      {data.map((val, i) => {
        const pct = peak > 0 ? Math.min(1, val / peak) : 0;
        const barH = Math.max(3, Math.round(pct * height));
        const c = barColor ?? ratingColor(val);
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: barH,
              borderRadius: barWidth / 2,
              backgroundColor: c,
              opacity: 0.85,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── FormationBarList ─────────────────────────────────────────────────────────

export function FormationBarList({
  formations,
  color = '#39FF14',
}: {
  formations: Array<{ formation: string; count: number }>;
  color?: string;
}) {
  const sorted = [...formations].sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCount = sorted[0]?.count ?? 1;

  return (
    <View style={{ gap: 6 }}>
      {sorted.map((f) => (
        <View key={f.formation}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 3,
            }}
          >
            <Text style={{ color: '#d1d5db', fontSize: 12, fontWeight: '700' }}>
              {f.formation}
            </Text>
            <Text style={{ color, fontSize: 12, fontWeight: '800' }}>
              {f.count}×
            </Text>
          </View>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#1f2937',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 6,
                width: `${Math.round((f.count / maxCount) * 100)}%`,
                borderRadius: 3,
                backgroundColor: color,
                opacity: 0.8,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: accent ? accent + '30' : '#39FF1420',
        backgroundColor: '#111827cc',
        padding: 12,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: '#9ca3af',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: accent ?? '#fff',
          fontSize: 22,
          fontWeight: '900',
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{sub}</Text>
      ) : null}
    </View>
  );
}
