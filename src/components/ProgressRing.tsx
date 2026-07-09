// 오늘 진행률 원형 게이지 (히어로 카드용, 흰색 계열)
export default function ProgressRing({ done, total }: { done: number; total: number }) {
  const R = 34
  const C = 2 * Math.PI * R
  const ratio = total > 0 ? done / total : 0
  return (
    <div className="ring-wrap">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
        <circle
          cx="42"
          cy="42"
          r={R}
          fill="none"
          stroke="#fff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <div className="ring-text">
        <div>
          {done}/{total}
          <small>오늘 미션</small>
        </div>
      </div>
    </div>
  )
}
