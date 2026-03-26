import UnauthorizedActions from './unauthorized-actions'

export default function UnauthorizedPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">Unauthorized</p>
        <h1>Admin access required</h1>
        <p className="sub">
          Your account is signed in but does not have superadmin or matrix admin permissions yet.
        </p>
        <UnauthorizedActions />
      </section>
    </main>
  )
}
