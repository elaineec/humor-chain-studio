import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin,is_matrix_admin')
      .eq('id', user.id)
      .maybeSingle()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const canAccess = profile?.is_superadmin === true || profile?.is_matrix_admin === true
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const body = (await request.json()) as { endpoint?: string; payload?: unknown }
    const endpoint = body.endpoint?.trim() || '/pipeline/generate-captions'
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const payload = normalizePromptPayload(body.payload)

    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.almostcrackd.ai'
    const url = `${base}${normalizedEndpoint}`

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    const text = await upstream.text()
    let parsed: unknown = text
    try {
      parsed = JSON.parse(text)
    } catch {
      // Keep raw text when response is non-JSON.
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error (${upstream.status}).`, details: parsed },
        { status: upstream.status }
      )
    }

    return NextResponse.json({ ok: true, endpoint: normalizedEndpoint, data: parsed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function normalizePromptPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}

  const normalized = { ...(payload as Record<string, unknown>) }

  if ('image_id' in normalized && !('imageId' in normalized)) {
    normalized.imageId = normalized.image_id
  }

  if ('humor_flavor_id' in normalized && !('humorFlavorId' in normalized)) {
    normalized.humorFlavorId = normalized.humor_flavor_id
  }

  return normalized
}
