import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

type AllowedOn = 'projects' | 'project-phases' | 'tasks'
const VALID_TYPES: AllowedOn[] = ['projects', 'project-phases', 'tasks']

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = body.name?.trim()
  const allowedOn: AllowedOn[] = (body.allowedOn ?? []).filter((v: string) => VALID_TYPES.includes(v as AllowedOn))

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (allowedOn.length === 0) return NextResponse.json({ error: 'At least one work item type required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  const { totalDocs } = await payload.find({
    collection: 'roles',
    where: { name: { equals: name } },
    limit: 1,
    overrideAccess: true,
  })
  if (totalDocs > 0) {
    return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 })
  }

  const role = await payload.create({ collection: 'roles', data: { name, allowedOn }, overrideAccess: true })
  return NextResponse.json(role, { status: 201 })
}
