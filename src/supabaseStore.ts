// Supabase 구현 — 읽기는 공개 테이블/뷰 select, 쓰기는 token 검증 RPC로만 수행.
// localStore와 동일한 시그니처 (store.ts에서 환경변수 유무로 선택)
import { supabase } from './lib/supabase'
import { setSession, tokenFor } from './session'
import type { Challenge, Checkin, Mission, Participant, Photo, Reaction, WeightEntry } from './types'
import type { MissionInput } from './store'

function sb() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요.')
  return supabase
}

function mapChallenge(r: any): Challenge {
  return { id: r.id, code: r.code, name: r.name, startDate: r.start_date, endDate: r.end_date, createdAt: r.created_at }
}

function mapParticipant(r: any): Participant {
  return { id: r.id, challengeId: r.challenge_id, nickname: r.nickname, token: r.token ?? '', joinedAt: r.joined_at }
}

export const supabaseStore = {
  async createChallenge(
    name: string,
    startDate: string,
    endDate: string,
    missions: MissionInput[],
  ): Promise<Challenge> {
    const { data, error } = await sb().rpc('api_create_challenge', {
      p_name: name,
      p_start: startDate,
      p_end: endDate,
      p_missions: missions,
    })
    if (error) throw new Error(error.message)
    return mapChallenge(data)
  },

  async getChallengeByCode(code: string): Promise<Challenge | null> {
    const { data, error } = await sb()
      .from('challenges')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapChallenge(data) : null
  },

  async getMissions(challengeId: string): Promise<Mission[]> {
    const { data, error } = await sb()
      .from('missions')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('sort_order')
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => ({
      id: r.id,
      challengeId: r.challenge_id,
      emoji: r.emoji,
      title: r.title,
      sortOrder: r.sort_order,
    }))
  },

  async getParticipants(challengeId: string): Promise<Participant[]> {
    // token이 노출되지 않는 공개 뷰 사용
    const { data, error } = await sb().from('participants_public').select('*').eq('challenge_id', challengeId)
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapParticipant)
  },

  async join(challenge: Challenge, nickname: string): Promise<Participant> {
    const { data, error } = await sb().rpc('api_join_challenge', {
      p_code: challenge.code,
      p_nickname: nickname.trim(),
    })
    if (error) {
      if (error.message.includes('NICKNAME_TAKEN'))
        throw new Error('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.')
      throw new Error(error.message)
    }
    const participant = mapParticipant(data)
    setSession(challenge.code, { participantId: participant.id, token: participant.token })
    return participant
  },

  async getCheckins(challengeId: string): Promise<Checkin[]> {
    const { data, error } = await sb().from('checkins').select('*').eq('challenge_id', challengeId)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => ({
      id: r.id,
      challengeId: r.challenge_id,
      participantId: r.participant_id,
      missionId: r.mission_id,
      date: r.date,
    }))
  },

  async toggleCheckin(challengeId: string, participantId: string, missionId: string, date: string): Promise<void> {
    const { error } = await sb().rpc('api_toggle_checkin', {
      p_participant: participantId,
      p_token: tokenFor(participantId),
      p_mission: missionId,
      p_date: date,
    })
    if (error) throw new Error(error.message)
  },

  async getWeights(participantId: string): Promise<WeightEntry[]> {
    // 체중은 본인만 조회 가능 (token 검증 RPC)
    const { data, error } = await sb().rpc('api_get_weights', {
      p_participant: participantId,
      p_token: tokenFor(participantId),
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map((r: any) => ({
      id: r.id,
      participantId: r.participant_id,
      date: r.date,
      weightKg: Number(r.weight_kg),
    }))
  },

  async upsertWeight(participantId: string, date: string, weightKg: number): Promise<void> {
    const { error } = await sb().rpc('api_upsert_weight', {
      p_participant: participantId,
      p_token: tokenFor(participantId),
      p_date: date,
      p_weight: weightKg,
    })
    if (error) throw new Error(error.message)
  },

  async getReactions(challengeId: string, date: string): Promise<Reaction[]> {
    const { data, error } = await sb().from('reactions').select('*').eq('challenge_id', challengeId).eq('date', date)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => ({
      id: r.id,
      challengeId: r.challenge_id,
      date: r.date,
      fromParticipantId: r.from_participant_id,
      toParticipantId: r.to_participant_id,
      emoji: r.emoji,
    }))
  },

  async getPhotos(challengeId: string, date: string): Promise<Photo[]> {
    const { data, error } = await sb().from('photos').select('*').eq('challenge_id', challengeId).eq('date', date)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => ({
      id: r.id,
      challengeId: r.challenge_id,
      participantId: r.participant_id,
      date: r.date,
      // path 고정 업로드(upsert)라 created_at으로 캐시 무효화
      url: `${sb().storage.from('fitmate-photos').getPublicUrl(r.path).data.publicUrl}?t=${encodeURIComponent(r.created_at)}`,
    }))
  },

  /** Storage 업로드(같은 날짜 경로 덮어쓰기) 후 token 검증 RPC로 기록 */
  async upsertPhoto(challengeId: string, participantId: string, date: string, image: Blob): Promise<void> {
    const path = `${participantId}/${date}.jpg`
    const { error: upErr } = await sb()
      .storage.from('fitmate-photos')
      .upload(path, image, { upsert: true, contentType: 'image/jpeg' })
    if (upErr) throw new Error(upErr.message)
    const { error } = await sb().rpc('api_upsert_photo', {
      p_participant: participantId,
      p_token: tokenFor(participantId),
      p_date: date,
      p_path: path,
    })
    if (error) throw new Error(error.message)
  },

  async toggleReaction(
    challengeId: string,
    date: string,
    fromParticipantId: string,
    toParticipantId: string,
    emoji: string,
  ): Promise<void> {
    const { error } = await sb().rpc('api_toggle_reaction', {
      p_challenge: challengeId,
      p_date: date,
      p_from: fromParticipantId,
      p_token: tokenFor(fromParticipantId),
      p_to: toParticipantId,
      p_emoji: emoji,
    })
    if (error) throw new Error(error.message)
  },
}
