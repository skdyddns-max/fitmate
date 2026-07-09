import { useCallback, useEffect, useRef, useState } from 'react'
import { navigate } from '../App'
import { getSession, isOnline, store } from '../store'
import type { Challenge, Checkin, Mission, Participant, Reaction, WeightEntry } from '../types'
import {
  achievementRate,
  bestStreak,
  completeDays,
  ddayLabel,
  formatDateKo,
  getBadges,
  streak,
  todayStr,
} from '../utils'
import GrassCalendar from '../components/GrassCalendar'
import WeightChart from '../components/WeightChart'
import ProgressRing from '../components/ProgressRing'
import Confetti from '../components/Confetti'

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
  const [celebrate, setCelebrate] = useState(false)
  const celebrateTimer = useRef<number>()

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

  const dday = ddayLabel(challenge.startDate, challenge.endDate)
  const notStarted = dday.state === 'before'
  const ended = dday.state === 'over'

  async function toggleMission(missionId: string) {
    const wasAllDone =
      missions.length > 0 &&
      missions.every((m) => checkins.some((c) => c.participantId === me!.id && c.missionId === m.id && c.date === today))
    const turningOn = !checkins.some(
      (c) => c.participantId === me!.id && c.missionId === missionId && c.date === today,
    )
    await store.toggleCheckin(challenge!.id, me!.id, missionId, today)
    await reload()
    // 방금 체크로 오늘 전체 완료가 됐으면 축하
    if (turningOn && !wasAllDone) {
      const nowAllDone = missions.every(
        (m) =>
          m.id === missionId ||
          checkins.some((c) => c.participantId === me!.id && c.missionId === m.id && c.date === today),
      )
      if (nowAllDone) {
        setCelebrate(true)
        window.clearTimeout(celebrateTimer.current)
        celebrateTimer.current = window.setTimeout(() => setCelebrate(false), 3200)
      }
    }
  }

  async function saveWeight() {
    const v = parseFloat(weightInput)
    if (isNaN(v) || v <= 0 || v > 300) return
    await store.upsertWeight(me!.id, today, v)
    setWeightInput('')
    showToast('체중이 기록됐어요 ⚖️')
    reload()
  }

  async function react(toId: string, emoji: string) {
    await store.toggleReaction(challenge!.id, today, me!.id, toId, emoji)
    reload()
  }

  function copyInvite() {
    const url = `${location.origin}${location.pathname}#/join?code=${challenge!.code}`
    navigator.clipboard.writeText(
      `🥗 [FitMate] "${challenge!.name}" 챌린지에 초대해요!\n같이 건강해져요 💪\n\n참여 코드: ${challenge!.code}\n${url}`,
    )
    showToast('초대 링크를 복사했어요 🔗')
  }

  const myTodayDone = checkins.filter((c) => c.participantId === me.id && c.date === today).length
  const allDoneToday = missions.length > 0 && myTodayDone === missions.length
  const todayWeight = weights.find((w) => w.date === today)

  const ranking = participants
    .map((p) => ({
      p,
      rate: achievementRate(checkins, p.id, missions, challenge.startDate, challenge.endDate),
      stk: streak(checkins, p.id, missions, challenge.startDate),
    }))
    .sort((a, b) => b.rate - a.rate || b.stk - a.stk)

  const winner = ranking[0]
  const myBadges = getBadges(checkins, me.id, missions, challenge.startDate, challenge.endDate)

  return (
    <div className="screen">
      <div className="top-bar" style={{ marginBottom: 12 }}>
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
      </div>

      <div className="hero-card">
        <div className="h-info">
          <h1>{challenge.name}</h1>
          <p className="h-meta">
            {challenge.startDate.slice(5).replace('-', '.')} ~ {challenge.endDate.slice(5).replace('-', '.')} ·{' '}
            {participants.length}명 함께
          </p>
          <div className="h-chips">
            <span className="hero-chip" style={{ cursor: 'default' }}>
              {dday.text}
            </span>
            <button className="hero-chip" onClick={copyInvite}>
              🔗 초대하기
            </button>
            <span className="hero-chip" style={{ cursor: 'default' }}>
              {challenge.code}
            </span>
          </div>
        </div>
        <ProgressRing done={myTodayDone} total={missions.length} />
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
          {ended ? (
            <div className="winner-banner">
              🎉 챌린지 종료! 우승 {winner?.p.nickname} ({winner?.rate}%) — 모두 수고했어요!
            </div>
          ) : notStarted ? (
            <div className="all-done-banner">챌린지 시작 전이에요. {dday.text}!</div>
          ) : (
            <>
              <p className="today-date">{formatDateKo(today)}</p>
              {allDoneToday && <div className="all-done-banner">오늘 미션 올클리어! 내일도 만나요 🎉</div>}
              {missions.map((m) => {
                const done = checkins.some(
                  (c) => c.participantId === me.id && c.missionId === m.id && c.date === today,
                )
                return (
                  <button
                    key={m.id}
                    className={`mission-check ${done ? 'done' : ''}`}
                    onClick={() => toggleMission(m.id)}
                  >
                    <span className="m-emoji">{m.emoji}</span>
                    <span className="m-title">{m.title}</span>
                    <span className="check">✓</span>
                  </button>
                )
              })}

              <p className="section-title">오늘 체중 ⚖️ (선택 · 나에게만 보여요)</p>
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
            </>
          )}

          <p className="section-title">함께하는 메이트</p>
          <div className="card" style={{ padding: '4px 15px' }}>
            {participants.map((p) => {
              const doneCount = checkins.filter((c) => c.participantId === p.id && c.date === today).length
              const isMe = p.id === me.id
              const complete = doneCount === missions.length && missions.length > 0
              return (
                <div key={p.id} className="member-row">
                  <div className="avatar">{p.nickname[0]}</div>
                  <div className="m-info">
                    <div className="m-name">
                      {p.nickname}
                      {isMe && <span className="me-badge">나</span>}
                    </div>
                    <div className={`m-progress ${complete ? 'complete' : ''}`}>
                      {complete ? '오늘 미션 완료! 🎉' : `오늘 ${doneCount}/${missions.length} 완료`}
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
        <>
          {ended && winner && (
            <div className="winner-banner">👑 최종 우승 — {winner.p.nickname} · 달성률 {winner.rate}%</div>
          )}
          <div className="card" style={{ padding: '4px 16px' }}>
            {ranking.map(({ p, rate, stk }, i) => (
              <div key={p.id} className="rank-row">
                <div className="rank-no">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</div>
                <div className="r-info">
                  <div className="r-name">
                    {p.nickname}
                    {p.id === me.id && <span className="me-badge">나</span>}
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
        </>
      )}

      {tab === 'me' && (
        <>
          <div className="stat-grid" style={{ marginTop: 4 }}>
            <div className="stat-tile">
              <div className="s-val">{completeDays(checkins, me.id, missions, challenge.startDate, challenge.endDate)}일</div>
              <div className="s-label">완벽한 하루</div>
            </div>
            <div className="stat-tile">
              <div className="s-val">
                {bestStreak(checkins, me.id, missions, challenge.startDate, challenge.endDate)}일
              </div>
              <div className="s-label">최고 스트릭</div>
            </div>
            <div className="stat-tile">
              <div className="s-val">
                {weights.length >= 2
                  ? `${(weights[weights.length - 1].weightKg - weights[0].weightKg).toFixed(1)}kg`
                  : '—'}
              </div>
              <div className="s-label">체중 변화</div>
            </div>
          </div>

          <p className="section-title">나의 뱃지</p>
          <div className="badge-grid">
            {myBadges.map((b) => (
              <div key={b.name} className={`badge-tile ${b.earned ? 'earned' : 'locked'}`}>
                <div className="b-emoji">{b.emoji}</div>
                <div className="b-name">{b.name}</div>
                <div className="b-cond">{b.cond}</div>
              </div>
            ))}
          </div>

          <p className="section-title">인증 달력</p>
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

      {celebrate && <Confetti />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
