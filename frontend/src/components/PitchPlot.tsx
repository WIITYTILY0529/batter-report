import { useEffect, useRef } from 'react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import Plotly from 'plotly.js-dist-min'
import type { AtBat } from '../types'
import { PITCH_COLORS, DEFAULT_PITCH_COLOR, STRIKE_ZONE, COLORS } from '../constants'

interface Props {
  atBat: AtBat
  plotId: string
}

function getPitchColor(pitchName: string): string {
  return PITCH_COLORS[pitchName] ?? DEFAULT_PITCH_COLOR
}

// 스트라이크존 3x3 격자 shapes
function makeZoneShapes() {
  const { left, right, top, bottom } = STRIKE_ZONE
  const w = right - left
  const h = top - bottom
  const GRAY = '#aaaaaa'
  return [
    // 외곽
    { type: 'rect', x0: left, y0: bottom, x1: right, y1: top, line: { color: '#555', width: 2 } },
    // 세로 격자 2개
    { type: 'line', x0: left + w/3, y0: bottom, x1: left + w/3, y1: top, line: { color: GRAY, width: 1, dash: 'dot' } },
    { type: 'line', x0: left + w*2/3, y0: bottom, x1: left + w*2/3, y1: top, line: { color: GRAY, width: 1, dash: 'dot' } },
    // 가로 격자 2개
    { type: 'line', x0: left, y0: bottom + h/3, x1: right, y1: bottom + h/3, line: { color: GRAY, width: 1, dash: 'dot' } },
    { type: 'line', x0: left, y0: bottom + h*2/3, x1: right, y1: bottom + h*2/3, line: { color: GRAY, width: 1, dash: 'dot' } },
    // 홈플레이트
    { type: 'path', path: 'M -0.71 0.28 L 0.71 0.28 L 0.71 0.1 L 0 -0.1 L -0.71 0.1 Z', fillcolor: 'rgba(200,200,200,0.4)', line: { color: '#999', width: 1.5 } },
  ]
}

export function PitchPlot({ atBat, plotId }: Props) {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!divRef.current) return

    const pitches = atBat.pitches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traces: any[] = []

    // One trace per pitch
    for (const p of pitches) {
      const color = getPitchColor(p.pitch_name)
      const isStrike = ['S', 'C', 'W', 'T', 'X'].includes(p.call ?? '')
      const isInPlay = p.call === 'X' && !!p.events

      const markerColor = isInPlay ? '#1D6FE8' : isStrike ? color : 'rgba(0,0,0,0)'
      const markerLine = isInPlay
        ? { color: '#1D6FE8', width: 2 }
        : { color: color, width: 2 }

      const hoverLines = [
        p.events || p.description || p.call || '',
        p.pitch_name ? `구종: ${p.pitch_name}` : null,
        p.start_speed != null ? `구속: ${p.start_speed} mph` : null,
        p.batSpeed != null ? `배트 속도: ${p.batSpeed} mph` : null,
        p.launch_speed != null ? `타구 속도: ${p.launch_speed} mph` : null,
        p.launch_angle != null ? `타구 각도: ${p.launch_angle}°` : null,
      ].filter(Boolean).join('<br>')

      traces.push({
        type: 'scatter',
        x: [p.plate_x],
        y: [p.plate_z],
        mode: 'markers+text',
        text: [`${p.pitch_number}`],
        textposition: 'middle center',
        textfont: { size: 9, color: isStrike ? '#fff' : color },
        marker: {
          size: 18,
          color: markerColor,
          line: markerLine,
          opacity: 0.92,
        },
        hovertemplate: `${hoverLines}<extra></extra>`,
        name: p.pitch_name,
        legendgroup: p.pitch_name,
        showlegend: false,
      })
    }

    // Legend traces (one per pitch type)
    const seenTypes = new Set<string>()
    for (const p of pitches) {
      if (seenTypes.has(p.pitch_name)) continue
      seenTypes.add(p.pitch_name)
      const color = getPitchColor(p.pitch_name)
      traces.push({
        type: 'scatter',
        x: [null],
        y: [null],
        mode: 'markers',
        marker: { size: 10, color, line: { color, width: 2 } },
        name: p.pitch_name,
        legendgroup: p.pitch_name,
        showlegend: true,
      })
    }

    const layout = {
      width: 320,
      height: 360,
      margin: { t: 10, b: 30, l: 30, r: 10 },
      shapes: makeZoneShapes(),
      xaxis: {
        range: [-2.5, 2.5],
        zeroline: false,
        showgrid: false,
        tickfont: { size: 10, color: COLORS.GRAY_MID },
        fixedrange: true,
      },
      yaxis: {
        range: [-0.5, 5.2],
        zeroline: false,
        showgrid: false,
        tickfont: { size: 10, color: COLORS.GRAY_MID },
        scaleanchor: 'x',
        scaleratio: 1,
        fixedrange: true,
      },
      paper_bgcolor: COLORS.CREAM,
      plot_bgcolor: COLORS.CREAM,
      legend: {
        orientation: 'h',
        x: 0,
        y: -0.1,
        font: { size: 10 },
      },
      showlegend: true,
    }

    Plotly.react(divRef.current, traces, layout, { displayModeBar: false, responsive: false })
  }, [atBat])

  const handleDownload = () => {
    if (!divRef.current) return
    Plotly.downloadImage(divRef.current, {
      format: 'png',
      filename: `ab_${atBat.ab_number}_plot`,
      width: 320,
      height: 360,
    })
  }

  return (
    <div>
      <div ref={divRef} id={plotId} />
      <button
        onClick={handleDownload}
        style={{
          marginTop: 4,
          padding: '4px 12px',
          fontSize: 12,
          background: COLORS.NAVY,
          color: COLORS.CREAM,
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Download PNG
      </button>
    </div>
  )
}
