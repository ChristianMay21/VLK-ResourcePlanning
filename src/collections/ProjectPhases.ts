import type { CollectionConfig } from 'payload'

export const ProjectPhases: CollectionConfig = {
  slug: 'project-phases',
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
      name: 'startDate',
      type: 'date',
      required: true,
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
    },
    {
      name: 'requiredSkills',
      type: 'array',
      fields: [
        {
          name: 'skill',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'budgetAllocation',
      type: 'number',
    },
    {
      name: 'tasks',
      type: 'relationship',
      relationTo: 'tasks',
      hasMany: true,
    },
  ],
}
