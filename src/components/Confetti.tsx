import { useMemo } from 'react'

const COLORS = ['#10b981', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa']

// 오늘 미션 전체 완료 시 3초간 뿌려지는 콘페티
export default function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1.2,
        color: COLORS[i % COLORS.length],
        scale: 0.7 + Math.random() * 0.8,
      })),
    [],
  )
  return (
    <div className="confetti-layer">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `scale(${p.scale})`,
          }}
        />
      ))}
    </div>
  )
}
