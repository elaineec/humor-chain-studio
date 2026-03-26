'use client'

import { useEffect, useState } from 'react'

type ThemeMode = 'system' | 'light' | 'dark'

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = window.localStorage.getItem('theme-mode')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
    return 'system'
  })

  const applyMode = (nextMode: ThemeMode) => {
    const html = document.documentElement
    if (nextMode === 'system') {
      html.removeAttribute('data-theme')
    } else {
      html.setAttribute('data-theme', nextMode)
    }
    window.localStorage.setItem('theme-mode', nextMode)
  }

  useEffect(() => {
    applyMode(mode)
  }, [mode])

  function onChange(nextMode: ThemeMode) {
    setMode(nextMode)
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme mode">
      <button
        className={`theme-pill ${mode === 'system' ? 'active' : ''}`}
        onClick={() => onChange('system')}
        aria-pressed={mode === 'system'}
      >
        System
      </button>
      <button
        className={`theme-pill ${mode === 'light' ? 'active' : ''}`}
        onClick={() => onChange('light')}
        aria-pressed={mode === 'light'}
      >
        Light
      </button>
      <button
        className={`theme-pill ${mode === 'dark' ? 'active' : ''}`}
        onClick={() => onChange('dark')}
        aria-pressed={mode === 'dark'}
      >
        Dark
      </button>
    </div>
  )
}
