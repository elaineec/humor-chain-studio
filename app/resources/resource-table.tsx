'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '../lib/supabase/client'
import type { AdminResource } from '../lib/admin-resources'

type GenericRow = Record<string, unknown>
type FieldInputType = 'text' | 'number' | 'boolean' | 'null' | 'json'
type FieldEntry = { id: string; key: string; type: FieldInputType; value: string; locked?: boolean }

type ResourceTableProps = {
  resource: AdminResource
}

export default function ResourceTable({ resource }: ResourceTableProps) {
  const [activeTable, setActiveTable] = useState<string | null>(null)
  const [rows, setRows] = useState<GenericRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<'guided' | 'json'>('guided')
  const [editorText, setEditorText] = useState('{\n  \n}')
  const [fieldEntries, setFieldEntries] = useState<FieldEntry[]>([])
  const [fieldDraft, setFieldDraft] = useState('')
  const [editKey, setEditKey] = useState<string | number | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDescription, setUploadDescription] = useState('')
  const [flavorStepsByFlavorId, setFlavorStepsByFlavorId] = useState<Record<string, GenericRow[]>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()
  const searchParams = useSearchParams()
  const [captionFlavorFilter, setCaptionFlavorFilter] = useState('')

  const addFieldEntry = useCallback(
    (rawKey: string) => {
      const nextKey = rawKey.trim()
      if (!nextKey) return

      setFieldEntries((prev) => {
        if (prev.some((item) => item.key === nextKey)) {
          return prev
        }

        return [
          ...prev,
          {
            id: createEntryId(),
            key: nextKey,
            type: defaultFieldType(nextKey),
            value: '',
            locked: isPresetLockedField(resource.slug, nextKey),
          },
        ]
      })
      setFieldDraft('')
    },
    [resource.slug]
  )

  useEffect(() => {
    if (resource.slug !== 'captions') return
    setCaptionFlavorFilter(searchParams.get('flavor') ?? '')
  }, [resource.slug, searchParams])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q))
  }, [query, rows])
  const shownCount = filteredRows.length
  const totalCount = rows.length

  const columns = useMemo(() => {
    const keys = new Set<string>()
    rows.slice(0, 80).forEach((row) => {
      Object.keys(row).forEach((key) => {
        keys.add(key)
      })
    })
    const ordered = [...keys]
    const prioritized = ['id', 'email', 'name', 'content', 'url', 'created_at']
    ordered.sort((a, b) => {
      const ai = prioritized.indexOf(a)
      const bi = prioritized.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
    return ordered.slice(0, 8)
  }, [rows])

  const editableColumns = useMemo(() => {
    const reserved = new Set([
      'id',
      'created_datetime_utc',
      'modified_datetime_utc',
      'created_at',
      'updated_at',
      'created_by_user_id',
      'modified_by_user_id',
    ])
    const preferredOrder = preferredFieldOrder(resource.slug)
    const merged = [...new Set([...preferredOrder, ...columns])]
    const filtered = merged.filter((column) => !reserved.has(column))

    return filtered.sort((a, b) => {
      const ai = preferredOrder.indexOf(a)
      const bi = preferredOrder.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [columns, resource.slug])

  const primaryKey = useMemo(() => inferPrimaryKey(rows), [rows])
  const availableColumns = useMemo(() => new Set(rows.flatMap((row) => Object.keys(row))), [rows])
  const canCreate = resource.mode === 'crud'
  const canDelete = resource.mode === 'crud'
  const canUpdate = resource.mode === 'crud' || resource.mode === 'update'
  const canUpload = resource.supportsImageUpload === true

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setError('Missing Supabase environment variables.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let loadedTable: string | null = null
    let loadedRows: GenericRow[] = []
    let lastError: string | null = null

    for (const tableName of resource.tableCandidates) {
      let request = supabase.from(tableName).select('*').limit(500)

      if (resource.slug === 'humor-flavor-steps') {
        request = request.order('humor_flavor_id', { ascending: true }).order('order_by', { ascending: true })
      }

      if (resource.slug === 'captions' && captionFlavorFilter) {
        const flavorId = Number(captionFlavorFilter)
        if (!Number.isNaN(flavorId)) {
          request = request.eq('humor_flavor_id', flavorId)
        }
      }

      const { data, error: loadError } = await request
      if (!loadError) {
        loadedTable = tableName
        loadedRows = (data ?? []) as GenericRow[]
        break
      }
      lastError = loadError.message
    }

    if (!loadedTable) {
      setError(lastError ?? `Unable to read resource table for ${resource.title}.`)
      setRows([])
      setActiveTable(null)
      setLoading(false)
      return
    }

    setActiveTable(loadedTable)
    setRows(loadedRows)

    if (resource.slug === 'humor-flavors') {
      const { data: stepsData, error: stepsError } = await supabase
        .from('humor_flavor_steps')
        .select('*')
        .order('order_by', { ascending: true })

      if (stepsError) {
        setError(stepsError.message)
      } else {
        const grouped: Record<string, GenericRow[]> = {}
        for (const step of (stepsData ?? []) as GenericRow[]) {
          const flavorId = step.humor_flavor_id
          if (typeof flavorId !== 'number' && typeof flavorId !== 'string') continue
          const key = String(flavorId)
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(step)
        }
        setFlavorStepsByFlavorId(grouped)
      }
    } else {
      setFlavorStepsByFlavorId({})
    }

    setLoading(false)
  }, [captionFlavorFilter, resource.slug, resource.tableCandidates, resource.title, supabase])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  function parseEditorPayload() {
    try {
      const parsed = JSON.parse(editorText) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON payload must be an object.')
      }
      return parsed as GenericRow
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON payload.'
      throw new Error(message)
    }
  }

  function parseGuidedPayload() {
    const payload: GenericRow = {}
    for (const entry of fieldEntries) {
      const key = entry.key.trim()
      if (!key) continue
      payload[key] = castEntryValue(entry)
    }
    if (Object.keys(payload).length === 0) {
      throw new Error('Add at least one field before saving.')
    }
    return payload
  }

  async function handleCreateOrUpdate(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !activeTable) return
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const actorId = await getActorProfileId(supabase)
      if (!actorId) {
        throw new Error('Unable to resolve signed-in profile id for write operation.')
      }
      const payload = editorMode === 'guided' ? parseGuidedPayload() : parseEditorPayload()

      if (canUpdate && editKey !== null && primaryKey) {
        const updatePayload: GenericRow = { ...payload }
        if (availableColumns.has('modified_by_user_id')) {
          updatePayload.modified_by_user_id = actorId
        }
        const { error: updateError } = await supabase
          .from(activeTable)
          .update(updatePayload)
          .eq(primaryKey, editKey)
        if (updateError) throw updateError
        setSuccessMessage(`Updated row ${String(editKey)} in ${resource.title}.`)
      } else if (canCreate) {
        const insertPayload: GenericRow = { ...payload }
        if (availableColumns.has('created_by_user_id')) {
          insertPayload.created_by_user_id = actorId
        }
        if (availableColumns.has('modified_by_user_id')) {
          insertPayload.modified_by_user_id = actorId
        }
        const { error: insertError } = await supabase.from(activeTable).insert(insertPayload)
        if (insertError) throw insertError
        setSuccessMessage(`Created a new row in ${resource.title}.`)
      } else {
        throw new Error('This resource is not create-enabled.')
      }

      setEditorText('{\n  \n}')
      setFieldEntries([])
      setEditKey(null)
      await loadRows()
    } catch (err) {
      const message = getErrorMessage(err)
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(row: GenericRow) {
    if (!canUpdate) return
    if (!primaryKey) {
      setError('No primary key detected for update operation.')
      return
    }

    const keyValue = row[primaryKey]
    if (typeof keyValue !== 'string' && typeof keyValue !== 'number') {
      setError('This row cannot be updated because the key value is not scalar.')
      return
    }

    const payload = { ...row }
    delete payload[primaryKey]
    setFieldEntries(objectToEntries(payload))
    setEditorMode('guided')
    setEditKey(keyValue)
    setEditorText(JSON.stringify(payload, null, 2))
  }

  async function handleDelete(row: GenericRow) {
    if (!supabase || !activeTable || !canDelete || !primaryKey) return
    const keyValue = row[primaryKey]
    if (typeof keyValue !== 'string' && typeof keyValue !== 'number') {
      setError('This row cannot be deleted because no scalar key was found.')
      return
    }
    setError(null)
    setSuccessMessage(null)
    const { error: deleteError } = await supabase.from(activeTable).delete().eq(primaryKey, keyValue)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setSuccessMessage(`Deleted row ${String(keyValue)} from ${resource.title}.`)
    await loadRows()
  }

  async function moveFlavorStep(row: GenericRow, direction: 'up' | 'down') {
    if (!supabase || !activeTable || resource.slug !== 'humor-flavor-steps' || !primaryKey) return

    const rowId = row[primaryKey]
    const flavorId = row.humor_flavor_id
    const currentOrder = row.order_by

    if (
      (typeof rowId !== 'string' && typeof rowId !== 'number') ||
      (typeof flavorId !== 'string' && typeof flavorId !== 'number') ||
      typeof currentOrder !== 'number'
    ) {
      setError('Step row is missing required fields for reorder.')
      return
    }

    const siblings = rows
      .filter((item) => String(item.humor_flavor_id) === String(flavorId))
      .slice()
      .sort((a, b) => Number(a.order_by ?? 0) - Number(b.order_by ?? 0))

    const currentIndex = siblings.findIndex((item) => String(item[primaryKey]) === String(rowId))
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= siblings.length) return

    const targetRow = siblings[targetIndex]
    const targetId = targetRow[primaryKey]
    const targetOrder = targetRow.order_by
    if ((typeof targetId !== 'string' && typeof targetId !== 'number') || typeof targetOrder !== 'number') {
      setError('Neighbor step is missing reorder fields.')
      return
    }

    setError(null)
    setSuccessMessage(null)
    const actorId = await getActorProfileId(supabase)
    if (!actorId) {
      setError('Unable to resolve signed-in profile id for reorder operation.')
      return
    }

    const { error: firstError } = await supabase
      .from(activeTable)
      .update({
        order_by: targetOrder,
        modified_by_user_id: actorId,
      })
      .eq(primaryKey, rowId)
    if (firstError) {
      setError(firstError.message)
      return
    }

    const { error: secondError } = await supabase
      .from(activeTable)
      .update({
        order_by: currentOrder,
        modified_by_user_id: actorId,
      })
      .eq(primaryKey, targetId)
    if (secondError) {
      setError(secondError.message)
      return
    }

    setSuccessMessage(`Moved step ${String(rowId)} ${direction} in ${resource.title}.`)
    await loadRows()
  }

  async function handleImageUpload() {
    if (!supabase || !activeTable || !uploadFile || !canUpload) return
    setUploading(true)
    setError(null)
    setSuccessMessage(null)

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET || 'images'
    const fileName = sanitizeFileName(uploadFile.name)
    const path = `admin/${Date.now()}-${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, uploadFile, { upsert: false, contentType: uploadFile.type || undefined })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(path)
    const publicUrl = publicData.publicUrl

    const payload: GenericRow = {
      url: publicUrl,
      image_description: uploadDescription.trim() || null,
    }

    const actorId = await getActorProfileId(supabase)
    if (!actorId) {
      setError('Unable to resolve signed-in profile id for upload insert.')
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from(activeTable).insert({
      ...payload,
      created_by_user_id: actorId,
      modified_by_user_id: actorId,
    })
    if (insertError) {
      setError(insertError.message)
      setUploading(false)
      return
    }

    setUploadFile(null)
    setUploadDescription('')
    setSuccessMessage(`Uploaded ${uploadFile.name} and inserted a new ${resource.title} row.`)
    await loadRows()
    setUploading(false)
  }

  return (
    <div className="resource-layout">
      <section className="panel resource-summary-panel">
        <div className="resource-header">
          <div>
            <h2>{resource.title}</h2>
            <p className="sub">{resource.description}</p>
          </div>
          <div className="resource-meta">
            <span className="status">{resource.mode.toUpperCase()}</span>
            <span className="status">{activeTable ? `table: ${activeTable}` : 'table unresolved'}</span>
            <span className="status">
              showing {shownCount.toLocaleString()} / {totalCount.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {(canCreate || canUpdate || canDelete) && (
        <section className="panel helper-panel resource-guide-panel">
          <h2>Operator guide</h2>
          <p className="sub">
            Use search to isolate rows, then edit/delete from row actions. Guided mode is recommended for normal use.
            JSON mode is available for advanced edits.
          </p>
        </section>
      )}

      {canUpload && (
        <section className="panel resource-form-panel">
          <div className="resource-section-head">
            <div>
              <h2>Upload image file</h2>
              <p className="sub">
                Uploads to Supabase Storage bucket <code>{process.env.NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET || 'images'}</code>
                , then inserts an image row.
              </p>
            </div>
          </div>
          <div className="form-grid resource-form-grid">
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            />
            <input
              className="input"
              placeholder="Optional image description"
              value={uploadDescription}
              onChange={(event) => setUploadDescription(event.target.value)}
            />
            <button
              className="btn"
              type="button"
              onClick={handleImageUpload}
              disabled={uploading || !uploadFile}
            >
              {uploading ? 'Uploading…' : 'Upload + Insert row'}
            </button>
          </div>
        </section>
      )}

      {(canCreate || canUpdate) && (
        <section className="panel resource-form-panel">
          <div className="resource-section-head">
            <div>
              <h2>
                {canUpdate && editKey !== null
                  ? `Update row (${primaryKey}: ${String(editKey)})`
                  : canCreate
                    ? 'Create row'
                    : 'Update row'}
              </h2>
              <p className="sub">Guided form mode is default. Switch to JSON only when you need advanced control.</p>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className={`btn ghost ${editorMode === 'guided' ? 'active-mode' : ''}`}
                onClick={() => setEditorMode('guided')}
              >
                Guided form
              </button>
              <button
                type="button"
                className={`btn ghost ${editorMode === 'json' ? 'active-mode' : ''}`}
                onClick={() => setEditorMode('json')}
              >
                JSON mode
              </button>
            </div>
          </div>
          <form className="form-grid resource-form-grid" onSubmit={handleCreateOrUpdate}>
            {editorMode === 'guided' ? (
              <>
                <div className="row-actions resource-inline-controls">
                  <select
                    className="input"
                    value={fieldDraft}
                    onChange={(event) => {
                      const value = event.target.value
                      setFieldDraft(value)
                      addFieldEntry(value)
                    }}
                  >
                    <option value="">{fieldPickerPlaceholder(resource.slug)}</option>
                    {editableColumns.map((column) => (
                      <option key={column} value={column}>
                        {columnLabel(column, resource.slug)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-grid">
                  {fieldEntries.map((entry) => (
                    <div className="field-row" key={entry.id}>
                      {entry.locked ? (
                        <div className="input field-label-lock" aria-label={columnLabel(entry.key, resource.slug)}>
                          {columnLabel(entry.key, resource.slug)}
                        </div>
                      ) : (
                        <input
                          className="input"
                          placeholder="Field"
                          value={entry.key}
                          onChange={(event) =>
                            setFieldEntries((prev) =>
                              prev.map((item) =>
                                item.id === entry.id ? { ...item, key: event.target.value } : item
                              )
                            )
                          }
                        />
                      )}
                      <select
                        className="input"
                        value={entry.type}
                        onChange={(event) =>
                          setFieldEntries((prev) =>
                            prev.map((item) =>
                              item.id === entry.id
                                ? { ...item, type: event.target.value as FieldInputType, value: '' }
                                : item
                            )
                          )
                        }
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="null">Null</option>
                        <option value="json">JSON</option>
                      </select>
                      {entry.type === 'boolean' ? (
                        <select
                          className="input"
                          value={entry.value || 'true'}
                          onChange={(event) =>
                            setFieldEntries((prev) =>
                              prev.map((item) =>
                                item.id === entry.id ? { ...item, value: event.target.value } : item
                              )
                            )
                          }
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : entry.type === 'null' ? (
                        <input className="input" value="null" disabled />
                      ) : (
                        <input
                          className="input"
                          placeholder={entry.type === 'json' ? '{"key":"value"}' : 'value'}
                          value={entry.value}
                          onChange={(event) =>
                            setFieldEntries((prev) =>
                              prev.map((item) =>
                                item.id === entry.id ? { ...item, value: event.target.value } : item
                              )
                            )
                          }
                        />
                      )}
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() =>
                          setFieldEntries((prev) => prev.filter((item) => item.id !== entry.id))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <textarea
                className="input"
                rows={10}
                value={editorText}
                onChange={(event) => setEditorText(event.target.value)}
              />
            )}
            <div className="row-actions">
              <button className="btn" type="submit" disabled={saving || (!canCreate && editKey === null)}>
                {saving
                  ? 'Saving…'
                  : canUpdate && editKey !== null
                    ? 'Update row'
                    : canCreate
                      ? 'Create row'
                      : 'Save changes'}
              </button>
              {canUpdate && editKey !== null && (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setEditKey(null)
                    setEditorText('{\n  \n}')
                    setFieldEntries([])
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="panel resource-search-panel">
        <div className="resource-section-head">
          <div>
            <h2>Browse rows</h2>
            <p className="sub">Search the current dataset before opening row actions.</p>
          </div>
          <p className="result-meta">
            Showing {shownCount.toLocaleString()} of {totalCount.toLocaleString()} rows
          </p>
        </div>
        <input
          className="input search-input"
          placeholder="Search rows"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>

      {resource.slug === 'captions' && (
        <section className="panel resource-search-panel">
          <div className="resource-section-head">
            <div>
              <h2>Produced captions by flavor</h2>
              <p className="sub">Apply a humor flavor filter to narrow the caption dataset.</p>
            </div>
          </div>
          <div className="row-actions resource-inline-controls">
            <input
              className="input search-input"
              placeholder="Humor flavor id"
              value={captionFlavorFilter}
              onChange={(event) => setCaptionFlavorFilter(event.target.value)}
            />
            <button className="btn" onClick={() => void loadRows()}>
              Apply
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setCaptionFlavorFilter('')
                void loadRows()
              }}
            >
              Clear
            </button>
          </div>
        </section>
      )}

      {successMessage && <p className="notice success">{successMessage}</p>}
      {error && <p className="notice error">{error}</p>}
      {resource.slug === 'humor-flavors' && !loading && (
        <section className="panel">
          <h2>{query.trim() ? 'Matching flavors' : 'Flavor step inspector'}</h2>
          <p className="sub">
            {query.trim()
              ? `Showing flavor cards that match "${query.trim()}" across name, description, and related fields.`
              : 'Each humor flavor below includes its prompt-chain steps from `humor_flavor_steps`.'}
          </p>
          <div className="flavor-grid">
            {filteredRows.map((row, index) => {
              const flavorId = row.id
              const flavorKey =
                typeof flavorId === 'number' || typeof flavorId === 'string'
                  ? String(flavorId)
                  : `flavor-${index}`
              const slug = typeof row.slug === 'string' ? row.slug : 'unknown-flavor'
              const description = typeof row.description === 'string' ? row.description : 'No description'
              const steps = flavorStepsByFlavorId[flavorKey] ?? []
              return (
                <article className="panel flavor-card" key={flavorKey}>
                  <div className="flavor-card-head">
                    <div>
                      <p className="eyebrow">Flavor {flavorKey}</p>
                      <h3>{slug}</h3>
                    </div>
                    <span className="tag">{steps.length} steps</span>
                  </div>
                  <p className="sub flavor-card-description">{description}</p>
                  <div className="flavor-card-actions">
                    <a className="btn ghost" href={`/resources/captions?flavor=${flavorKey}`}>
                      View captions
                    </a>
                    {canUpdate && (
                      <button className="btn ghost" onClick={() => beginEdit(row)}>
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button className="btn danger" onClick={() => void handleDelete(row)}>
                        Delete
                      </button>
                    )}
                  </div>
                  {steps.length ? (
                    <ol className="step-list flavor-step-list">
                      {steps.map((step, stepIndex) => {
                        const orderValue =
                          typeof step.order_by === 'number' ? step.order_by : stepIndex + 1
                        const stepType = stringifyValue(step.humor_flavor_step_type_id)
                        const modelId = stringifyValue(step.llm_model_id)
                        const stepDesc =
                          typeof step.description === 'string' ? step.description : 'No description'
                        return (
                          <li className="flavor-step-card" key={`${flavorKey}-step-${stepIndex}`}>
                            <div className="flavor-step-head">
                              <strong>Step {orderValue}</strong>
                              <div className="flavor-step-meta">
                                <span className="tag muted">Type {stepType}</span>
                                <span className="tag muted">Model {modelId}</span>
                              </div>
                            </div>
                            <span>{stepDesc}</span>
                          </li>
                        )
                      })}
                    </ol>
                  ) : (
                    <div className="flavor-empty">
                      <span className="tag muted">No steps yet</span>
                      <p className="sub">Add flavor steps to turn this definition into a working prompt chain.</p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
          {filteredRows.length === 0 && (
            <div className="flavor-empty">
              <span className="tag muted">No matches</span>
              <p className="sub">Try a different flavor name, description term, or clear the search.</p>
            </div>
          )}
        </section>
      )}
      {loading ? (
        <p className="sub">Loading rows…</p>
      ) : resource.slug === 'humor-flavors' ? null : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{columnLabel(column, resource.slug)}</th>
                ))}
                {(canUpdate || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const rowId = rowKey(row, primaryKey, index)
                return (
                  <tr key={rowId}>
                    {columns.map((column) => (
                      <td key={`${rowId}-${column}`} className={column === 'id' ? 'mono' : undefined}>
                        {renderCellValue(column, row[column])}
                      </td>
                    ))}
                    {(canUpdate || canDelete) && (
                      <td>
                        <div className="row-actions">
                          {canUpdate && (
                            <button className="btn ghost" onClick={() => beginEdit(row)}>
                              Edit
                            </button>
                          )}
                          {resource.slug === 'humor-flavor-steps' && (
                            <>
                              <button className="btn ghost" onClick={() => void moveFlavorStep(row, 'up')}>
                                Move up
                              </button>
                              <button className="btn ghost" onClick={() => void moveFlavorStep(row, 'down')}>
                                Move down
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button className="btn danger" onClick={() => void handleDelete(row)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shownCount === 0 && (
            <div className="empty-state">
              <h3>No rows match this filter</h3>
              <p>Try a broader search or clear filters to continue.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function inferPrimaryKey(rows: GenericRow[]) {
  if (!rows.length) return 'id'
  const firstRow = rows[0]
  if ('id' in firstRow) return 'id'
  const keyBySuffix = Object.keys(firstRow).find((key) => key.endsWith('_id'))
  return keyBySuffix ?? null
}

function rowKey(row: GenericRow, primaryKey: string | null, index: number) {
  if (primaryKey) {
    const value = row[primaryKey]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return `row-${index}`
}

function renderCellValue(column: string, value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') {
    return value ? <span className="tag">Yes</span> : <span className="tag muted">No</span>
  }
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'string') {
    if (column.includes('datetime') || column.endsWith('_at')) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString()
    }
    if (column === 'url' && value.startsWith('http')) {
      return (
        <a href={value} target="_blank" rel="noreferrer">
          Open URL
        </a>
      )
    }
    return value.length > 140 ? `${value.slice(0, 137)}...` : value
  }
  return JSON.stringify(value)
}

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]/g, '-')
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

async function getActorProfileId(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user?.id) return null
  return user.id
}

function castEntryValue(entry: FieldEntry): unknown {
  if (entry.type === 'null') return null
  if (entry.type === 'boolean') return entry.value === 'true'
  if (entry.type === 'number') {
    const num = Number(entry.value)
    if (Number.isNaN(num)) throw new Error(`Field "${entry.key}" expects a valid number.`)
    return num
  }
  if (entry.type === 'json') {
    try {
      return JSON.parse(entry.value || '{}') as unknown
    } catch {
      throw new Error(`Field "${entry.key}" has invalid JSON.`)
    }
  }
  return entry.value
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'Request failed.'
}

function objectToEntries(payload: GenericRow): FieldEntry[] {
  return Object.entries(payload)
    .filter(([key]) =>
      ![
        'created_datetime_utc',
        'modified_datetime_utc',
        'created_at',
        'updated_at',
        'created_by_user_id',
        'modified_by_user_id',
      ].includes(key)
    )
    .map(([key, value]) => inferFieldEntry(key, value))
}

function inferFieldEntry(key: string, value: unknown): FieldEntry {
  if (value === null || value === undefined) {
    return { id: createEntryId(), key, type: 'null', value: '', locked: isPresetLockedFieldForAnyResource(key) }
  }
  if (typeof value === 'boolean') {
    return {
      id: createEntryId(),
      key,
      type: 'boolean',
      value: value ? 'true' : 'false',
      locked: isPresetLockedFieldForAnyResource(key),
    }
  }
  if (typeof value === 'number') {
    return {
      id: createEntryId(),
      key,
      type: 'number',
      value: String(value),
      locked: isPresetLockedFieldForAnyResource(key),
    }
  }
  if (typeof value === 'object') {
    return {
      id: createEntryId(),
      key,
      type: 'json',
      value: JSON.stringify(value),
      locked: isPresetLockedFieldForAnyResource(key),
    }
  }
  return {
    id: createEntryId(),
    key,
    type: 'text',
    value: String(value),
    locked: isPresetLockedFieldForAnyResource(key),
  }
}

function createEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function preferredFieldOrder(resourceSlug: string) {
  if (resourceSlug === 'humor-flavors') {
    return ['slug', 'description']
  }

  if (resourceSlug === 'humor-flavor-steps') {
    return [
      'humor_flavor_id',
      'order_by',
      'description',
      'humor_flavor_step_type_id',
      'llm_model_id',
      'llm_input_type_id',
    ]
  }

  return []
}

function fieldPickerPlaceholder(resourceSlug: string) {
  if (resourceSlug === 'humor-flavors') {
    return 'Choose a flavor field'
  }

  if (resourceSlug === 'humor-flavor-steps') {
    return 'Choose a step field'
  }

  return 'Choose field to add (optional)'
}

function isPresetLockedField(resourceSlug: string, key: string) {
  if (resourceSlug === 'humor-flavors') {
    return key === 'slug' || key === 'description'
  }

  if (resourceSlug === 'humor-flavor-steps') {
    return [
      'humor_flavor_id',
      'order_by',
      'description',
      'humor_flavor_step_type_id',
      'llm_model_id',
      'llm_input_type_id',
    ].includes(key)
  }

  return false
}

function isPresetLockedFieldForAnyResource(key: string) {
  return [
    'slug',
    'description',
    'humor_flavor_id',
    'order_by',
    'humor_flavor_step_type_id',
    'llm_model_id',
    'llm_input_type_id',
  ].includes(key)
}

function defaultFieldType(key: string): FieldInputType {
  if (
    ['id', 'order_by', 'humor_flavor_id', 'humor_flavor_step_type_id', 'llm_model_id', 'llm_input_type_id'].includes(
      key
    )
  ) {
    return 'number'
  }

  return 'text'
}

function columnLabel(column: string, resourceSlug?: string) {
  if (resourceSlug === 'humor-flavors') {
    if (column === 'slug') return 'Flavor Name'
    if (column === 'description') return 'Flavor Description'
  }

  const map: Record<string, string> = {
    id: 'ID',
    created_datetime_utc: 'Created',
    modified_datetime_utc: 'Updated',
    created_at: 'Created',
    updated_at: 'Updated',
    humor_flavor_id: 'Flavor ID',
    humor_flavor_step_type_id: 'Step Type',
    llm_model_id: 'Model',
    llm_input_type_id: 'Input Type',
    llm_provider_id: 'Provider',
    profile_id: 'Profile',
    image_id: 'Image',
    caption_id: 'Caption',
    llm_user_prompt: 'User Prompt',
    llm_system_prompt: 'System Prompt',
    caption_count: 'Caption Count',
    is_public: 'Public',
    is_superadmin: 'Superadmin',
    is_matrix_admin: 'Matrix Admin',
    is_in_study: 'In Study',
    order_by: 'Order',
    apex_domain: 'Domain',
    email_address: 'Email',
  }
  if (map[column]) return map[column]
  return column
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
