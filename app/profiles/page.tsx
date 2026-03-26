'use client'

import { useEffect, useState } from 'react'
import AdminFrame from '../components/AdminFrame'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

type ProfileRow = Record<string, unknown>

export default function ProfilesPage() {
  const [rows, setRows] = useState<ProfileRow[]>([])
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
      const { data, error: loadError } = await supabase.from('profiles').select('*').limit(5000)
      if (loadError) {
        setError(loadError.message)
      } else {
        setRows((data ?? []) as ProfileRow[])
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = rows.filter((row) => {
    const email = typeof row.email === 'string' ? row.email : ''
    const id = typeof row.id === 'string' ? row.id : ''
    const name = `${typeof row.first_name === 'string' ? row.first_name : ''} ${
      typeof row.last_name === 'string' ? row.last_name : ''
    }`.trim()
    const blob = `${email} ${id} ${name}`.toLowerCase()
    return blob.includes(query.toLowerCase())
  })

  const superCount = rows.filter((row) => row.is_superadmin === true).length
  const matrixCount = rows.filter((row) => row.is_matrix_admin === true).length
  const studyCount = rows.filter((row) => row.is_in_study === true).length

  return (
    <AdminFrame
      section="profiles"
      title="Profiles"
      subtitle="Read-only list of user profiles for moderation and access checks."
    >
      <section className="insight-grid">
        <article className="insight-card">
          <p className="eyebrow">Profiles</p>
          <strong>{rows.length.toLocaleString()}</strong>
          <small>Total accounts loaded</small>
        </article>
        <article className="insight-card">
          <p className="eyebrow">Privilege</p>
          <strong>{superCount.toLocaleString()}</strong>
          <small>Superadmins</small>
        </article>
        <article className="insight-card">
          <p className="eyebrow">Privilege</p>
          <strong>{matrixCount.toLocaleString()}</strong>
          <small>Matrix admins</small>
        </article>
        <article className="insight-card">
          <p className="eyebrow">Study</p>
          <strong>{studyCount.toLocaleString()}</strong>
          <small>Profiles in study</small>
        </article>
      </section>

      <input
        className="input search-input"
        placeholder="Search by email, id, or name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="result-meta">
        Showing {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} profiles
      </p>
      {error && <p className="notice error">{error}</p>}
      {loading ? (
        <p className="sub">Loading profiles…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Access</th>
                <th>Study</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = typeof row.id === 'string' ? row.id : 'unknown'
                const email = typeof row.email === 'string' ? row.email : '—'
                const name = `${typeof row.first_name === 'string' ? row.first_name : ''} ${
                  typeof row.last_name === 'string' ? row.last_name : ''
                }`.trim()
                const isSuper = row.is_superadmin === true
                const isMatrix = row.is_matrix_admin === true
                const isStudy = row.is_in_study === true
                const userLabel = name || (email !== '—' ? email.split('@')[0] : 'Unnamed')
                return (
                  <tr key={id}>
                    <td>{userLabel}</td>
                    <td>{email}</td>
                    <td>
                      <div className="row-actions">
                        {isSuper && <span className="tag">Superadmin</span>}
                        {isMatrix && <span className="tag">Matrix Admin</span>}
                        {!isSuper && !isMatrix && <span className="tag muted">User</span>}
                      </div>
                    </td>
                    <td>{isStudy ? <span className="tag">In study</span> : <span className="tag muted">No</span>}</td>
                    <td className="mono">{id}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <h3>No profiles found</h3>
              <p>Try searching by a different email, name, or ID fragment.</p>
            </div>
          )}
        </div>
      )}
    </AdminFrame>
  )
}
