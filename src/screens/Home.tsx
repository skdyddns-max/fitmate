import { useEffect, useState } from 'react'
import { navigate } from '../App'
import { getSession, isOnline, store } from '../store'
import type { Challenge } from '../types'

export default function Home() {
  const [myRooms, setMyRooms] = useState<Challenge[]>([])

  useEffect(() => {
    // 이 기기에서 참여한 적 있는 방 목록
    const raw = localStorage.getItem('fitmate-session')
    if (!raw) return
    const codes = Object.keys(JSON.parse(raw))
    Promise.all(codes.map((c) => store.getChallengeByCode(c))).then((rooms) =>
      setMyRooms(rooms.filter((r): r is Challenge => r !== null && getSession(r.code) !== null)),
    )
  }, [])

  return (
    <div className="screen home">
      <div className="logo">🥗</div>
      <h1>FitMate</h1>
      <p className="tagline">친구들과 같이 하는 다이어트 챌린지</p>
      <button className="btn btn-primary" onClick={() => navigate('/create')}>
        챌린지 만들기
      </button>
      <button className="btn btn-secondary" onClick={() => navigate('/join')}>
        코드로 참여하기
      </button>

      {!isOnline && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
          연습 모드 — 데이터가 이 기기에만 저장돼요
        </p>
      )}

      {myRooms.length > 0 && (
        <div className="my-rooms">
          <h2>참여 중인 챌린지</h2>
          {myRooms.map((r) => (
            <div key={r.id} className="room-link" onClick={() => navigate(`/room/${r.code}`)}>
              <span>{r.name}</span>
              <span className="code">{r.code} →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
