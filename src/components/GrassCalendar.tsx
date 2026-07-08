import type { Checkin, Mission } from '../types'
import { addDays, todayStr } from '../utils'

// 챌린지 기간 전체를 7열(주 단위) 잔디로 표시. 완료율에 따라 색 농도.
export default function GrassCalendar({
  startDate,
  endDate,
  checkins,
  missions,
  participantId,
}: {
  startDate: string
  endDate: string
  checkins: Checkin[]
  missions: Mission[]
  participantId: string
}) {
  const today = todayStr()
  const dates: string[] = []
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) dates.push(d)

  const mine = checkins.filter((c) => c.participantId === participantId)

  function level(date: string): string {
    if (date > today) return 'future'
    const done = mine.filter((c) => c.date === date).length
    if (done === 0) return ''
    const ratio = done / Math.max(missions.length, 1)
    if (ratio >= 1) return 'l3'
    if (ratio >= 0.5) return 'l2'
    return 'l1'
  }

  return (
    <div>
      <div className="grass">
        {dates.map((d) => (
          <div key={d} className={`cell ${level(d)}`} title={d}>
            {d.slice(8)}
          </div>
        ))}
      </div>
      <div className="grass-legend">
        <span>적음</span>
        <span className="sw" style={{ background: '#eceff0' }} />
        <span className="sw" style={{ background: '#bbe8d4' }} />
        <span className="sw" style={{ background: '#5fd0a3' }} />
        <span className="sw" style={{ background: '#10b981' }} />
        <span>완료</span>
      </div>
    </div>
  )
}
