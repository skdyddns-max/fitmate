// 데이터 저장 계층.
// VITE_SUPABASE_URL이 설정되어 있으면 Supabase(진짜 멀티유저),
// 없으면 localStorage(같은 기기 안에서만 동작)를 사용한다. 시그니처는 동일.
import type { Challenge, Checkin, Db, Mission, Participant, Reaction, WeightEntry } from './types'
import { generateCode, uid } from './utils'
import { getSession, setSession, type Session } from './session'
import { supabase } from './lib/supabase'
import { supabaseStore } from './supabaseStore'

export { getSession, type Session }

const DB_KEY = 'fitmate-db'

function loadDb(): Db {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) return JSON.parse(raw)
  return { challenges: [], missions: [], participants: [], checkins: [], weights: [], reactions: [] }
}

function saveDb(db: Db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export interface MissionInput {
  emoji: string
  title: string
}

const localStore = {
  async createChallenge(
    name: string,
    startDate: string,
    endDate: string,
    missions: MissionInput[],
  ): Promise<Challenge> {
    const db = loadDb()
    let code = generateCode()
    while (db.challenges.some((c) => c.code === code)) code = generateCode()
    const challenge: Challenge = { id: uid(), code, name, startDate, endDate, createdAt: new Date().toISOString() }
    db.challenges.push(challenge)
    missions.forEach((m, i) =>
      db.missions.push({ id: uid(), challengeId: challenge.id, emoji: m.emoji, title: m.title, sortOrder: i }),
    )
    saveDb(db)
    return challenge
  },

  async getChallengeByCode(code: string): Promise<Challenge | null> {
    const db = loadDb()
    return db.challenges.find((c) => c.code === code.toUpperCase()) ?? null
  },

  async getMissions(challengeId: string): Promise<Mission[]> {
    return loadDb()
      .missions.filter((m) => m.challengeId === challengeId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async getParticipants(challengeId: string): Promise<Participant[]> {
    return loadDb().participants.filter((p) => p.challengeId === challengeId)
  },

  /** 닉네임으로 참여. 세션을 기기에 저장하고 참가자를 반환 */
  async join(challenge: Challenge, nickname: string): Promise<Participant> {
    const db = loadDb()
    const exists = db.participants.some(
      (p) => p.challengeId === challenge.id && p.nickname.trim() === nickname.trim(),
    )
    if (exists) throw new Error('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.')
    const participant: Participant = {
      id: uid(),
      challengeId: challenge.id,
      nickname: nickname.trim(),
      token: uid(),
      joinedAt: new Date().toISOString(),
    }
    db.participants.push(participant)
    saveDb(db)
    setSession(challenge.code, { participantId: participant.id, token: participant.token })
    return participant
  },

  async getCheckins(challengeId: string): Promise<Checkin[]> {
    return loadDb().checkins.filter((c) => c.challengeId === challengeId)
  },

  async toggleCheckin(challengeId: string, participantId: string, missionId: string, date: string): Promise<void> {
    const db = loadDb()
    const idx = db.checkins.findIndex(
      (c) => c.participantId === participantId && c.missionId === missionId && c.date === date,
    )
    if (idx >= 0) db.checkins.splice(idx, 1)
    else db.checkins.push({ id: uid(), challengeId, participantId, missionId, date })
    saveDb(db)
  },

  async getWeights(participantId: string): Promise<WeightEntry[]> {
    return loadDb()
      .weights.filter((w) => w.participantId === participantId)
      .sort((a, b) => a.date.localeCompare(b.date))
  },

  async upsertWeight(participantId: string, date: string, weightKg: number): Promise<void> {
    const db = loadDb()
    const existing = db.weights.find((w) => w.participantId === participantId && w.date === date)
    if (existing) existing.weightKg = weightKg
    else db.weights.push({ id: uid(), participantId, date, weightKg })
    saveDb(db)
  },

  async getReactions(challengeId: string, date: string): Promise<Reaction[]> {
    return loadDb().reactions.filter((r) => r.challengeId === challengeId && r.date === date)
  },

  /** 같은 사람에게 같은 이모지를 다시 누르면 취소 */
  async toggleReaction(
    challengeId: string,
    date: string,
    fromParticipantId: string,
    toParticipantId: string,
    emoji: string,
  ): Promise<void> {
    const db = loadDb()
    const idx = db.reactions.findIndex(
      (r) =>
        r.challengeId === challengeId &&
        r.date === date &&
        r.fromParticipantId === fromParticipantId &&
        r.toParticipantId === toParticipantId &&
        r.emoji === emoji,
    )
    if (idx >= 0) db.reactions.splice(idx, 1)
    else db.reactions.push({ id: uid(), challengeId, date, fromParticipantId, toParticipantId, emoji })
    saveDb(db)
  },
}

export const isOnline = supabase !== null
export const store: typeof localStore = isOnline ? supabaseStore : localStore
