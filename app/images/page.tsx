'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import AdminFrame from '../components/AdminFrame'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

type ImageRow = {
  id: string
  url: string | null
  image_description?: string | null
}

export default function ImagesPage() {
  const [rows, setRows] = useState<ImageRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const supabase = createSupabaseBrowserClient()

  const loadImages = useCallback(async () => {
    if (!supabase) {
      setError('Missing Supabase environment variables.')
      setLoading(false)
      return
    }
    const { data, error: loadError } = await supabase.from('images').select('id,url,image_description').limit(5000)
    if (loadError) {
      setError(loadError.message)
    } else {
      setRows((data ?? []) as ImageRow[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadImages()
  }, [loadImages])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setSaving(true)
    setError(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user?.id) {
      setError('Unable to resolve signed-in profile id for write operation.')
      setSaving(false)
      return
    }

    const payload = {
      url: url.trim() || null,
      image_description: description.trim() || null,
    }

    const request = editId
      ? supabase
          .from('images')
          .update({
            ...payload,
            modified_by_user_id: user.id,
          })
          .eq('id', editId)
      : supabase.from('images').insert({
          ...payload,
          created_by_user_id: user.id,
          modified_by_user_id: user.id,
        })

    const { error: writeError } = await request
    if (writeError) {
      setError(writeError.message)
    } else {
      setEditId(null)
      setUrl('')
      setDescription('')
      await loadImages()
    }
    setSaving(false)
  }

  function startEdit(row: ImageRow) {
    setEditId(row.id)
    setUrl(row.url ?? '')
    setDescription(row.image_description ?? '')
  }

  async function remove(id: string) {
    if (!supabase) return
    setError(null)
    const { error: deleteError } = await supabase.from('images').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await loadImages()
  }

  const filtered = rows.filter((row) => {
    const blob = `${row.url ?? ''} ${row.image_description ?? ''} ${row.id}`.toLowerCase()
    return blob.includes(query.toLowerCase())
  })

  const withDescription = rows.filter((row) => Boolean(row.image_description?.trim())).length
  const missingUrl = rows.filter((row) => !row.url).length

  return (
    <AdminFrame
      section="images"
      title="Images"
      subtitle="Create, read, update, and delete image rows."
    >
      <section className="insight-grid">
        <article className="insight-card">
          <p className="eyebrow">Images</p>
          <strong>{rows.length.toLocaleString()}</strong>
          <small>Total image rows</small>
        </article>
        <article className="insight-card">
          <p className="eyebrow">Context</p>
          <strong>{withDescription.toLocaleString()}</strong>
          <small>Rows with descriptions</small>
        </article>
        <article className="insight-card">
          <p className="eyebrow">Data hygiene</p>
          <strong>{missingUrl.toLocaleString()}</strong>
          <small>Rows missing URL</small>
        </article>
      </section>

      <section className="panel">
        <h2>{editId ? 'Update image row' : 'Create image row'}</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="Image URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <textarea
            className="input"
            placeholder="Image description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="row-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editId ? 'Update image' : 'Create image'}
            </button>
            {editId && (
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setEditId(null)
                  setUrl('')
                  setDescription('')
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <input
        className="input search-input"
        placeholder="Search URL, description, or id"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="result-meta">
        Showing {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} image rows
      </p>
      {error && <p className="notice error">{error}</p>}

      {loading ? (
        <p className="sub">Loading images…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Description</th>
                <th>Status</th>
                <th>ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="tiny-image" src={row.url} alt={row.image_description ?? 'Image preview'} />
                    ) : (
                      <span className="sub">No URL</span>
                    )}
                  </td>
                  <td>{row.image_description ?? '—'}</td>
                  <td>{row.url ? <span className="tag">Ready</span> : <span className="tag muted">Missing URL</span>}</td>
                  <td className="mono">{row.id}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn ghost" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <button className="btn danger" onClick={() => remove(row.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <h3>No image rows found</h3>
              <p>Try a broader search or create a new image row above.</p>
            </div>
          )}
        </div>
      )}
    </AdminFrame>
  )
}
