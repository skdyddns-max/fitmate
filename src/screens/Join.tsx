import { useState } from 'react'
import { navigate } from '../App'
import { getSession, store } from '../store'

export default function Join({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode.toUpperCase())
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  async function handleJoin() {
    setError('')
    const challenge = await store.getChallengeByCode(code.trim())
    if (!challenge) {
      setError('해당 코드의 챌린지를 찾을 수 없어요. 코드를 다시 확인해주세요.')
      return
    }
    // 이미 참여한 방이면 바로 입장
    if (getSession(challenge.code)) {
      navigate(`/room/${challenge.code}`)
      return
    }
    try {
      await store.join(challenge, nickname)
      navigate(`/room/${challenge.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요.')
    }
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>코드로 참여하기</h1>
      </div>

      <label className="label">참여 코드</label>
      <input
        className="input"
        placeholder="6자리 코드"
        value={code}
        maxLength={6}
        style={{ textTransform: 'uppercase', letterSpacing: 4, fontWeight: 700, textAlign: 'center' }}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />

      <label className="label">내 닉네임</label>
      <input
        className="input"
        placeholder="챌린지에서 사용할 이름"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />

      {error && <p className="error">{error}</p>}
      <div style={{ height: 24 }} />
      <button className="btn btn-primary" disabled={code.length !== 6 || !nickname.trim()} onClick={handleJoin}>
        참여하기
      </button>
    </div>
  )
}
