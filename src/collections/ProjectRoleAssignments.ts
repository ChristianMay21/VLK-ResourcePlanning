import type { CollectionConfig } from 'payload'

export const ProjectRoleAssignments: CollectionConfig = {
  slug: 'project-role-assignments',
  fields: [
    {
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      required: true,
    },
    {
      name: 'employee',
      type: 'relationship',
      relationTo: 'employees',
      required: true,
    },
    {
      name: 'allocatedHours',
      type: 'number',
      required: true,
    },
  ],
}
