import Link from 'next/link'
import AuthControls from './AuthControls'
import ThemeToggle from './ThemeToggle'

type Section = 'dashboard' | 'profiles' | 'images' | 'captions' | 'resources' | 'prompt-lab'

export default function AdminFrame({
  section,
  title,
  subtitle,
  children,
}: {
  section: Section
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">AlmostCrack&apos;d</p>
          <h2>Humor Chain Studio</h2>
        </div>
        <div className="admin-auth">
          <AuthControls />
        </div>

        <nav className="sidebar-links" aria-label="Admin routes">
          <p className="sidebar-label">Workspace</p>
          <Link className={`sidebar-link ${section === 'dashboard' ? 'active' : ''}`} href="/">
            Overview
          </Link>
          <Link className={`sidebar-link ${section === 'resources' ? 'active' : ''}`} href="/resources">
            Flavor Manager
          </Link>
          <Link className={`sidebar-link ${section === 'prompt-lab' ? 'active' : ''}`} href="/prompt-lab">
            Test Lab
          </Link>
        </nav>
      </aside>

      <section className="admin-page">
        <header className="admin-nav">
          <div className="admin-brand">
            <p className="eyebrow">Prompt Chain Tool</p>
            <h1>{title}</h1>
            <p className="sub">{subtitle}</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="start-here-strip" aria-label="Start here onboarding">
          <div className="start-here-copy">
            <p className="eyebrow">Start here</p>
            <h2>Three steps to build and test a humor flavor</h2>
            <p className="sub">Define a flavor, shape the ordered steps, then run the chain against your image test set.</p>
          </div>
          <div className="start-here-steps">
            <article className="start-step">
              <span className="start-step-index">1</span>
              <div>
                <strong>Create the flavor</strong>
                <p>Add a humor flavor record, then open the steps table to define the chain that powers it.</p>
              </div>
            </article>
            <article className="start-step">
              <span className="start-step-index">2</span>
              <div>
                <strong>Order the steps</strong>
                <p>Use the step manager to edit prompts, move steps up or down, and keep the chain sequence correct.</p>
              </div>
            </article>
            <article className="start-step">
              <span className="start-step-index">3</span>
              <div>
                <strong>Run the test lab</strong>
                <p>Select a flavor and test image, generate captions through the API, and review the output side by side.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="admin-content">{children}</section>
      </section>
    </main>
  )
}
