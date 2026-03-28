import { useState, useEffect, useRef } from 'react'
import { useGameData } from './hooks/useGameData'
import { PlayerHeader } from './components/PlayerHeader'
import { AtBatCard } from './components/AtBatCard'
import { COLORS } from './constants'
import './App.css'

export default function App() {
  const [manualInput, setManualInput] = useState('')
  const [selectedGamePk, setSelectedGamePk] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [countdown, setCountdown] = useState(15)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const {
    dateStr, setDateStr,
    games, gamesLoading, fetchGames,
    loading, error,
    batters, selectedBatter,
    atBats, boxscore, gamePk,
    fetchData, changeBatter,
  } = useGameData()

  // 날짜 변경 시 경기 목록 로드
  useEffect(() => { fetchGames(dateStr) }, [dateStr, fetchGames])

  // Auto update 카운트다운
  useEffect(() => {
    if (autoUpdate && gamePk && selectedBatter) {
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            fetchData(gamePk, selectedBatter)
            return 15
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setCountdown(15)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoUpdate, gamePk, selectedBatter, fetchData])

  const handleLoad = () => {
    const input = manualInput.trim() || selectedGamePk
    if (!input) return
    fetchData(input)
  }

  const handleManualRefresh = () => {
    if (!gamePk || !selectedBatter) return
    fetchData(gamePk, selectedBatter)
    setCountdown(15)
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>⚾ MLB 타자 리포트</h1>
      </header>

      <main className="app-main">
        {/* 날짜 + 경기 선택 */}
        <div className="input-section">
          <div className="input-row">
            <div className="input-group">
              <label className="input-label">날짜</label>
              <input
                type="date"
                className="date-input"
                value={dateStr}
                onChange={e => {
                  setDateStr(e.target.value)
                  setSelectedGamePk('')
                }}
              />
            </div>

            <div className="input-group" style={{ flex: 2 }}>
              <label className="input-label">경기 선택 {gamesLoading && <span style={{ color: COLORS.GOLD, fontSize: 11 }}>로딩 중...</span>}</label>
              <select
                className="batter-select"
                value={selectedGamePk}
                onChange={e => setSelectedGamePk(e.target.value)}
              >
                <option value="">경기를 선택하세요</option>
                {games.map(g => (
                  <option key={g.gamePk} value={g.gamePk}>{g.label}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ flex: 2 }}>
              <label className="input-label">또는 직접 입력 (game_pk / URL)</label>
              <input
                className="game-input"
                type="text"
                placeholder="game_pk 또는 URL"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLoad()}
              />
            </div>

            <button className="btn-primary" onClick={handleLoad} disabled={loading} style={{ alignSelf: 'flex-end' }}>
              {loading ? '로딩 중...' : '조회'}
            </button>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* 타자 선택 + 컨트롤 */}
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
                <option key={b.name} value={b.name}>
                  {b.name}{b.stand ? ` (${b.stand === 'L' ? 'LHB' : b.stand === 'R' ? 'RHB' : b.stand})` : ''}
                </option>
              ))}
            </select>

            {gamePk && (
              <span style={{ color: COLORS.GRAY_MID, fontSize: 12 }}>game_pk: {gamePk}</span>
            )}

            {/* 수동 업데이트 버튼 */}
            <button
              className="btn-refresh"
              onClick={handleManualRefresh}
              disabled={loading || !gamePk}
              title="수동 업데이트"
            >
              ↺ 새로고침
            </button>

            {/* Auto update */}
            <label className="auto-label">
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={e => setAutoUpdate(e.target.checked)}
              />
              Auto {autoUpdate ? <span style={{ color: COLORS.GOLD, fontWeight: 700 }}>{countdown}s</span> : '(15s)'}
            </label>
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
