import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'

interface State<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Load-on-mount data fetching with loading + error states and a manual reload. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null })
  const alive = useRef(true)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const run = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await loaderRef.current()
      if (alive.current) setState({ data, loading: false, error: null })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Something went wrong. Try again.'
      if (alive.current) setState((prev) => ({ ...prev, loading: false, error: message }))
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void run()
    return () => {
      alive.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload: run, setData: (data: T) => setState({ data, loading: false, error: null }) }
}
