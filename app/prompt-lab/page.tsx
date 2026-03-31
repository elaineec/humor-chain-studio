'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import AdminFrame from '../components/AdminFrame'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

type FlavorOption = {
  id: string
  label: string
  description: string | null
}

type StepRow = Record<string, unknown>

type TestImage = {
  id: string
  url: string | null
  image_description: string | null
}

type ApiResult = {
  ok?: boolean
  endpoint?: string
  data?: unknown
  error?: string
  details?: unknown
}

export default function PromptLabPage() {
  const [endpoint, setEndpoint] = useState('/pipeline/generate-captions')
  const [flavors, setFlavors] = useState<FlavorOption[]>([])
  const [steps, setSteps] = useState<StepRow[]>([])
  const [images, setImages] = useState<TestImage[]>([])
  const [selectedFlavorId, setSelectedFlavorId] = useState('')
  const [selectedImageId, setSelectedImageId] = useState('')
  const [payloadText, setPayloadText] = useState('{\n  "imageId": "",\n  "humorFlavorId": ""\n}')
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [resultCaptions, setResultCaptions] = useState<string[]>([])
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    async function loadOptions() {
      if (!supabase) {
        setError('Missing Supabase environment variables.')
        setBooting(false)
        return
      }

      setBooting(true)
      setError(null)

      const [flavorsRes, imagesRes] = await Promise.all([
        supabase.from('humor_flavors').select('id, slug, description').order('id', { ascending: true }),
        supabase.from('images').select('id, url, image_description').limit(24),
      ])

      const firstError = flavorsRes.error || imagesRes.error
      if (firstError) {
        setError(firstError.message)
        setBooting(false)
        return
      }

      const nextFlavors = ((flavorsRes.data ?? []) as Array<Record<string, unknown>>).flatMap((row) => {
        const id = typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id) : null
        if (!id) return []
        return [
          {
            id,
            label: typeof row.slug === 'string' ? row.slug : `Flavor ${id}`,
            description: typeof row.description === 'string' ? row.description : null,
          },
        ]
      })

      const nextImages = ((imagesRes.data ?? []) as Array<Record<string, unknown>>).flatMap((row) => {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) return []
        return [
          {
            id,
            url: typeof row.url === 'string' ? row.url : null,
            image_description: typeof row.image_description === 'string' ? row.image_description : null,
          },
        ]
      })

      setFlavors(nextFlavors)
      setImages(nextImages)

      if (nextFlavors[0]) {
        setSelectedFlavorId((current) => current || nextFlavors[0].id)
      }
      if (nextImages[0]) {
        setSelectedImageId((current) => current || nextImages[0].id)
      }

      setBooting(false)
    }

    void loadOptions()
  }, [supabase])

  useEffect(() => {
    async function loadSteps() {
      if (!supabase || !selectedFlavorId) {
        setSteps([])
        return
      }

      const numericFlavorId = Number(selectedFlavorId)
      const filterValue = Number.isNaN(numericFlavorId) ? selectedFlavorId : numericFlavorId
      const { data, error: stepsError } = await supabase
        .from('humor_flavor_steps')
        .select('*')
        .eq('humor_flavor_id', filterValue)
        .order('order_by', { ascending: true })

      if (stepsError) {
        setError(stepsError.message)
        setSteps([])
        return
      }

      setSteps((data ?? []) as StepRow[])
    }

    setPayloadText(
      JSON.stringify(
        {
          imageId: selectedImageId || '',
          humorFlavorId: selectedFlavorId || '',
        },
        null,
        2
      )
    )

    void loadSteps()
  }, [selectedFlavorId, selectedImageId, supabase])

  const selectedFlavor = useMemo(
    () => flavors.find((flavor) => flavor.id === selectedFlavorId) ?? null,
    [flavors, selectedFlavorId]
  )

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResponseText('')
    setResultCaptions([])

    try {
      const payload = JSON.parse(payloadText) as unknown
      const response = await fetch('/api/prompt-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, payload }),
      })

      const result = (await response.json()) as ApiResult
      if (!response.ok) {
        const detailText =
          result?.details === undefined ? '' : `\n\n${JSON.stringify(result.details, null, 2)}`
        throw new Error(
          `${typeof result?.error === 'string' ? result.error : 'Prompt test failed.'}${detailText}`
        )
      }

      setResponseText(JSON.stringify(result, null, 2))
      setResultCaptions(extractCaptions(result.data))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminFrame
      section="prompt-lab"
      title="Test Lab"
      subtitle="Run a humor flavor prompt chain against your image test set and inspect the live API output."
    >
      {error && <p className="notice error">{error}</p>}
      {booting ? (
        <p className="sub">Loading test lab…</p>
      ) : (
        <>
          <section className="panel resource-form-panel">
            <div className="resource-section-head">
              <div>
                <h2>Flavor test runner</h2>
                <p className="sub">
                  Select a humor flavor and test image, then run the Assignment 5 REST API through this protected proxy.
                </p>
              </div>
              {selectedFlavorId && (
                <Link className="btn ghost" href={`/resources/captions?flavor=${selectedFlavorId}`}>
                  View captions for this flavor
                </Link>
              )}
            </div>

            <form className="form-grid resource-form-grid" onSubmit={onSubmit}>
              <div className="field-grid">
                <div className="field-row">
                  <select
                    className="input"
                    value={selectedFlavorId}
                    onChange={(event) => setSelectedFlavorId(event.target.value)}
                  >
                    <option value="">Choose humor flavor</option>
                    {flavors.map((flavor) => (
                    <option key={flavor.id} value={flavor.id}>
                      {flavor.label}
                    </option>
                  ))}
                </select>
                  <input
                    className="input"
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                    placeholder="/pipeline/generate-captions"
                  />
                  <select
                    className="input"
                    value={selectedImageId}
                    onChange={(event) => setSelectedImageId(event.target.value)}
                  >
                    <option value="">Choose test image</option>
                    {images.map((image) => (
                      <option key={image.id} value={image.id}>
                        {image.image_description ? `${image.image_description.slice(0, 56)} (${image.id.slice(0, 8)})` : image.id}
                      </option>
                    ))}
                  </select>
                  <button className="btn" type="submit" disabled={loading || !selectedFlavorId || !selectedImageId}>
                    {loading ? 'Generating…' : 'Run flavor test'}
                  </button>
                </div>
              </div>

              <textarea
                className="input"
                rows={10}
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
              />
            </form>
          </section>

          <section className="chart-grid">
            <article className="panel">
              <h2>Selected flavor</h2>
              {selectedFlavor ? (
                <ul className="data-list">
                  <li>
                    <strong>{selectedFlavor.label}</strong>
                    <span>{selectedFlavor.description ?? 'No description set.'}</span>
                  </li>
                  <li>
                    <strong>{steps.length}</strong>
                    <span>Ordered steps in this chain</span>
                  </li>
                </ul>
              ) : (
                <p className="sub">Choose a flavor to inspect the chain.</p>
              )}
            </article>

            <article className="panel">
              <h2>Chosen test image</h2>
              {selectedImageId ? (
                <div className="thumb-grid">
                  {images
                    .filter((image) => image.id === selectedImageId)
                    .map((image) => (
                      <article key={image.id} className="thumb-card">
                        {image.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.url} alt={image.image_description ?? 'Test image'} />
                        ) : (
                          <div className="thumb-placeholder">No URL</div>
                        )}
                        <p>{image.image_description ?? image.id}</p>
                      </article>
                    ))}
                </div>
              ) : (
                <p className="sub">Choose a test image to preview it here.</p>
              )}
            </article>
          </section>

          <section className="panel">
            <h2>Ordered prompt chain</h2>
            {steps.length ? (
              <ol className="step-list">
                {steps.map((step, index) => (
                  <li key={String(step.id ?? index)}>
                    <strong>Step {typeof step.order_by === 'number' ? step.order_by : index + 1}</strong>
                    <span>{stepSummary(step)}</span>
                    <small>{stepPromptPreview(step)}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="sub">No steps found for the selected flavor.</p>
            )}
          </section>

          {resultCaptions.length > 0 && (
            <section className="panel">
              <h2>Generated captions</h2>
              <div className="resource-grid">
                {resultCaptions.map((caption, index) => (
                  <article key={`${caption}-${index}`} className="panel">
                    <p className="eyebrow">Result {index + 1}</p>
                    <p>{caption}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {responseText && (
            <section className="panel">
              <h2>API response</h2>
              <pre className="code-block">{responseText}</pre>
            </section>
          )}
        </>
      )}
    </AdminFrame>
  )
}

function extractCaptions(data: unknown): string[] {
  if (!data) return []

  if (Array.isArray(data)) {
    return data.flatMap((item) => extractCaptions(item)).filter(Boolean)
  }

  if (typeof data === 'object') {
    const record = data as Record<string, unknown>
    const direct = ['caption', 'content', 'text']
      .map((key) => record[key])
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    if (direct) return [direct]

    if (Array.isArray(record.captions)) {
      return record.captions.flatMap((item) => extractCaptions(item))
    }
  }

  return []
}

function stepSummary(step: StepRow) {
  const candidates = [step.name, step.slug, step.title, step.description, step.step_name]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return 'Untitled chain step'
}

function stepPromptPreview(step: StepRow) {
  const candidates = [
    step.llm_user_prompt,
    step.llm_system_prompt,
    step.prompt,
    step.content,
    step.instructions,
  ]

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.length > 140 ? `${value.slice(0, 137)}...` : value
    }
  }

  return 'No prompt preview available.'
}
