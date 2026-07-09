import type { CollectionConfig } from 'payload'

export const InternalWorkCategories: CollectionConfig = {
  slug: 'internal-work-categories',
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
  ],
}
