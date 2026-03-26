'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

export default function LoginButton() {
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseBrowserClient()

  async function signInWithGoogle() {
    if (!supabase) return
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
  }

  if (!supabase) return <p className="sub">Missing Supabase environment variables.</p>

  return (
    <button className="btn" onClick={signInWithGoogle} disabled={loading}>
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </button>
  )
}
