import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async function, tracking { data, loading, error } and aborting any
 * in-flight request when a newer one starts or the component unmounts.
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null })
  const controllerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      controllerRef.current?.abort()
    }
  }, [])

  const run = useCallback(
    async (...args) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const data = await fn(controller.signal, ...args)
        if (mountedRef.current && !controller.signal.aborted) {
          setState({ data, loading: false, error: null })
        }
        return data
      } catch (error) {
        if (error.name === 'AbortError') return null
        if (mountedRef.current) setState({ data: null, loading: false, error })
        return null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )

  useEffect(() => {
    if (immediate) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, run, setState }
}
