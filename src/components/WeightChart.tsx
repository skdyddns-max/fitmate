import type { WeightEntry } from '../types'

// 의존성 없는 간단한 SVG 라인 차트
export default function WeightChart({ weights }: { weights: WeightEntry[] }) {
  if (weights.length === 0) return <p className="empty">체중을 기록하면 그래프가 나타나요</p>
  if (weights.length === 1)
    return (
      <p className="empty">
        {weights[0].weightKg}kg — 이틀 이상 기록하면 변화 그래프가 그려져요
      </p>
    )

  const W = 320
  const H = 140
  const PAD = { top: 14, right: 14, bottom: 22, left: 38 }
  const vals = weights.map((w) => w.weightKg)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = Math.max(max - min, 0.5)

  const x = (i: number) => PAD.left + (i / (weights.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom)

  const path = weights.map((w, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(w.weightKg).toFixed(1)}`).join(' ')
  const first = weights[0]
  const last = weights[weights.length - 1]
  const diff = +(last.weightKg - first.weightKg).toFixed(1)

  return (
    <div>
      <p style={{ fontSize: 14, marginBottom: 8 }}>
        시작 {first.weightKg}kg → 현재 <b>{last.weightKg}kg</b>{' '}
        <span style={{ color: diff <= 0 ? 'var(--green-dark)' : '#dc2626', fontWeight: 700 }}>
          ({diff > 0 ? '+' : ''}
          {diff}kg)
        </span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {[min, max].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={y(v) + 4} fontSize="10" fill="#6b7280" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {weights.map((w, i) => (
          <circle key={w.id} cx={x(i)} cy={y(w.weightKg)} r="3.5" fill="#fff" stroke="#10b981" strokeWidth="2" />
        ))}
        <text x={x(0)} y={H - 6} fontSize="10" fill="#6b7280" textAnchor="start">
          {first.date.slice(5)}
        </text>
        <text x={x(weights.length - 1)} y={H - 6} fontSize="10" fill="#6b7280" textAnchor="end">
          {last.date.slice(5)}
        </text>
      </svg>
    </div>
  )
}
