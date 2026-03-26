'use client'

import { useEffect, useState } from 'react'
import AdminFrame from '../components/AdminFrame'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

type CaptionRow = Record<string, unknown>

export default function CaptionsPage() {
  const [rows, setRows] = useState<CaptionRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setError('Missing Supabase environment variables.')
        setLoading(false)
        return
      }
      const { data, error: loadError } = await supabase.from('captions').select('*').limit(2000)
      if (loadError) {
        setError(loadError.message)
      } else {
        setRows((data ?? []) as CaptionRow[])
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = rows.filter((row) => {
    const content = typeof row.content === 'string' ? row.content : ''
    const profileId = typeof row.profile_id === 'string' ? row.profile_id : ''
    const imageId = typeof row.image_id === 'string' ? row.image_id : ''
    const blob = `${content} ${profileId} ${imageId}`.toLowerCase()
    return blob.includes(query.toLowerCase())
  })

  const publicCount = rows.filter((row) => row.is_public === true).length
  const withFlavor = rows.filter((row) => row.humor_flavor_id !== null && row.humor_flavor_id !== undefined).length

  return (
    <AdminFrame
      section="captions"
      title="Captions"
      subtitle="Read-only table of caption rows with linked profile/image references."
    >
      <section className="insight-grid">
        <article className="insight-card">
          <p className="eyebrow">Captions</p>
          <strong>{rows.length.toLocaleString()}</strong>
          <small>Total caption rows</small>
        </article>
        <article className="insight-card">
          <p className="eyebrow">Visibility</p>
          <strong>{publicCount.toLocaleString()}</strong>
          <small>Public captions</small>
        </article>
        <article className="insight-card">
          <p className="eyebrow">Pipeline</p>
          <strong>{withFlavor.toLocaleString()}</strong>
          <small>Assigned to flavor</small>
        </article>
      </section>

      <input
        className="input search-input"
        placeholder="Search caption text, profile_id, or image_id"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="result-meta">
        Showing {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} captions
      </p>
      {error && <p className="notice error">{error}</p>}
      {loading ? (
        <p className="sub">Loading captions…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Caption</th>
                <th>Visibility</th>
                <th>Flavor</th>
                <th>References</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const id = typeof row.id === 'string' ? row.id : `caption-${index}`
                return (
                  <tr key={id}>
                    <td>{typeof row.content === 'string' ? row.content : '—'}</td>
                    <td>{row.is_public === true ? <span className="tag">Public</span> : <span className="tag muted">Private</span>}</td>
                    <td className="mono">{typeof row.humor_flavor_id === 'number' ? row.humor_flavor_id : '—'}</td>
                    <td>
                      <div className="mono">P: {typeof row.profile_id === 'string' ? row.profile_id.slice(0, 8) : '—'}</div>
                      <div className="mono">I: {typeof row.image_id === 'string' ? row.image_id.slice(0, 8) : '—'}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <h3>No captions found</h3>
              <p>Try searching by caption text, profile reference, or image reference.</p>
            </div>
          )}
        </div>
      )}
    </AdminFrame>
  )
}
