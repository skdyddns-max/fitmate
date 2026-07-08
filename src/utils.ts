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

export function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 헷갈리는 문자(I,L,O,0,1) 제외
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export function uid(): string {
  return crypto.randomUUID()
}

export function formatDateKo(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`
}
