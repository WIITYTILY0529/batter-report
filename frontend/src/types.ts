export interface Pitch {
  batter_name: string
  pitcher_name: string
  pitch_name: string
  stand: string
  plate_x: number | null
  plate_z: number | null
  start_speed: number | null
  spin_rate: number | null
  description: string | null
  call: string | null
  events: string | null
  launch_speed: number | null
  launch_angle: number | null
  batSpeed: number | null
  hc_x: number | null
  hc_y: number | null
  hit_distance: number | null
  xba: number | null
  ab_number: number
  pitch_number: number
  inning: number
  inning_topbot: string
}

export interface AtBat {
  ab_number: number
  pitches: Pitch[]
  inning: number
  inning_topbot: string
  pitcher_name: string
  result: string
  launch_speed: number | null
  launch_angle: number | null
  hc_x: number | null
  hc_y: number | null
  hit_distance: number | null
  xba: number | null
}

export interface BoxscoreBatter {
  name: string
  ab: number
  h: number
  hr: number
  rbi: number
  bb: number
  k: number
}
