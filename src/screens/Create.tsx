import { useState } from 'react'
import { navigate } from '../App'
import { store, type MissionInput } from '../store'
import { addDays, todayStr } from '../utils'
import type { Challenge } from '../types'

const DEFAULT_MISSIONS: MissionInput[] = [
  { emoji: '🚫', title: '야식 안 먹기' },
  { emoji: '🚶', title: '만보 걷기' },
  { emoji: '💧', title: '물 2L 마시기' },
]

export default function Create() {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayStr())
  const [weeks, setWeeks] = useState(4)
  const [missions, setMissions] = useState<MissionInput[]>(DEFAULT_MISSIONS)
  const [nickname, setNickname] = useState('')
  const [created, setCreated] = useState<Challenge | null>(null)
  const [error, setError] = useState('')

  const valid =
    name.trim() && nickname.trim() && missions.length > 0 && missions.every((m) => m.title.trim())

  async function handleCreate() {
    setError('')
    try {
      const endDate = addDays(startDate, weeks * 7 - 1)
      const challenge = await store.createChallenge(name.trim(), startDate, endDate, missions)
      await store.join(challenge, nickname)
      setCreated(challenge)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요.')
    }
  }

  if (created) {
    return (
      <div className="screen">
        <div className="top-bar">
          <h1>챌린지가 만들어졌어요! 🎉</h1>
        </div>
        <div className="card code-box">
          <p>친구에게 이 코드를 공유하세요</p>
          <div className="code-big">{created.code}</div>
          <p>코드를 입력하면 바로 참여할 수 있어요</p>
        </div>
        <div style={{ height: 12 }} />
        <button
          className="btn btn-secondary"
          onClick={() => {
            const url = `${location.origin}${location.pathname}#/join?code=${created.code}`
            navigator.clipboard.writeText(`[FitMate] "${created.name}" 챌린지에 초대해요!\n${url}`)
          }}
        >
          초대 링크 복사
        </button>
        <div style={{ height: 8 }} />
        <button className="btn btn-primary" onClick={() => navigate(`/room/${created.code}`)}>
          챌린지 시작하기
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>챌린지 만들기</h1>
      </div>

      <label className="label">챌린지 이름</label>
      <input
        className="input"
        placeholder="예: 여름맞이 4주 챌린지"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="label">시작일</label>
      <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

      <label className="label">기간</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[2, 4, 8].map((w) => (
          <button
            key={w}
            className={weeks === w ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '12px 0', fontSize: 15 }}
            onClick={() => setWeeks(w)}
          >
            {w}주
          </button>
        ))}
      </div>

      <label className="label">매일 할 미션</label>
      {missions.map((m, i) => (
        <div className="mission-row" key={i}>
          <input
            className="input emoji-input"
            value={m.emoji}
            onChange={(e) => setMissions(missions.map((x, j) => (j === i ? { ...x, emoji: e.target.value } : x)))}
          />
          <input
            className="input"
            placeholder="미션 내용"
            value={m.title}
            onChange={(e) => setMissions(missions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
          />
          <button className="remove" onClick={() => setMissions(missions.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      {missions.length < 5 && (
        <button className="btn btn-ghost" onClick={() => setMissions([...missions, { emoji: '✅', title: '' }])}>
          + 미션 추가
        </button>
      )}

      <label className="label">내 닉네임</label>
      <input
        className="input"
        placeholder="예: 용디"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />

      {error && <p className="error">{error}</p>}
      <div style={{ height: 24 }} />
      <button className="btn btn-primary" disabled={!valid} onClick={handleCreate}>
        만들기
      </button>
    </div>
  )
}
