import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { workItemType, workItemId, employeeId, roleId, hours, description } = body

  if (!workItemType || !workItemId || !employeeId || !roleId || hours == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const relationTo = workItemType === 'project' ? 'projects'
    : workItemType === 'phase' ? 'project-phases'
    : 'tasks'

  const payload = await getPayload({ config: await config })

  const assignment = await payload.create({
    collection: 'assignments',
    data: {
      workItem: { relationTo, value: workItemId },
      employee: employeeId,
      role: roleId,
      hours: Number(hours),
      description: description ?? undefined,
    },
    overrideAccess: true,
  })

  return NextResponse.json(assignment, { status: 201 })
}
