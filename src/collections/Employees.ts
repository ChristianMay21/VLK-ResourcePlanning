import type { CollectionConfig } from 'payload'

export const Employees: CollectionConfig = {
  slug: 'employees',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'jobTitle',
      type: 'text',
    },
    {
      name: 'maximumHours',
      type: 'number',
      required: true,
      defaultValue: 40,
    },
    {
      name: 'manager',
      type: 'relationship',
      relationTo: 'employees',
    },
    {
      name: 'color',
      type: 'text',
    },
    {
      name: 'skills',
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
      name: 'sectorExperience',
      type: 'array',
      fields: [
        {
          name: 'sector',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}
