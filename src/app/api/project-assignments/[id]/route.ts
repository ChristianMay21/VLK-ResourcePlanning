import { headers as getHeaders } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { roleId, employeeId, allocatedHours } = body

  const updated = await payload.update({
    collection: 'project-role-assignments',
    id,
    data: { role: roleId, employee: employeeId, allocatedHours },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const projectId = request.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  await payload.delete({ collection: 'project-role-assignments', id })

  const project = await payload.findByID({ collection: 'projects', id: projectId })
  const updatedIds = (project.roleAssignments ?? [])
    .map(a => (typeof a === 'string' ? a : a.id))
    .filter(assignmentId => assignmentId !== id)

  await payload.update({
    collection: 'projects',
    id: projectId,
    data: { roleAssignments: updatedIds },
  })

  return NextResponse.json({ success: true })
}
