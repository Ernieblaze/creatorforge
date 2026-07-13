import { createContext, useContext, useEffect, useState } from 'react'

/** Dark-first theme. Persists to localStorage; toggles .dark on <html>. */
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('cf_theme') || 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b0d14' : '#ffffff')
    localStorage.setItem('cf_theme', theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
