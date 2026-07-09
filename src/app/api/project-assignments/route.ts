import { headers as getHeaders } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const payload = await getPayload({ config: await config })
  const project = await payload.findByID({ collection: 'projects', id: projectId, depth: 1 })

  const assignments = (project.roleAssignments ?? []).filter(
    (a): a is Exclude<typeof a, string> => typeof a === 'object' && a !== null
  )

  return NextResponse.json(assignments)
}

export async function POST(request: NextRequest) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { projectId, roleId, employeeId, allocatedHours } = body

  const assignment = await payload.create({
    collection: 'project-role-assignments',
    data: { role: roleId, employee: employeeId, allocatedHours },
  })

  const project = await payload.findByID({ collection: 'projects', id: projectId })
  const currentIds = (project.roleAssignments ?? []).map(a => (typeof a === 'string' ? a : a.id))

  await payload.update({
    collection: 'projects',
    id: projectId,
    data: { roleAssignments: [...currentIds, assignment.id] },
  })

  return NextResponse.json(assignment, { status: 201 })
}
