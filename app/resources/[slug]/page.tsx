import { notFound } from 'next/navigation'
import AdminFrame from '../../components/AdminFrame'
import { getResourceBySlug } from '../../lib/admin-resources'
import ResourceTable from '../resource-table'

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const resource = getResourceBySlug(slug)
  if (!resource) notFound()

  return (
    <AdminFrame section="resources" title={resource.title} subtitle={resource.description}>
      <ResourceTable resource={resource} />
    </AdminFrame>
  )
}
