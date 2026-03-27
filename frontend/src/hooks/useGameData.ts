import { useState, useCallback, useRef } from 'react'
import type { Pitch, AtBat, BoxscoreBatter } from '../types'

const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8787'

// pitcher_report와 동일한 방식
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
  'batter_name', 'pitcher_name', 'pitch_name', 'stand',
  'plate_x', 'plate_z', 'start_speed', 'spin_rate',
  'description', 'call', 'events',
  'launch_speed', 'launch_angle', 'batSpeed',
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
    } catch { /* boxscore optional */ }
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
      const json = await res.json() as { team_home?: Record<string,unknown>[]; team_away?: Record<string,unknown>[] }

      const combined: Pitch[] = [
        ...(json.team_home ?? []),
        ...(json.team_away ?? []),
      ].map(cleanRecord)

      if (!combined.length) throw new Error('투구 데이터가 없습니다.')

      allPitchesRef.current = combined
      setGamePk(pk)

      const batterSet = [...new Set(combined.map(p => p.batter_name).filter(Boolean))] as string[]
      setBatters(batterSet)

      const targetBatter = batter || batterSet[0] || ''
      setSelectedBatter(targetBatter)

      const filtered = combined.filter(p => p.batter_name === targetBatter)
      setAtBats(groupByAtBat(filtered))

      fetchBoxscore(pk, targetBatter)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [fetchBoxscore])

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
