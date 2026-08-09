import { Capacitor } from '@capacitor/core'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function PhoneShell({ children }: Props) {
  const native = Capacitor.isNativePlatform()

  return (
    <div className={`stage${native ? ' native' : ''}`}>
      <div className="phone">{children}</div>
    </div>
  )
}
