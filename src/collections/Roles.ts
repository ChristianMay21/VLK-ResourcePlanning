import type { CollectionConfig } from 'payload'

export const Roles: CollectionConfig = {
  slug: 'roles',
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
      name: 'allowedOn',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['projects', 'project-phases', 'tasks', 'internal'],
      options: [
        { label: 'Project', value: 'projects' },
        { label: 'Phase', value: 'project-phases' },
        { label: 'Task', value: 'tasks' },
        { label: 'Internal', value: 'internal' },
      ],
    },
  ],
}
