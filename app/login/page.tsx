import { redirect } from 'next/navigation'
import LoginButton from '../components/LoginButton'
import { createSupabaseServerClient } from '../lib/supabase/server'

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) redirect('/')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">Prompt Chain Access</p>
        <h1>Humor Chain Studio</h1>
        <p className="sub">Sign in with Google using a superadmin or matrix admin profile to continue.</p>
        <LoginButton />
      </section>
    </main>
  )
}
