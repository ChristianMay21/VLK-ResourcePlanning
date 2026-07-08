import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'maximumHours',
      type: 'number',
      required: true,
      defaultValue: 40,
    },
  ],
}
