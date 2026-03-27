export interface Pitch {
  batter_name: string
  pitcher_name: string
  pitch_name: string
  stand: string
  plate_x: number
  plate_z: number
  start_speed: number
  spin_rate: number
  description: string
  call: string
  events: string
  launch_speed: number | null
  launch_angle: number | null
  bat_speed: number | null
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
}

export interface BoxscoreBatter {
  name: string
  ab: number
  h: number
  hr: number
  rbi: number
  bb: number
  k: number
  avg?: string
}
