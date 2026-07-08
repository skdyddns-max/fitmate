// 데이터 모델 — 추후 Supabase 테이블과 1:1 대응
export interface Challenge {
  id: string
  code: string // 6자리 참여 코드
  name: string
  startDate: string // YYYY-MM-DD
  endDate: string
  createdAt: string
}

export interface Mission {
  id: string
  challengeId: string
  emoji: string
  title: string
  sortOrder: number
}

export interface Participant {
  id: string
  challengeId: string
  nickname: string
  token: string // 본인 확인용 비밀 토큰 (기기 저장)
  joinedAt: string
}

export interface Checkin {
  id: string
  challengeId: string
  participantId: string
  missionId: string
  date: string // YYYY-MM-DD
}

export interface WeightEntry {
  id: string
  participantId: string
  date: string
  weightKg: number
}

export interface Reaction {
  id: string
  challengeId: string
  date: string
  fromParticipantId: string
  toParticipantId: string
  emoji: string
}

export interface Db {
  challenges: Challenge[]
  missions: Mission[]
  participants: Participant[]
  checkins: Checkin[]
  weights: WeightEntry[]
  reactions: Reaction[]
}
