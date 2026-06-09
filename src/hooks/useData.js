import { useState, useEffect, useCallback, useRef } from 'react'

const POLL_INTERVAL = 30_000

async function fetchAll(bust = false) {
  const q = bust ? '?bust=1' : ''
  const [stats, skills, workflows, connections, memory, sessions, plugins, hooks, settings] = await Promise.all([
    fetch(`/api/stats${q}`).then(r => { if (!r.ok) throw new Error(`stats ${r.status}`); return r.json() }),
    fetch(`/api/skills${q}`).then(r => { if (!r.ok) throw new Error(`skills ${r.status}`); return r.json() }),
    fetch(`/api/workflows${q}`).then(r => { if (!r.ok) throw new Error(`workflows ${r.status}`); return r.json() }),
    fetch(`/api/connections${q}`).then(r => { if (!r.ok) throw new Error(`connections ${r.status}`); return r.json() }),
    fetch(`/api/memory${q}`).then(r => { if (!r.ok) throw new Error(`memory ${r.status}`); return r.json() }),
    fetch(`/api/sessions${q}`).then(r => r.ok ? r.json() : []),
    fetch(`/api/plugins${q}`).then(r => r.ok ? r.json() : []),
    fetch(`/api/hooks${q}`).then(r => r.ok ? r.json() : { scripts: [], bindings: [] }),
    fetch(`/api/settings${q}`).then(r => r.ok ? r.json() : {}),
  ])
  return { stats, skills, workflows, connections, memory, sessions, plugins, hooks, settings }
}

async function fetchWithRetry(bust = false) {
  try {
    return await fetchAll(bust)
  } catch {
    await new Promise(r => setTimeout(r, 3000))
    return fetchAll(bust)
  }
}

function buildData({ stats, skills, workflows, connections, memory, sessions, plugins, hooks, settings }) {
  return {
    agents: stats.agents || [],
    skills: skills || [],
    workflows: workflows || [],
    tasks: stats.tasks || [],
    connections: connections || [],
    schedules: stats.schedules || [],
    days: stats.days || [],
    usageSeries: stats.usageSeries || [],
    models: stats.models || [],
    memory: memory || { entries: [], count: 0 },
    sessions: sessions || [],
    plugins: plugins || [],
    hooks: hooks || { scripts: [], bindings: [] },
    settings: settings || {},
    todayTokens: stats.todayTokens || 0,
    todaySessions: stats.todaySessions || 0,
    totalCost: stats.totalCost || 0,
  }
}

export function useData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const cancelledRef = useRef(false)

  const load = useCallback(async (bust = false) => {
    try {
      if (bust) setRefreshing(true)
      const raw = await fetchWithRetry(bust)
      if (!cancelledRef.current) {
        setData(buildData(raw))
        setLoading(false)
        setError(null)
        setLastUpdated(Date.now())
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e.message)
        setLoading(false)
      }
    } finally {
      if (!cancelledRef.current) setRefreshing(false)
    }
  }, [])

  const refresh = useCallback(() => load(true), [load])

  useEffect(() => {
    cancelledRef.current = false
    load(false)
    const id = setInterval(() => load(false), POLL_INTERVAL)
    return () => {
      cancelledRef.current = true
      clearInterval(id)
    }
  }, [load])

  return { data, loading, error, lastUpdated, refreshing, refresh }
}
