import { useState, useEffect } from 'react'

const POLL_INTERVAL = 30_000

const spark = (seed, n = 16) => {
  const out = []; let v = 50
  for (let i = 0; i < n; i++) { v += ((seed * (i + 3)) % 13) - 6; v = Math.max(8, Math.min(92, v)); out.push(v) }
  return out
}

async function fetchAll() {
  const [stats, skills, workflows, connections, memory] = await Promise.all([
    fetch('/api/stats').then(r => { if (!r.ok) throw new Error(`stats ${r.status}`); return r.json() }),
    fetch('/api/skills').then(r => { if (!r.ok) throw new Error(`skills ${r.status}`); return r.json() }),
    fetch('/api/workflows').then(r => { if (!r.ok) throw new Error(`workflows ${r.status}`); return r.json() }),
    fetch('/api/connections').then(r => { if (!r.ok) throw new Error(`connections ${r.status}`); return r.json() }),
    fetch('/api/memory').then(r => { if (!r.ok) throw new Error(`memory ${r.status}`); return r.json() }),
  ])
  return { stats, skills, workflows, connections, memory }
}

async function fetchWithRetry() {
  try {
    return await fetchAll()
  } catch {
    await new Promise(r => setTimeout(r, 3000))
    return fetchAll()
  }
}

function buildData({ stats, skills, workflows, connections, memory }) {
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
    spark,
    todayTokens: stats.todayTokens || 0,
    todaySessions: stats.todaySessions || 0,
    totalCost: stats.totalCost || 0,
  }
}

export function useData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const raw = await fetchWithRetry()
        if (!cancelled) {
          setData(buildData(raw))
          setLoading(false)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          // Stale-while-revalidate: keep existing data, just surface the error
          setError(e.message)
          setLoading(false)
        }
      }
    }

    load()
    const id = setInterval(load, POLL_INTERVAL)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return { data, loading, error }
}
