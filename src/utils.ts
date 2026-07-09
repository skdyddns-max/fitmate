import type { Checkin, Mission } from './types'

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

/** 챌린지 기간 중 오늘까지 경과한 날짜 목록 (시작 전이면 빈 배열) */
export function elapsedDates(startDate: string, endDate: string): string[] {
  const today = todayStr()
  const last = today < endDate ? today : endDate
  if (last < startDate) return []
  const dates: string[] = []
  for (let d = startDate; d <= last; d = addDays(d, 1)) dates.push(d)
  return dates
}

/** 달성률(%) = 체크한 미션 수 / (경과일수 × 미션 수) */
export function achievementRate(
  checkins: Checkin[],
  participantId: string,
  missions: Mission[],
  startDate: string,
  endDate: string,
): number {
  const days = elapsedDates(startDate, endDate)
  if (days.length === 0 || missions.length === 0) return 0
  const daySet = new Set(days)
  const done = checkins.filter((c) => c.participantId === participantId && daySet.has(c.date)).length
  return Math.min(100, Math.round((done / (days.length * missions.length)) * 100))
}

/** 스트릭 = 모든 미션을 완료한 날이 오늘(또는 어제)부터 거꾸로 연속된 일수 */
export function streak(
  checkins: Checkin[],
  participantId: string,
  missions: Mission[],
  startDate: string,
): number {
  const mine = checkins.filter((c) => c.participantId === participantId)
  const isComplete = (date: string) =>
    missions.length > 0 && missions.every((m) => mine.some((c) => c.missionId === m.id && c.date === date))
  const today = todayStr()
  let count = 0
  // 오늘 미완료면 어제부터 센다 (아직 오늘 인증 전일 수 있으므로)
  let d = isComplete(today) ? today : addDays(today, -1)
  while (d >= startDate && isComplete(d)) {
    count++
    d = addDays(d, -1)
  }
  return count
}

/** 챌린지 기간 중 모든 미션을 완료한 날짜 수 */
export function completeDays(
  checkins: Checkin[],
  participantId: string,
  missions: Mission[],
  startDate: string,
  endDate: string,
): number {
  const mine = checkins.filter((c) => c.participantId === participantId)
  return elapsedDates(startDate, endDate).filter(
    (d) => missions.length > 0 && missions.every((m) => mine.some((c) => c.missionId === m.id && c.date === d)),
  ).length
}

/** 기간 전체에서 가장 길었던 연속 완료 일수 */
export function bestStreak(
  checkins: Checkin[],
  participantId: string,
  missions: Mission[],
  startDate: string,
  endDate: string,
): number {
  const mine = checkins.filter((c) => c.participantId === participantId)
  let best = 0
  let run = 0
  for (const d of elapsedDates(startDate, endDate)) {
    const complete =
      missions.length > 0 && missions.every((m) => mine.some((c) => c.missionId === m.id && c.date === d))
    run = complete ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

export interface Badge {
  emoji: string
  name: string
  cond: string
  earned: boolean
}

/** 클라이언트 계산 뱃지 (DB 불필요) */
export function getBadges(
  checkins: Checkin[],
  participantId: string,
  missions: Mission[],
  startDate: string,
  endDate: string,
): Badge[] {
  const anyCheckin = checkins.some((c) => c.participantId === participantId)
  const best = bestStreak(checkins, participantId, missions, startDate, endDate)
  const days = completeDays(checkins, participantId, missions, startDate, endDate)
  const totalDays = elapsedDates(startDate, endDate).length
  const finished = todayStr() > endDate
  return [
    { emoji: '🌱', name: '첫 걸음', cond: '첫 인증', earned: anyCheckin },
    { emoji: '🔥', name: '작심삼일 극복', cond: '3일 연속', earned: best >= 3 },
    { emoji: '⚡', name: '일주일 정복', cond: '7일 연속', earned: best >= 7 },
    { emoji: '🏆', name: '2주 챔피언', cond: '14일 연속', earned: best >= 14 },
    { emoji: '👑', name: '레전드', cond: '28일 연속', earned: best >= 28 },
    { emoji: '💯', name: '개근왕', cond: '기간 내 개근', earned: finished && totalDays > 0 && days === totalDays },
  ]
}

/** D-day 라벨: 시작 전/진행 중/종료 */
export function ddayLabel(startDate: string, endDate: string): { text: string; state: 'before' | 'on' | 'over' } {
  const today = todayStr()
  if (today < startDate) return { text: `시작 D-${daysBetween(today, startDate)}`, state: 'before' }
  if (today > endDate) return { text: '종료됨', state: 'over' }
  const left = daysBetween(today, endDate)
  return { text: left === 0 ? '마지막 날!' : `종료 D-${left}`, state: 'on' }
}

export function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 헷갈리는 문자(I,L,O,0,1) 제외
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export function uid(): string {
  return crypto.randomUUID()
}

/** 업로드 전 클라이언트 압축: 긴 변 maxEdge로 리사이즈 후 JPEG 변환 */
export async function compressImage(file: File, maxEdge = 1080, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 변환에 실패했어요.'))), 'image/jpeg', quality),
  )
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export function formatDateKo(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`
}
