import type { AtBat } from '../types'
import { COLORS } from '../constants'

interface Props {
  atBat: AtBat
}

function formatInning(inning: number, topbot: string) {
  return `${inning}회 ${topbot === 'Top' ? '초' : '말'}`
}

function calcSprayAngle(hc_x: number | null, hc_y: number | null): string {
  if (hc_x == null || hc_y == null) return '-'
  const angle = Math.atan((hc_x - 125.42) / (198.27 - hc_y)) * 180 / Math.PI * 0.75
  return `${Math.round(angle * 10) / 10}°`
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
          <th style={th}>Spray Angle</th>
          <th style={th}>비거리</th>
          <th style={th}>xBA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={td}>{formatInning(atBat.inning, atBat.inning_topbot)}</td>
          <td style={td}>{atBat.pitcher_name}</td>
          <td style={td}>{atBat.result || '-'}</td>
          <td style={td}>{atBat.launch_speed != null ? `${atBat.launch_speed} mph` : '-'}</td>
          <td style={td}>{atBat.launch_angle != null ? `${atBat.launch_angle}°` : '-'}</td>
          <td style={td}>{calcSprayAngle(atBat.hc_x, atBat.hc_y)}</td>
          <td style={td}>{atBat.hit_distance != null ? `${atBat.hit_distance} ft` : '-'}</td>
          <td style={td}>{atBat.xba != null ? atBat.xba : '-'}</td>
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
