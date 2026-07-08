import { useCallback, useEffect, useState } from 'react'
import { navigate } from '../App'
import { getSession, isOnline, store } from '../store'
import type { Challenge, Checkin, Mission, Participant, Reaction, WeightEntry } from '../types'
import { achievementRate, formatDateKo, streak, todayStr } from '../utils'
import GrassCalendar from '../components/GrassCalendar'
import WeightChart from '../components/WeightChart'

const REACT_EMOJIS = ['👏', '🔥', '💪']

type Tab = 'today' | 'rank' | 'me'

export default function Room({ code }: { code: string }) {
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined)
  const [missions, setMissions] = useState<Mission[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [tab, setTab] = useState<Tab>('today')
  const [weightInput, setWeightInput] = useState('')
  const [toast, setToast] = useState('')
  const [loaded, setLoaded] = useState(false)

  const today = todayStr()
  const session = getSession(code)
  const me = participants.find((p) => p.id === session?.participantId)

  const reload = useCallback(async () => {
    const c = await store.getChallengeByCode(code)
    setChallenge(c)
    if (!c) return
    const [ms, ps, cks, rs] = await Promise.all([
      store.getMissions(c.id),
      store.getParticipants(c.id),
      store.getCheckins(c.id),
      store.getReactions(c.id, todayStr()),
    ])
    setMissions(ms)
    setParticipants(ps)
    setCheckins(cks)
    setReactions(rs)
    const s = getSession(code)
    if (s) setWeights(await store.getWeights(s.participantId))
    setLoaded(true)
  }, [code])

  useEffect(() => {
    reload()
    // 온라인 모드에서는 다른 참가자의 인증·응원을 30초마다 갱신
    if (!isOnline) return
    const timer = setInterval(reload, 30000)
    return () => clearInterval(timer)
  }, [reload])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  if (challenge === undefined) return <div className="screen" />
  if (challenge === null)
    return (
      <div className="screen">
        <p className="empty">챌린지를 찾을 수 없어요.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          홈으로
        </button>
      </div>
    )
  if (!session || (loaded && !me)) {
    // 참여하지 않은 기기에서 링크로 들어온 경우 → 참여 화면으로
    navigate(`/join?code=${code}`)
    return null
  }
  if (!me) return <div className="screen" /> // 데이터 로딩 중

  async function toggleMission(missionId: string) {
    await store.toggleCheckin(challenge!.id, me!.id, missionId, today)
    reload()
  }

  async function saveWeight() {
    const v = parseFloat(weightInput)
    if (isNaN(v) || v <= 0 || v > 300) return
    await store.upsertWeight(me!.id, today, v)
    setWeightInput('')
    showToast('체중이 기록됐어요')
    reload()
  }

  async function react(toId: string, emoji: string) {
    await store.toggleReaction(challenge!.id, today, me!.id, toId, emoji)
    reload()
  }

  function copyInvite() {
    const url = `${location.origin}${location.pathname}#/join?code=${challenge!.code}`
    navigator.clipboard.writeText(`[FitMate] "${challenge!.name}" 챌린지에 초대해요!\n참여 코드: ${challenge!.code}\n${url}`)
    showToast('초대 링크를 복사했어요')
  }

  const myTodayDone = checkins.filter((c) => c.participantId === me.id && c.date === today).length
  const todayWeight = weights.find((w) => w.date === today)

  const ranking = participants
    .map((p) => ({
      p,
      rate: achievementRate(checkins, p.id, missions, challenge.startDate, challenge.endDate),
      stk: streak(checkins, p.id, missions, challenge.startDate),
    }))
    .sort((a, b) => b.rate - a.rate || b.stk - a.stk)

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
        <div className="room-header" style={{ marginBottom: 0 }}>
          <h1>{challenge.name}</h1>
          <p className="period">
            {challenge.startDate} ~ {challenge.endDate} · {participants.length}명 참여 중
          </p>
        </div>
      </div>
      <div className="share-row" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="chip" onClick={copyInvite}>
          🔗 초대 링크 복사
        </button>
        <span className="chip" style={{ cursor: 'default' }}>
          코드 {challenge.code}
        </span>
      </div>

      <div className="tabs">
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>
          오늘
        </button>
        <button className={tab === 'rank' ? 'active' : ''} onClick={() => setTab('rank')}>
          랭킹
        </button>
        <button className={tab === 'me' ? 'active' : ''} onClick={() => setTab('me')}>
          내 기록
        </button>
      </div>

      {tab === 'today' && (
        <>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 10 }}>
            {formatDateKo(today)} · 오늘 {myTodayDone}/{missions.length} 완료
          </p>
          {missions.map((m) => {
            const done = checkins.some((c) => c.participantId === me.id && c.missionId === m.id && c.date === today)
            return (
              <button key={m.id} className={`mission-check ${done ? 'done' : ''}`} onClick={() => toggleMission(m.id)}>
                <span className="m-emoji">{m.emoji}</span>
                <span className="m-title">{m.title}</span>
                <span className="check">✓</span>
              </button>
            )
          })}

          <p className="section-title">오늘 체중 (선택 · 나에게만 보여요)</p>
          <div className="weight-row">
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder={todayWeight ? `오늘 기록: ${todayWeight.weightKg}kg` : 'kg'}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
            />
            <button className="btn btn-primary" onClick={saveWeight}>
              기록
            </button>
          </div>

          <p className="section-title">함께하는 메이트</p>
          <div className="card" style={{ padding: '4px 14px' }}>
            {participants.map((p) => {
              const doneCount = checkins.filter((c) => c.participantId === p.id && c.date === today).length
              const isMe = p.id === me.id
              return (
                <div key={p.id} className="member-row">
                  <div className="avatar">{p.nickname[0]}</div>
                  <div className="m-info">
                    <div className="m-name">
                      {p.nickname}
                      {isMe && <span className="me-badge">나</span>}
                    </div>
                    <div className="m-progress">
                      {doneCount === missions.length && missions.length > 0
                        ? '오늘 미션 완료! 🎉'
                        : `오늘 ${doneCount}/${missions.length} 완료`}
                    </div>
                  </div>
                  {isMe ? (
                    // 내가 받은 응원 (읽기 전용)
                    <div className="react-btns">
                      {REACT_EMOJIS.map((em) => {
                        const cnt = reactions.filter((r) => r.toParticipantId === p.id && r.emoji === em).length
                        if (cnt === 0) return null
                        return (
                          <span key={em} className="react-btn on" style={{ cursor: 'default' }}>
                            {em}
                            <span className="cnt">{cnt}</span>
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="react-btns">
                      {REACT_EMOJIS.map((em) => {
                        const cnt = reactions.filter((r) => r.toParticipantId === p.id && r.emoji === em).length
                        const mine = reactions.some(
                          (r) => r.toParticipantId === p.id && r.fromParticipantId === me.id && r.emoji === em,
                        )
                        return (
                          <button key={em} className={`react-btn ${mine ? 'on' : ''}`} onClick={() => react(p.id, em)}>
                            {em}
                            {cnt > 0 && <span className="cnt">{cnt}</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'rank' && (
        <div className="card" style={{ padding: '4px 16px' }}>
          {ranking.map(({ p, rate, stk }, i) => (
            <div key={p.id} className="rank-row">
              <div className="rank-no">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</div>
              <div className="r-info">
                <div className="r-name">
                  {p.nickname}
                  {p.id === me.id && <span className="me-badge" style={{ color: 'var(--green-dark)', fontSize: 12 }}> 나</span>}
                </div>
                <div className="rank-bar">
                  <div style={{ width: `${rate}%` }} />
                </div>
              </div>
              <div className="r-stats">
                <div className="r-rate">{rate}%</div>
                {stk > 0 && <div className="r-streak">🔥 {stk}일 연속</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'me' && (
        <>
          <p className="section-title" style={{ marginTop: 4 }}>
            인증 달력
          </p>
          <div className="card">
            <GrassCalendar
              startDate={challenge.startDate}
              endDate={challenge.endDate}
              checkins={checkins}
              missions={missions}
              participantId={me.id}
            />
          </div>
          <p className="section-title">체중 변화</p>
          <div className="card">
            <WeightChart weights={weights} />
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
