import { useState, useCallback, useRef } from 'react'
import type { Pitch, AtBat, BoxscoreBatter, GameOption } from '../types'

const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8787'

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function extractGamePk(v: string): string | null {
  const s = v.trim()
  if (/^\d+$/.test(s)) return s
  try {
    const u = new URL(s.startsWith('http') ? s : `https://x.com?${s}`)
    const g = u.searchParams.get('gamePk') ?? u.searchParams.get('game_pk')
    if (g) return g
  } catch { /* ignore */ }
  const m = s.match(/#(\d+)/) ?? s.match(/\/(\d{6,})/)
  return m ? m[1] : null
}

const NEEDED_COLS = new Set([
  'batter_name', 'pitcher_name', 'p_throws', 'pitch_name', 'stand',
  'plate_x', 'plate_z', 'start_speed', 'spin_rate',
  'description', 'call', 'events',
  'launch_speed', 'launch_angle', 'batSpeed',
  'hc_x', 'hc_y', 'hit_distance', 'xba',
  'ab_number', 'pitch_number', 'inning', 'inning_topbot',
])

function cleanRecord(raw: Record<string, unknown>): Pitch {
  const out: Record<string, unknown> = {}
  for (const k of NEEDED_COLS) {
    const v = raw[k]
    out[k] = (typeof v === 'number' && !isFinite(v)) ? null : (v ?? null)
  }
  return out as unknown as Pitch
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
      p_throws: last.p_throws,
      result: last.events || last.description || '',
      launch_speed: last.launch_speed,
      launch_angle: last.launch_angle,
      hc_x: last.hc_x,
      hc_y: last.hc_y,
      hit_distance: last.hit_distance,
      xba: last.xba,
    })
  })
  atBats.sort((a, b) => a.ab_number - b.ab_number)
  return atBats
}

export function useGameData() {
  const [dateStr, setDateStr] = useState<string>(getYesterday)
  const [games, setGames] = useState<GameOption[]>([])
  const [loading, setLoading] = useState(false)
  const [gamesLoading, setGamesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batters, setBatters] = useState<{ name: string; stand: string | null }[]>([])
  const [selectedBatter, setSelectedBatter] = useState<string>('')
  const [atBats, setAtBats] = useState<AtBat[]>([])
  const [boxscore, setBoxscore] = useState<BoxscoreBatter | null>(null)
  const [gamePk, setGamePk] = useState<string>('')
  const allPitchesRef = useRef<Pitch[]>([])

  const fetchGames = useCallback(async (date: string) => {
    setGamesLoading(true)
    setGames([])
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`)
      if (!res.ok) return
      const json = await res.json() as { dates?: { games?: { gamePk: number; teams: { away: { team: { name: string } }; home: { team: { name: string } } } }[] }[] }
      const list: GameOption[] = (json.dates?.[0]?.games ?? []).map(g => ({
        gamePk: String(g.gamePk),
        label: `${g.teams.away.team.name} @ ${g.teams.home.team.name}`,
      }))
      setGames(list)
    } catch { setGames([]) }
    finally { setGamesLoading(false) }
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
            position?: { abbreviation?: string }
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
            stand: '',
            ab: stats['atBats'] ?? 0,
            h: stats['hits'] ?? 0,
            hr: stats['homeRuns'] ?? 0,
            rbi: stats['rbi'] ?? 0,
            bb: stats['baseOnBalls'] ?? 0,
            k: stats['strikeOuts'] ?? 0,
          })
        }
      }
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
      const target = norm(batterName)
      const found = allBatters.find(b => {
        const n = norm(b.name)
        return n === target || n.includes(target) || target.includes(n)
      })
      if (found) setBoxscore(found)
    } catch { /* optional */ }
  }, [])

  const loadBatterData = useCallback((combined: Pitch[], batterName: string) => {
    const filtered = combined.filter(p => p.batter_name === batterName)
    setAtBats(groupByAtBat(filtered))
  }, [])

  const fetchData = useCallback(async (input: string, batter?: string) => {
    const pk = extractGamePk(input)
    if (!pk) {
      setError('유효한 game_pk 또는 Baseball Savant URL을 입력하세요.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${WORKER_URL}/gf?game_pk=${pk}`)
      if (!res.ok) throw new Error(`Worker 응답 오류: ${res.status}`)
      const json = await res.json() as { team_home?: Record<string, unknown>[]; team_away?: Record<string, unknown>[] }

      const combined: Pitch[] = [
        ...(json.team_home ?? []),
        ...(json.team_away ?? []),
      ].map(cleanRecord)

      if (!combined.length) throw new Error('투구 데이터가 없습니다.')

      allPitchesRef.current = combined
      setGamePk(pk)

      // 타자 목록 (stand 포함)
      const batterMap = new Map<string, string | null>()
      for (const p of combined) {
        if (p.batter_name && !batterMap.has(p.batter_name)) {
          batterMap.set(p.batter_name, p.stand)
        }
      }
      const batterList = Array.from(batterMap.entries()).map(([name, stand]) => ({ name, stand }))
      setBatters(batterList)

      const targetBatter = batter || batterList[0]?.name || ''
      setSelectedBatter(targetBatter)
      loadBatterData(combined, targetBatter)
      fetchBoxscore(pk, targetBatter)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [fetchBoxscore, loadBatterData])

  const changeBatter = useCallback((name: string) => {
    setSelectedBatter(name)
    loadBatterData(allPitchesRef.current, name)
    if (gamePk) fetchBoxscore(gamePk, name)
  }, [gamePk, fetchBoxscore, loadBatterData])

  return {
    dateStr, setDateStr,
    games, gamesLoading, fetchGames,
    loading, error,
    batters, selectedBatter,
    atBats, boxscore, gamePk,
    fetchData, changeBatter,
  }
}
