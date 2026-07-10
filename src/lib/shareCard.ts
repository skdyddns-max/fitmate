// 결과 공유 카드 — canvas로 세로형 이미지(1080×1350) 생성. 백엔드 불필요.
// 카톡/인스타 공유 → 방 코드 노출로 친구 초대까지 이어지는 바이럴 장치.
import type { Badge } from '../utils'

export interface ShareData {
  challengeName: string
  nickname: string
  rate: number
  bestStreak: number
  completeDays: number
  weightDelta: number | null
  badges: Badge[]
  periodLabel: string
  code: string
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export async function renderShareCard(d: ShareData): Promise<Blob> {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const KO = "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"

  // 배경 그라데이션
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#047857')
  bg.addColorStop(0.55, '#10b981')
  bg.addColorStop(1, '#34d399')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 상단 브랜드
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `700 44px ${KO}`
  ctx.fillText('🥗  FitMate', W / 2, 110)
  ctx.font = `500 30px ${KO}`
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText(d.challengeName, W / 2, 162)

  // 흰 패널
  const px = 70
  const py = 210
  const pw = W - px * 2
  const ph = H - py - 150
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, px, py, pw, ph, 44)
  ctx.fill()

  // 닉네임
  ctx.fillStyle = '#1a2e26'
  ctx.font = `800 58px ${KO}`
  ctx.fillText(d.nickname, W / 2, py + 110)
  ctx.fillStyle = '#64748b'
  ctx.font = `500 28px ${KO}`
  ctx.fillText('님의 챌린지 성적표', W / 2, py + 152)

  // 큰 달성률 링
  const cx = W / 2
  const cy = py + 320
  const R = 118
  ctx.lineWidth = 26
  ctx.strokeStyle = '#e6ece9'
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  const grad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
  grad.addColorStop(0, '#059669')
  grad.addColorStop(1, '#34d399')
  ctx.strokeStyle = grad
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (d.rate / 100))
  ctx.stroke()
  ctx.fillStyle = '#047857'
  ctx.font = `800 76px ${KO}`
  ctx.fillText(`${d.rate}%`, cx, cy + 12)
  ctx.fillStyle = '#64748b'
  ctx.font = `600 26px ${KO}`
  ctx.fillText('달성률', cx, cy + 56)

  // 통계 3분할
  const stats: [string, string][] = [
    [`${d.completeDays}일`, '완벽한 하루'],
    [`${d.bestStreak}일`, '최고 스트릭'],
    [d.weightDelta === null ? '—' : `${d.weightDelta > 0 ? '+' : ''}${d.weightDelta}kg`, '체중 변화'],
  ]
  const sy = cy + 210
  stats.forEach(([val, label], i) => {
    const sx = px + pw * ((i + 0.5) / 3)
    ctx.fillStyle = '#047857'
    ctx.font = `800 44px ${KO}`
    ctx.fillText(val, sx, sy)
    ctx.fillStyle = '#64748b'
    ctx.font = `600 24px ${KO}`
    ctx.fillText(label, sx, sy + 40)
  })

  // 획득 뱃지
  const earned = d.badges.filter((b) => b.earned)
  const by = sy + 130
  ctx.fillStyle = '#94a3b8'
  ctx.font = `700 24px ${KO}`
  ctx.fillText(earned.length ? `획득한 뱃지 ${earned.length}개` : '', W / 2, by)
  if (earned.length) {
    ctx.font = `400 54px ${KO}`
    const gap = 74
    const startX = W / 2 - ((Math.min(earned.length, 6) - 1) * gap) / 2
    earned.slice(0, 6).forEach((b, i) => ctx.fillText(b.emoji, startX + i * gap, by + 70))
  }

  // 하단 초대
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `700 34px ${KO}`
  ctx.fillText(`나도 참여하기 · 코드 ${d.code}`, W / 2, H - 88)
  ctx.font = `500 26px ${KO}`
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillText('skdyddns-max.github.io/fitmate', W / 2, H - 46)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png'),
  )
}
