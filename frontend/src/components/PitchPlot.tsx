import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'
import { AtBat } from '../types'
import { PITCH_COLORS, DEFAULT_PITCH_COLOR, STRIKE_ZONE, COLORS } from '../constants'

interface Props {
  atBat: AtBat
  plotId: string
}

function getPitchColor(pitchName: string): string {
  return PITCH_COLORS[pitchName] ?? DEFAULT_PITCH_COLOR
}

function describeCall(call: string, description: string, events: string): string {
  if (events) return events
  const map: Record<string, string> = {
    'S': '스트라이크',
    'C': '콜드 스트라이크',
    'F': '파울',
    'W': '헛스윙',
    'B': '볼',
    'X': '인플레이',
    'T': '파울팁',
    'M': '헛스윙',
  }
  return map[call] || description || call
}

export function PitchPlot({ atBat, plotId }: Props) {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!divRef.current) return

    const pitches = atBat.pitches

    // Group by pitch type for legend
    const traceMap = new Map<string, {
      x: number[], z: number[], text: string[], pitch_number: number[],
      isFilled: boolean[], isInPlay: boolean[]
    }>()

    for (const p of pitches) {
      const key = p.pitch_name || 'Unknown'
      if (!traceMap.has(key)) {
        traceMap.set(key, { x: [], z: [], text: [], pitch_number: [], isFilled: [], isInPlay: [] })
      }
      const t = traceMap.get(key)!
      t.x.push(p.plate_x)
      t.z.push(p.plate_z)
      t.pitch_number.push(p.pitch_number)
      const isStrike = p.call === 'S' || p.call === 'C' || p.call === 'W' || p.call === 'T' || p.call === 'X'
      const isInPlay = p.call === 'X' && !!p.events
      t.isFilled.push(isStrike)
      t.isInPlay.push(isInPlay)

      const hover = [
        describeCall(p.call, p.description, p.events),
        p.pitch_name,
        p.start_speed ? `${p.start_speed} mph` : null,
        p.bat_speed != null ? `배트 ${p.bat_speed} mph` : null,
        p.launch_speed != null ? `타구 ${p.launch_speed} mph` : null,
        p.launch_angle != null ? `각도 ${p.launch_angle}°` : null,
      ].filter(Boolean).join('<br>')
      t.text.push(hover)
    }

    const traces: Plotly.Data[] = []

    // Strike zone rectangle
    traces.push({
      type: 'scatter',
      x: [STRIKE_ZONE.left, STRIKE_ZONE.right, STRIKE_ZONE.right, STRIKE_ZONE.left, STRIKE_ZONE.left],
      y: [STRIKE_ZONE.bottom, STRIKE_ZONE.bottom, STRIKE_ZONE.top, STRIKE_ZONE.top, STRIKE_ZONE.bottom],
      mode: 'lines' as const,
      line: { color: '#888', width: 2 },
      hoverinfo: 'skip',
      showlegend: false,
      name: '',
    } as Plotly.Data)

    // Home plate
    const pw = 0.83
    traces.push({
      type: 'scatter',
      x: [-pw, pw, pw, 0, -pw, -pw],
      y: [0.3, 0.3, 0.1, 0, 0.1, 0.3],
      mode: 'lines' as const,
      fill: 'toself',
      fillcolor: 'rgba(200,200,200,0.3)',
      line: { color: '#aaa', width: 1.5 },
      hoverinfo: 'skip',
      showlegend: false,
      name: '',
    } as Plotly.Data)

    // Pitch traces — one per pitch (to support per-point styling)
    for (const p of pitches) {
      const color = getPitchColor(p.pitch_name)
      const isStrike = ['S', 'C', 'W', 'T', 'X'].includes(p.call)
      const isInPlay = p.call === 'X' && !!p.events

      const markerColor = isInPlay ? '#1D6FE8' : isStrike ? color : 'rgba(0,0,0,0)'
      const markerLine = isInPlay
        ? { color: '#1D6FE8', width: 2 }
        : { color: color, width: 2 }

      const hover = [
        describeCall(p.call, p.description, p.events),
        p.pitch_name,
        p.start_speed ? `${p.start_speed} mph` : null,
        p.bat_speed != null ? `배트 ${p.bat_speed} mph` : null,
        p.launch_speed != null ? `타구 ${p.launch_speed} mph` : null,
        p.launch_angle != null ? `각도 ${p.launch_angle}°` : null,
      ].filter(Boolean).join('<br>')

      traces.push({
        type: 'scatter',
        x: [p.plate_x],
        y: [p.plate_z],
        mode: 'markers+text' as const,
        text: [`${p.pitch_number}`],
        textposition: 'middle center',
        textfont: { size: 10, color: isStrike ? '#fff' : color },
        marker: {
          size: 28,
          color: markerColor,
          line: markerLine,
          opacity: 0.9,
        },
        hovertemplate: `${hover}<extra></extra>`,
        name: p.pitch_name,
        legendgroup: p.pitch_name,
        showlegend: false,
        customdata: [p.pitch_number],
      } as Plotly.Data)
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
        mode: 'markers' as const,
        marker: { size: 12, color, line: { color, width: 2 } },
        name: p.pitch_name,
        legendgroup: p.pitch_name,
        showlegend: true,
      } as Plotly.Data)
    }

    const layout: Partial<Plotly.Layout> = {
      width: 320,
      height: 340,
      margin: { t: 10, b: 30, l: 30, r: 10 },
      xaxis: {
        range: [-2.5, 2.5],
        zeroline: false,
        showgrid: false,
        tickfont: { size: 10, color: COLORS.GRAY_MID },
        title: { text: 'plate_x', font: { size: 10 } },
      },
      yaxis: {
        range: [-0.2, 5],
        zeroline: false,
        showgrid: false,
        tickfont: { size: 10, color: COLORS.GRAY_MID },
        title: { text: 'plate_z', font: { size: 10 } },
        scaleanchor: 'x',
        scaleratio: 1,
      },
      paper_bgcolor: COLORS.CREAM,
      plot_bgcolor: COLORS.CREAM,
      legend: {
        orientation: 'h',
        x: 0,
        y: -0.12,
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
      height: 340,
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
