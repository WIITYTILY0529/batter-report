import { useState, useEffect, useRef } from 'react'
import { useGameData } from './hooks/useGameData'
import { PlayerHeader } from './components/PlayerHeader'
import { AtBatCard } from './components/AtBatCard'
import { COLORS } from './constants'
import './App.css'

export default function App() {
  const [input, setInput] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastInputRef = useRef('')

  const {
    loading, error, batters, selectedBatter,
    atBats, boxscore, gamePk,
    fetchData, changeBatter,
  } = useGameData()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    lastInputRef.current = input.trim()
    fetchData(input.trim())
  }

  // Auto update
  useEffect(() => {
    if (autoUpdate && lastInputRef.current) {
      intervalRef.current = setInterval(() => {
        fetchData(lastInputRef.current, selectedBatter || undefined)
      }, 15000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoUpdate, selectedBatter, fetchData])

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>⚾ MLB 타자 리포트</h1>
      </header>

      <main className="app-main">
        {/* Input */}
        <form onSubmit={handleSubmit} className="input-row">
          <input
            className="game-input"
            type="text"
            placeholder="game_pk 또는 Baseball Savant URL 입력"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '로딩 중...' : '조회'}
          </button>
          <label className="auto-label">
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={e => setAutoUpdate(e.target.checked)}
            />
            Auto Update (15s)
          </label>
        </form>

        {error && <div className="error-msg">{error}</div>}

        {/* Batter selector */}
        {batters.length > 0 && (
          <div className="batter-row">
            <label htmlFor="batter-select" style={{ color: COLORS.GRAY_MID, fontSize: 13 }}>타자 선택</label>
            <select
              id="batter-select"
              className="batter-select"
              value={selectedBatter}
              onChange={e => changeBatter(e.target.value)}
            >
              {batters.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {gamePk && (
              <span style={{ color: COLORS.GRAY_MID, fontSize: 12 }}>game_pk: {gamePk}</span>
            )}
          </div>
        )}

        {/* Player header */}
        {selectedBatter && (
          <PlayerHeader batter={boxscore} batterName={selectedBatter} />
        )}

        {/* At-bat cards */}
        <div className="atbat-list">
          {atBats.map(ab => (
            <AtBatCard key={ab.ab_number} atBat={ab} />
          ))}
        </div>

        {!loading && atBats.length === 0 && selectedBatter && (
          <div style={{ color: COLORS.GRAY_MID, textAlign: 'center', marginTop: 40 }}>
            타석 데이터가 없습니다.
          </div>
        )}
      </main>
    </div>
  )
}
