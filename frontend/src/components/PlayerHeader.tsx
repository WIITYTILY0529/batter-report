import type { BoxscoreBatter } from '../types'
import { COLORS } from '../constants'

interface Props {
  batter: BoxscoreBatter | null
  batterName: string
}

export function PlayerHeader({ batter, batterName }: Props) {
  const name = batter?.name || batterName

  const stats: { label: string; value: string | number }[] = batter
    ? [
        { label: 'AB', value: batter.ab },
        { label: 'H', value: batter.h },
        { label: 'HR', value: batter.hr },
        { label: 'RBI', value: batter.rbi },
        { label: 'BB', value: batter.bb },
        { label: 'K', value: batter.k },
      ]
    : []

  return (
    <div style={{
      background: COLORS.NAVY,
      color: COLORS.CREAM,
      padding: '16px 24px',
      borderRadius: 8,
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 32,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.GOLD }}>{name}</span>
      {stats.map(s => (
        <div key={s.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: COLORS.GRAY_MID, letterSpacing: 1 }}>{s.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}
