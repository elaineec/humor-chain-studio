export type ResourceMode = 'read' | 'update' | 'crud'

export type AdminResource = {
  slug: string
  title: string
  description: string
  mode: ResourceMode
  tableCandidates: string[]
  supportsImageUpload?: boolean
}

export const ADMIN_RESOURCES: AdminResource[] = [
  {
    slug: 'humor-flavors',
    title: 'Humor Flavors',
    description: 'Create, update, delete, and inspect the flavor definitions used by your caption prompt chains.',
    mode: 'crud',
    tableCandidates: ['humor_flavors'],
  },
  {
    slug: 'humor-flavor-steps',
    title: 'Humor Flavor Steps',
    description: 'Create, edit, delete, and reorder the ordered steps that make up each humor flavor.',
    mode: 'crud',
    tableCandidates: ['humor_flavor_steps'],
  },
  {
    slug: 'captions',
    title: 'Generated Captions',
    description: 'Read captions produced by a specific humor flavor and review output quality.',
    mode: 'read',
    tableCandidates: ['captions'],
  },
  {
    slug: 'images',
    title: 'Test Images',
    description: 'Read and manage image rows that can be used to test a humor flavor against a known set of inputs.',
    mode: 'crud',
    tableCandidates: ['images'],
    supportsImageUpload: true,
  },
]

export function getResourceBySlug(slug: string) {
  return ADMIN_RESOURCES.find((resource) => resource.slug === slug)
}
