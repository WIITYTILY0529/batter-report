import { useState, useCallback, useRef } from 'react'
import type { Pitch, AtBat, BoxscoreBatter } from '../types'

function extractGamePk(input: string): string | null {
  const trimmed = input.trim()
  // plain number
  if (/^\d+$/.test(trimmed)) return trimmed
  // URL with game_pk param
  const match = trimmed.match(/game_pk=(\d+)/)
  if (match) return match[1]
  // URL path segment
  const pathMatch = trimmed.match(/\/(\d{6,})/)
  if (pathMatch) return pathMatch[1]
  return null
}

function groupByAtBat(pitches: Pitch[]): AtBat[] {
  const map = new Map<number, Pitch[]>()
  for (const p of pitches) {
    if (!map.has(p.ab_number)) map.set(p.ab_number, [])
    map.get(p.ab_number)!.push(p)
  }
  const atBats: AtBat[] = []
  map.forEach((ps, ab_number) => {
    ps.sort((a, b) => a.pitch_number - b.pitch_number)
    const last = ps[ps.length - 1]
    atBats.push({
      ab_number,
      pitches: ps,
      inning: last.inning,
      inning_topbot: last.inning_topbot,
      pitcher_name: last.pitcher_name,
      result: last.events || last.description || '',
      launch_speed: last.launch_speed,
      launch_angle: last.launch_angle,
    })
  })
  atBats.sort((a, b) => a.ab_number - b.ab_number)
  return atBats
}

export function useGameData() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batters, setBatters] = useState<string[]>([])
  const [selectedBatter, setSelectedBatter] = useState<string>('')
  const [atBats, setAtBats] = useState<AtBat[]>([])
  const [boxscore, setBoxscore] = useState<BoxscoreBatter | null>(null)
  const [gamePk, setGamePk] = useState<string>('')
  const allPitchesRef = useRef<Pitch[]>([])

  const fetchData = useCallback(async (input: string, batter?: string) => {
    const pk = extractGamePk(input)
    if (!pk) {
      setError('유효한 game_pk 또는 Baseball Savant URL을 입력하세요.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const workerUrl = import.meta.env.VITE_WORKER_URL as string
      const res = await fetch(`${workerUrl}/gf?game_pk=${pk}`)
      if (!res.ok) throw new Error(`Worker 응답 오류: ${res.status}`)
      const data = await res.json()

      const combined: Pitch[] = [
        ...(data.team_home || []),
        ...(data.team_away || []),
      ]

      allPitchesRef.current = combined
      setGamePk(pk)

      const batterSet = (Array.from(new Set(combined.map((p: Pitch) => p.batter_name))).filter(Boolean)) as string[]
      setBatters(batterSet)

      const targetBatter = batter || batterSet[0] || ''
      setSelectedBatter(targetBatter)

      const filtered = combined.filter((p: Pitch) => p.batter_name === targetBatter)
      setAtBats(groupByAtBat(filtered))

      // Fetch boxscore from MLB Stats API (CORS allowed)
      fetchBoxscore(pk, targetBatter)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBoxscore = useCallback(async (pk: string, batterName: string) => {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/game/${pk}/boxscore`)
      if (!res.ok) return
      const data = await res.json() as {
        teams?: Record<string, {
          batters?: number[]
          players?: Record<string, {
            person?: { fullName?: string }
            stats?: { batting?: Record<string, number> }
          }>
        }>
      }
      const allBatters: BoxscoreBatter[] = []

      for (const side of ['home', 'away']) {
        const battersArr = data.teams?.[side]?.batters || []
        const players = data.teams?.[side]?.players || {}
        for (const id of battersArr) {
          const p = players[`ID${id}`]
          if (!p) continue
          const stats = p.stats?.batting || {}
          allBatters.push({
            name: p.person?.fullName || '',
            ab: stats.atBats ?? 0,
            h: stats.hits ?? 0,
            hr: stats.homeRuns ?? 0,
            rbi: stats.rbi ?? 0,
            bb: stats.baseOnBalls ?? 0,
            k: stats.strikeOuts ?? 0,
          })
        }
      }

      const found = allBatters.find(b =>
        b.name.toLowerCase().includes(batterName.toLowerCase()) ||
        batterName.toLowerCase().includes(b.name.toLowerCase())
      )
      if (found) setBoxscore(found)
    } catch {
      // boxscore is optional
    }
  }, [])

  const changeBatter = useCallback((name: string) => {
    setSelectedBatter(name)
    const filtered = allPitchesRef.current.filter(p => p.batter_name === name)
    setAtBats(groupByAtBat(filtered))
    if (gamePk) fetchBoxscore(gamePk, name)
  }, [gamePk, fetchBoxscore])

  return {
    loading, error, batters, selectedBatter, atBats, boxscore, gamePk,
    fetchData, changeBatter,
  }
}
