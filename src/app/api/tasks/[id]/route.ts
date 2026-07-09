import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const body = await req.json()
  const payload = await getPayload({ config: await config })

  const data: Record<string, unknown> = {}
  if (body.completed !== undefined) data.completed = Boolean(body.completed)
  if (body.dismissedSuggestions !== undefined) data.dismissedSuggestions = body.dismissedSuggestions

  const updated = await payload.update({
    collection: 'tasks',
    id,
    data,
    overrideAccess: true,
  })

  return NextResponse.json(updated)
}
