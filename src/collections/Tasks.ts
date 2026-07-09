import type { CollectionConfig } from 'payload'

export const Tasks: CollectionConfig = {
  slug: 'tasks',
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
      name: 'phase',
      type: 'relationship',
      relationTo: 'project-phases',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'internal-work-categories',
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
      name: 'completed',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'dismissedSuggestions',
      type: 'array',
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}
