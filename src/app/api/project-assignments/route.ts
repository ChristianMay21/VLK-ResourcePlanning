import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const payload = await getPayload({ config: await config })
  const project = await payload.findByID({
    collection: 'projects',
    id: projectId,
    depth: 2,
    overrideAccess: true,
  })

  const assignments = (project.roleAssignments ?? []).filter(
    (a): a is Exclude<typeof a, string> => typeof a === 'object' && a !== null
  )

  return NextResponse.json(assignments)
}

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config: await config })
  const body = await request.json()
  const { projectId, roleId, employeeId, allocatedHours } = body

  const assignment = await payload.create({
    collection: 'project-role-assignments',
    data: { role: roleId, employee: employeeId, allocatedHours },
    overrideAccess: true,
  })

  const project = await payload.findByID({
    collection: 'projects',
    id: projectId,
    overrideAccess: true,
  })
  const currentIds = (project.roleAssignments ?? []).map(a => (typeof a === 'string' ? a : a.id))

  await payload.update({
    collection: 'projects',
    id: projectId,
    data: { roleAssignments: [...currentIds, assignment.id] },
    overrideAccess: true,
  })

  return NextResponse.json(assignment, { status: 201 })
}
