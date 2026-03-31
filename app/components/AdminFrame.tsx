import Link from 'next/link'
import AuthControls from './AuthControls'
import { ADMIN_RESOURCES } from '../lib/admin-resources'
import ThemeToggle from './ThemeToggle'

type Section = 'dashboard' | 'profiles' | 'images' | 'captions' | 'resources' | 'prompt-lab'

const CONTENT_SLUGS = ['images', 'captions', 'caption-requests', 'caption-examples', 'terms'] as const
const HUMOR_SLUGS = ['humor-flavors', 'humor-flavor-steps', 'humor-mix'] as const
const AI_SLUGS = ['llm-models', 'llm-providers', 'llm-prompt-chains', 'llm-responses'] as const
const ACCESS_SLUGS = ['allowed-signup-domains', 'whitelisted-emails'] as const

function bySlugs(slugs: readonly string[]) {
  return ADMIN_RESOURCES.filter((resource) => slugs.includes(resource.slug))
}

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
          <p className="sidebar-label">Overview</p>
          <Link className={`sidebar-link ${section === 'dashboard' ? 'active' : ''}`} href="/">
            Overview
          </Link>
          <Link className="sidebar-link secondary" href="/resources/users">
            Users / Profiles
          </Link>
          <Link className={`sidebar-link ${section === 'resources' ? 'active' : ''}`} href="/resources">
            Resource Directory
          </Link>

          <p className="sidebar-label">Content</p>
          {bySlugs(CONTENT_SLUGS).map((resource) => (
            <Link className="sidebar-link secondary" href={`/resources/${resource.slug}`} key={resource.slug}>
              {resource.title}
            </Link>
          ))}

          <p className="sidebar-label">Humor</p>
          {bySlugs(HUMOR_SLUGS).map((resource) => (
            <Link className="sidebar-link secondary" href={`/resources/${resource.slug}`} key={resource.slug}>
              {resource.title}
            </Link>
          ))}

          <p className="sidebar-label">AI / LLM</p>
          {bySlugs(AI_SLUGS).map((resource) => (
            <Link className="sidebar-link secondary" href={`/resources/${resource.slug}`} key={resource.slug}>
              {resource.title}
            </Link>
          ))}

          <p className="sidebar-label">Access</p>
          {bySlugs(ACCESS_SLUGS).map((resource) => (
            <Link className="sidebar-link secondary" href={`/resources/${resource.slug}`} key={resource.slug}>
              {resource.title}
            </Link>
          ))}

          <p className="sidebar-label">Testing</p>
          <Link className={`sidebar-link ${section === 'captions' ? 'active' : ''}`} href="/resources/captions">
            Caption Outputs
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
            <h2>Three steps to review the domain model and test a humor flavor</h2>
            <p className="sub">Use the resource directory for CRUD and read workflows, then move into Test Lab to validate a flavor against the API.</p>
          </div>
          <div className="start-here-steps">
            <article className="start-step">
              <span className="start-step-index">1</span>
              <div>
                <strong>Open the right dataset</strong>
                <p>Use the sidebar to jump into the exact table you need to read, update, or manage.</p>
              </div>
            </article>
            <article className="start-step">
              <span className="start-step-index">2</span>
              <div>
                <strong>Update and confirm</strong>
                <p>Run CRUD or update actions, then verify the success confirmation before leaving the table.</p>
              </div>
            </article>
            <article className="start-step">
              <span className="start-step-index">3</span>
              <div>
                <strong>Test your humor flavor</strong>
                <p>Select a flavor and test image, generate captions through the API, and inspect results in Test Lab.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="admin-content">{children}</section>
      </section>
    </main>
  )
}
