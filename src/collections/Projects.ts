import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
    },
    {
      name: 'sector',
      type: 'relationship',
      relationTo: 'sectors',
    },
    {
      name: 'budget',
      type: 'number',
    },
    {
      name: 'isComplete',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'phases',
      type: 'relationship',
      relationTo: 'project-phases',
      hasMany: true,
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
    },
  ],
}
