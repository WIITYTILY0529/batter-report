import type { AtBat } from '../types'
import { COLORS } from '../constants'

interface Props {
  atBat: AtBat
}

export function PitchByPitchTable({ atBat }: Props) {
  const pitches = [...atBat.pitches].sort((a, b) => a.pitch_number - b.pitch_number)
  const lastPitchNum = pitches[pitches.length - 1]?.pitch_number

  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12,
      color: COLORS.NAVY,
      background: COLORS.CREAM,
      marginTop: 8,
    }}>
      <thead>
        <tr style={{ background: '#e8eaf0', color: COLORS.NAVY }}>
          <th style={th}>#</th>
          <th style={th}>Description</th>
          <th style={th}>Event</th>
          <th style={th}>구종</th>
          <th style={th}>구속</th>
        </tr>
      </thead>
      <tbody>
        {pitches.map(p => (
          <tr key={p.pitch_number} style={{ borderBottom: `1px solid ${COLORS.GRAY_MID}` }}>
            <td style={{ ...td, color: COLORS.GRAY_MID, fontWeight: 600 }}>{p.pitch_number}</td>
            <td style={td}>{p.description || '-'}</td>
            <td style={td}>{p.pitch_number === lastPitchNum && p.events ? p.events : '-'}</td>
            <td style={td}>{p.pitch_name || '-'}</td>
            <td style={td}>{p.start_speed != null ? `${p.start_speed} mph` : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const th: React.CSSProperties = {
  padding: '6px 10px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: 0.3,
}

const td: React.CSSProperties = {
  padding: '5px 10px',
}
