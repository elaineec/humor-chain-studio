import Link from 'next/link'
import AdminFrame from '../components/AdminFrame'
import { ADMIN_RESOURCES } from '../lib/admin-resources'

export default function ResourcesPage() {
  return (
    <AdminFrame
      section="resources"
      title="Flavor Manager"
      subtitle="Manage humor flavors, ordered steps, generated captions, and the image test set from one focused workspace."
    >
      <section className="panel">
        <div className="resource-header">
          <div>
            <h2>Resource Directory</h2>
            <p className="sub">Open the specific table you need for flavor CRUD, step ordering, caption review, or test-image prep.</p>
          </div>
          <span className="status">{ADMIN_RESOURCES.length} resources</span>
        </div>
      </section>
      <section className="resource-grid">
        {ADMIN_RESOURCES.map((resource) => (
          <article key={resource.slug} className="panel">
            <p className="eyebrow">{resource.mode.toUpperCase()}</p>
            <h2>{resource.title}</h2>
            <p className="sub">{resource.description}</p>
            <Link className="btn ghost" href={`/resources/${resource.slug}`}>
              Open table
            </Link>
          </article>
        ))}
      </section>
    </AdminFrame>
  )
}
