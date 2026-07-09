import type { CollectionConfig } from 'payload'

export const Assignments: CollectionConfig = {
  slug: 'assignments',
  fields: [
    {
      name: 'workItem',
      type: 'relationship',
      relationTo: ['projects', 'project-phases', 'tasks'],
      required: true,
    },
    {
      name: 'employee',
      type: 'relationship',
      relationTo: 'employees',
      required: true,
    },
    {
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      required: true,
    },
    {
      name: 'hours',
      type: 'number',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
    },
  ],
}
