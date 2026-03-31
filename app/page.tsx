'use client'

import { useEffect, useState } from 'react'
import AdminFrame from './components/AdminFrame'
import { createSupabaseBrowserClient } from './lib/supabase/client'

type MetricState = {
  profiles: number
  images: number
  humorFlavors: number
  humorFlavorSteps: number
  captions: number
  llmModels: number
}

type ResourcePulse = {
  label: string
  value: number
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricState>({
    profiles: 0,
    images: 0,
    humorFlavors: 0,
    humorFlavorSteps: 0,
    captions: 0,
    llmModels: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function loadDashboard() {
      if (!supabase) {
        setError('Missing Supabase environment variables.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const [profilesCount, imagesCount, flavorCount, stepCount, captionsCount, modelCount] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('images').select('id', { count: 'exact', head: true }),
        supabase.from('humor_flavors').select('id', { count: 'exact', head: true }),
        supabase.from('humor_flavor_steps').select('id', { count: 'exact', head: true }),
        supabase.from('captions').select('id', { count: 'exact', head: true }),
        supabase.from('llm_models').select('id', { count: 'exact', head: true }),
      ])

      const firstError =
        profilesCount.error ||
        imagesCount.error ||
        flavorCount.error ||
        stepCount.error ||
        captionsCount.error ||
        modelCount.error

      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      setMetrics({
        profiles: profilesCount.count ?? 0,
        images: imagesCount.count ?? 0,
        humorFlavors: flavorCount.count ?? 0,
        humorFlavorSteps: stepCount.count ?? 0,
        captions: captionsCount.count ?? 0,
        llmModels: modelCount.count ?? 0,
      })

      setLoading(false)
    }

    void loadDashboard()
  }, [supabase])

  const resourcePulse: ResourcePulse[] = [
    { label: 'Profiles', value: metrics.profiles },
    { label: 'Images', value: metrics.images },
    { label: 'Humor Flavors', value: metrics.humorFlavors },
    { label: 'Flavor Steps', value: metrics.humorFlavorSteps },
    { label: 'Captions', value: metrics.captions },
    { label: 'LLM Models', value: metrics.llmModels },
  ]
  const maxPulse = Math.max(...resourcePulse.map((item) => item.value), 1)

  return (
    <AdminFrame
      section="dashboard"
      title="Domain Model Admin"
      subtitle="Manage the staging data model, then use the same workspace to create and test your humor flavor."
    >
      {error && <p className="notice error">{error}</p>}
      {loading ? (
        <p className="sub">Loading dashboard…</p>
      ) : (
        <>
          <section className="hero-panel">
            <p className="eyebrow">Admin Overview</p>
            <h2>Full domain-model coverage with a built-in humor flavor testing workspace.</h2>
            <p className="sub">
              Use Resource Directory for the assignment tables, then move into Test Lab to create and validate your own humor flavor.
            </p>
          </section>

          <section className="stat-grid">
            <article className="stat-card">
              <p className="eyebrow">Profiles</p>
              <strong>{metrics.profiles.toLocaleString()}</strong>
              <small>Users available in `profiles`</small>
            </article>
            <article className="stat-card">
              <p className="eyebrow">Images</p>
              <strong>{metrics.images.toLocaleString()}</strong>
              <small>Image rows and upload targets</small>
            </article>
            <article className="stat-card">
              <p className="eyebrow">Humor System</p>
              <strong>{metrics.humorFlavors.toLocaleString()}</strong>
              <small>Humor flavors currently loaded</small>
            </article>
            <article className="stat-card">
              <p className="eyebrow">Captions</p>
              <strong>{metrics.captions.toLocaleString()}</strong>
              <small>Caption outputs available to review</small>
            </article>
          </section>

          <section className="chart-grid">
            <article className="panel">
              <h2>Resource pulse</h2>
              <div className="bar-list">
                {resourcePulse.map((item) => {
                  const width = Math.round((item.value / maxPulse) * 100)
                  return (
                    <div className="bar-row" key={item.label}>
                      <div className="bar-label">
                        <span>{item.label}</span>
                        <strong>{item.value.toLocaleString()}</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="panel">
              <h2>Assignment coverage</h2>
              <ul className="data-list">
                <li><span>Profiles, images, captions, and caption requests are available.</span></li>
                <li><span>Humor flavors, steps, and humor mix can be reviewed and managed.</span></li>
                <li><span>Terms, examples, models, providers, and access tables support CRUD.</span></li>
                <li><span>Prompt chains and LLM responses remain readable for inspection.</span></li>
              </ul>
            </article>
          </section>

          <section className="panel-grid">
            <article className="panel">
              <h2>Recommended sequence</h2>
              <ul className="data-list">
                <li><span>Open Resource Directory and verify the required table exists.</span></li>
                <li><span>Use Humor Flavors and Humor Flavor Steps to create or tune your flavor.</span></li>
                <li><span>Use Test Lab to generate captions with the REST API and inspect outputs.</span></li>
              </ul>
            </article>

            <article className="panel">
              <h2>Admin note</h2>
              <ul className="data-list">
                <li><span>This app is gated to `profiles.is_superadmin` or `profiles.is_matrix_admin` users only.</span></li>
                <li><span>Use the caption resource view with a `flavor` query parameter from Test Lab to review outputs for a specific humor flavor.</span></li>
                <li><span>The same workspace now covers both the domain model assignment and your flavor testing requirement.</span></li>
              </ul>
            </article>
          </section>
        </>
      )}
    </AdminFrame>
  )
}
