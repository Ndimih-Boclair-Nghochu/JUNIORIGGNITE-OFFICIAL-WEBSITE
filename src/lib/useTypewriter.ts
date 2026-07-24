import { useEffect, useState } from 'react'

/**
 * Types `text` out one character at a time. `done` flips true when finished so
 * the caller can, e.g., stop the caret or reveal follow-on content.
 */
export function useTypewriter(text: string, opts: { speed?: number; startDelay?: number } = {}): {
  shown: string
  done: boolean
} {
  const { speed = 120, startDelay = 350 } = opts
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setShown('')
    setDone(false)
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const start = setTimeout(function tick() {
      i += 1
      setShown(text.slice(0, i))
      if (i < text.length) {
        // A touch of natural variance reads smoother than a metronome.
        timer = setTimeout(tick, speed + (Math.random() * 60 - 30))
      } else {
        setDone(true)
      }
    }, startDelay)

    return () => {
      clearTimeout(start)
      clearTimeout(timer)
    }
  }, [text, speed, startDelay])

  return { shown, done }
}
