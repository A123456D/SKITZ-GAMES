import type { InputSettings } from '../settings'
import { INPUT_RANGES } from '../settings'

type Key = keyof InputSettings

type Props = {
  label: string
  setting: Key
  value: number
  onChange: (value: number) => void
}

export function SensSlider({ label, setting, value, onChange }: Props) {
  const range = INPUT_RANGES[setting]
  return (
    <label className="sens-row">
      <span className="sens-label">
        {label}
        <em>{value.toFixed(1)}×</em>
      </span>
      <input
        className="sens-range"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
