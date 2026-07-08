// 익명 참여 세션 — 방 코드별 {participantId, token}을 기기에 저장
const SESSION_KEY = 'fitmate-session'

export interface Session {
  participantId: string
  token: string
}

export function getSession(code: string): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  return JSON.parse(raw)[code] ?? null
}

export function setSession(code: string, session: Session) {
  const raw = localStorage.getItem(SESSION_KEY)
  const all = raw ? JSON.parse(raw) : {}
  all[code] = session
  localStorage.setItem(SESSION_KEY, JSON.stringify(all))
}

/** participantId로 저장된 토큰 찾기 (쓰기 API 인증용) */
export function tokenFor(participantId: string): string | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  for (const s of Object.values(JSON.parse(raw)) as Session[]) {
    if (s.participantId === participantId) return s.token
  }
  return null
}
