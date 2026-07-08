import type { CollectionConfig } from 'payload'

export const Employees: CollectionConfig = {
  slug: 'employees',
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
      name: 'maximumHours',
      type: 'number',
      required: true,
      defaultValue: 40,
    },
  ],
}
