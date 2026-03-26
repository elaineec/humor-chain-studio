'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

export default function UnauthorizedActions() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleBackToLogin() {
    setLoading(true)
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <button className="btn btn-primary" onClick={handleBackToLogin} disabled={loading}>
      {loading ? 'Redirecting...' : 'Back to Login'}
    </button>
  )
}
