'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '../lib/supabase/client'

type UserInfo = {
  email?: string | null
  name?: string | null
  statusLabel?: string | null
}

export default function AuthControls() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    async function resolveUserInfo(authUser: User | null) {
      if (!authUser) {
        setUser(null)
        return
      }

      let statusLabel = 'Admin'
      const { data: profile } = await client
        .from('profiles')
        .select('is_superadmin,is_matrix_admin')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profile?.is_superadmin === true) {
        statusLabel = 'Superadmin'
      } else if (profile?.is_matrix_admin === true) {
        statusLabel = 'Matrix admin'
      }

      setUser({
        email: authUser.email,
        name: authUser.user_metadata?.full_name ?? null,
        statusLabel,
      })
    }

    client.auth.getUser().then(({ data }) => {
      void resolveUserInfo(data.user)
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      void resolveUserInfo(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  async function signIn() {
    if (!supabase) return
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
  }

  async function signOut() {
    if (!supabase) return
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
    setOpen(false)
    window.location.replace('/login')
  }

  if (!supabase) return <span className="status">Missing env vars</span>

  if (!user) {
    return (
      <button className="btn" onClick={signIn} disabled={loading}>
        Continue with Google
      </button>
    )
  }

  return (
    <div className="auth">
      <div className={`account ${open ? 'open' : ''}`}>
        <button
          className="account-button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="account-menu"
          disabled={loading}
        >
          <span className="account-avatar" aria-hidden="true">
            {(user.name ?? user.email ?? 'A').charAt(0).toUpperCase()}
          </span>
          <div className="account-meta">
            <div className="account-label">Account</div>
            <div className="account-name">{user.name ?? user.email ?? 'Signed in'}</div>
            <div className="account-status">{user.statusLabel ?? 'Admin'}</div>
          </div>
          <span className="account-caret">▾</span>
        </button>
        {open && (
          <div className="account-menu" id="account-menu" role="menu">
            <div className="account-menu-meta">
              <strong>{user.name ?? 'Signed in'}</strong>
              <span>{user.email ?? 'No email available'}</span>
            </div>
            <button className="btn account-signout" onClick={signOut} disabled={loading} role="menuitem">
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
