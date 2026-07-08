import type { GlobalConfig } from 'payload'

export const Settings: GlobalConfig = {
  slug: 'settings',
  fields: [
    // Email added by default
    // Add more fields as needed
    {
      name: 'testSetting',
      type: 'text',
    },
  ],
}
