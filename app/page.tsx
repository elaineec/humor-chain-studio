'use client'

import { useEffect, useState } from 'react'
import AdminFrame from './components/AdminFrame'
import { createSupabaseBrowserClient } from './lib/supabase/client'

type OverviewStats = {
  flavors: number
  steps: number
  testImages: number
  generatedCaptions: number
}

type FlavorSummary = {
  id: string
  name: string
  stepCount: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats>({
    flavors: 0,
    steps: 0,
    testImages: 0,
    generatedCaptions: 0,
  })
  const [flavorSummaries, setFlavorSummaries] = useState<FlavorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function loadOverview() {
      if (!supabase) {
        setError('Missing Supabase environment variables.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const [flavorCount, stepCount, imageCount, captionCount, flavorsRes, stepsRes] = await Promise.all([
        supabase.from('humor_flavors').select('id', { count: 'exact', head: true }),
        supabase.from('humor_flavor_steps').select('id', { count: 'exact', head: true }),
        supabase.from('images').select('id', { count: 'exact', head: true }),
        supabase.from('captions').select('id', { count: 'exact', head: true }),
        supabase.from('humor_flavors').select('id, slug, description').limit(12),
        supabase.from('humor_flavor_steps').select('id, humor_flavor_id').limit(1000),
      ])

      const firstError =
        flavorCount.error ||
        stepCount.error ||
        imageCount.error ||
        captionCount.error ||
        flavorsRes.error ||
        stepsRes.error

      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      setStats({
        flavors: flavorCount.count ?? 0,
        steps: stepCount.count ?? 0,
        testImages: imageCount.count ?? 0,
        generatedCaptions: captionCount.count ?? 0,
      })

      const countsByFlavor = new Map<string, number>()
      for (const row of (stepsRes.data ?? []) as Array<Record<string, unknown>>) {
        const flavorId = row.humor_flavor_id
        if (typeof flavorId !== 'string' && typeof flavorId !== 'number') continue
        const key = String(flavorId)
        countsByFlavor.set(key, (countsByFlavor.get(key) ?? 0) + 1)
      }

      const flavors = ((flavorsRes.data ?? []) as Array<Record<string, unknown>>)
        .map((row) => {
          const id = typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id) : null
          if (!id) return null
          const slug = typeof row.slug === 'string' ? row.slug : `Flavor ${id}`
          return {
            id,
            name: slug,
            stepCount: countsByFlavor.get(id) ?? 0,
          }
        })
        .filter((item): item is FlavorSummary => Boolean(item))
        .sort((a, b) => b.stepCount - a.stepCount)
        .slice(0, 5)

      setFlavorSummaries(flavors)
      setLoading(false)
    }

    void loadOverview()
  }, [supabase])

  return (
    <AdminFrame
      section="dashboard"
      title="Humor Chain Studio"
      subtitle="Build humor flavors, manage ordered steps, and validate prompt chains against your image test set."
    >
      {error && <p className="notice error">{error}</p>}
      {loading ? (
        <p className="sub">Loading workspace…</p>
      ) : (
        <>
          <section className="hero-panel">
            <p className="eyebrow">Prompt Chain Workspace</p>
            <h2>Flavor definitions, ordered step chains, and caption testing in one place.</h2>
            <p className="sub">
              Use Flavor Manager for CRUD and reordering, then move into Test Lab to run your current chain against the API.
            </p>
          </section>

          <section className="stat-grid">
            <article className="stat-card">
              <p className="eyebrow">Humor Flavors</p>
              <strong>{stats.flavors.toLocaleString()}</strong>
              <small>Total flavor definitions available</small>
            </article>
            <article className="stat-card">
              <p className="eyebrow">Flavor Steps</p>
              <strong>{stats.steps.toLocaleString()}</strong>
              <small>Ordered prompt-chain steps</small>
            </article>
            <article className="stat-card">
              <p className="eyebrow">Test Images</p>
              <strong>{stats.testImages.toLocaleString()}</strong>
              <small>Images available for API testing</small>
            </article>
            <article className="stat-card">
              <p className="eyebrow">Generated Captions</p>
              <strong>{stats.generatedCaptions.toLocaleString()}</strong>
              <small>Caption outputs stored in the dataset</small>
            </article>
          </section>

          <section className="chart-grid">
            <article className="panel">
              <h2>Recommended workflow</h2>
              <div className="bar-list workflow-list">
                <div className="bar-row workflow-row">
                  <div className="bar-label workflow-label">
                    <span>1. Create or update a flavor</span>
                    <strong>Flavor Manager</strong>
                  </div>
                  <p className="sub">Use Humor Flavors to define the style name and summary for the chain.</p>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="bar-row workflow-row">
                  <div className="bar-label workflow-label">
                    <span>2. Build the ordered step chain</span>
                    <strong>Step Editor</strong>
                  </div>
                  <p className="sub">Use Humor Flavor Steps to add prompts, set order, and tune the chain logic.</p>
                  <div className="bar-track">
                    <div className="bar-fill muted" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="bar-row workflow-row">
                  <div className="bar-label workflow-label">
                    <span>3. Run a live caption test</span>
                    <strong>Test Lab</strong>
                  </div>
                  <p className="sub">Pick a test image, call the API, and review the caption output before shipping changes.</p>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </article>

            <article className="panel">
              <h2>What this tool covers</h2>
              <ul className="data-list">
                <li><span>Create, update, delete, and inspect humor flavors.</span></li>
                <li><span>Create, update, delete, and reorder humor flavor steps.</span></li>
                <li><span>Read captions produced by a selected humor flavor.</span></li>
                <li><span>Run test requests through <code>api.almostcrackd.ai</code>.</span></li>
              </ul>
            </article>
          </section>

          <section className="panel-grid">
            <article className="panel">
              <h2>Most built-out flavors</h2>
              <p className="sub">Flavors with the strongest step coverage are the fastest to test and refine.</p>
              {flavorSummaries.length ? (
                <ul className="data-list uploader-list">
                  {flavorSummaries.map((flavor) => (
                    <li key={flavor.id}>
                      <div className="uploader-head">
                        <span>{flavor.name}</span>
                        <strong>{flavor.stepCount} steps</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${Math.max(10, flavor.stepCount * 10)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sub">No humor flavors found yet.</p>
              )}
            </article>

            <article className="panel">
              <h2>Before you run a test</h2>
              <ul className="data-list">
                <li><span><strong>Access:</strong> Only superadmin or matrix-admin profiles can use this workspace.</span></li>
                <li><span><strong>Review outputs:</strong> Open Generated Captions with a flavor filter to inspect everything a chain has produced.</span></li>
                <li><span><strong>Use Test Lab for validation:</strong> Run a live API test before promoting any flavor or step change.</span></li>
              </ul>
            </article>
          </section>

          <section className="panel-grid">
            <article className="panel">
              <h2>Submissions</h2>
              <ul className="data-list">
                <li><span>Submit the latest commit-specific Vercel URLs for the caption creation app, admin app, and prompt chain tool.</span></li>
                <li><span>Check that the duplicated flavor flow and prompt test screens work before you submit the prompt tool URL.</span></li>
                <li><span>Use the latest deployed commit URL rather than a generic root domain.</span></li>
              </ul>
            </article>

            <article className="panel">
              <h2>Weekly Reminder</h2>
              <ul className="data-list">
                <li><span>Complete this week&apos;s Humor Study at <a href="https://humorstudy.org" target="_blank" rel="noreferrer">humorstudy.org</a>.</span></li>
                <li><span>After deploying, copy the exact preview URLs into the course Submissions section.</span></li>
              </ul>
            </article>
          </section>
        </>
      )}
    </AdminFrame>
  )
}
