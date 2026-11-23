import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const stored = (): Theme | null => {
  try {
    const t = localStorage.getItem('ikp:theme')
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

const system = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

/** Follows the system setting until the reader picks a side. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? system())
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (!stored()) setTheme(system())
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem('ikp:theme', next)
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.theme = next
    setTheme(next)
  }
  return [theme, toggle]
}
