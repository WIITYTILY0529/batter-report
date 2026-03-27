import type { AtBat } from '../types'
import { COLORS } from '../constants'

interface Props {
  atBat: AtBat
}

function formatInning(inning: number, topbot: string) {
  return `${inning}회 ${topbot === 'Top' ? '초' : '말'}`
}

export function AtBatTable({ atBat }: Props) {
  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13,
      color: COLORS.NAVY,
      background: COLORS.CREAM,
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <thead>
        <tr style={{ background: COLORS.NAVY, color: COLORS.CREAM }}>
          <th style={th}>이닝</th>
          <th style={th}>상대 투수</th>
          <th style={th}>타석 결과</th>
          <th style={th}>타구 속도</th>
          <th style={th}>타구 각도</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={td}>{formatInning(atBat.inning, atBat.inning_topbot)}</td>
          <td style={td}>{atBat.pitcher_name}</td>
          <td style={td}>{atBat.result || '-'}</td>
          <td style={td}>{atBat.launch_speed != null ? `${atBat.launch_speed} mph` : '-'}</td>
          <td style={td}>{atBat.launch_angle != null ? `${atBat.launch_angle}°` : '-'}</td>
        </tr>
      </tbody>
    </table>
  )
}

const th: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: 0.5,
}

const td: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: `1px solid ${COLORS.GRAY_MID}`,
}
