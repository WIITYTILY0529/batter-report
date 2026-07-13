import { useRef } from 'react'
import html2canvas from 'html2canvas'
import type { AtBat } from '../types'
import { PitchPlot } from './PitchPlot'
import { AtBatTable } from './AtBatTable'
import { PitchByPitchTable } from './PitchByPitchTable'
import { COLORS } from '../constants'

interface Props {
  atBat: AtBat
}

function formatInning(inning: number, topbot: string) {
  return `${inning}회 ${topbot === 'Top' ? '초' : '말'}`
}

export function AtBatCard({ atBat }: Props) {
  const tableRef = useRef<HTMLDivElement>(null)
  const plotId = `plot-ab-${atBat.ab_number}`

  const handleTableDownload = async () => {
    if (!tableRef.current) return
    const canvas = await html2canvas(tableRef.current, { backgroundColor: COLORS.CREAM })
    const link = document.createElement('a')
    link.download = `ab_${atBat.ab_number}_table.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div style={{
      background: COLORS.CREAM,
      border: `1px solid ${COLORS.GRAY_MID}`,
      borderRadius: 10,
      padding: 16,
      marginBottom: 24,
    }}>
      <div style={{
        fontWeight: 700,
        fontSize: 14,
        color: COLORS.NAVY,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          background: COLORS.NAVY,
          color: COLORS.GOLD,
          borderRadius: '50%',
          width: 26,
          height: 26,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
        }}>
          {atBat.ab_number}
        </span>
        <span>{formatInning(atBat.inning, atBat.inning_topbot)} · vs {atBat.pitcher_name}{atBat.p_throws ? ` (${atBat.p_throws === 'R' ? 'RHP' : atBat.p_throws === 'L' ? 'LHP' : atBat.p_throws})` : ''}</span>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 min(100%, 340px)', minWidth: 0 }}>
          <PitchPlot atBat={atBat} plotId={plotId} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div ref={tableRef}>
            <AtBatTable atBat={atBat} />
            <PitchByPitchTable atBat={atBat} />
          </div>
          <button
            onClick={handleTableDownload}
            style={{
              marginTop: 6,
              padding: '4px 12px',
              fontSize: 12,
              background: COLORS.GRAY_MID,
              color: COLORS.NAVY,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Download Table PNG
          </button>
        </div>
      </div>
    </div>
  )
}
