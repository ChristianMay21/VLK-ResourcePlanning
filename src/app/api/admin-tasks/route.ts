import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { ProjectPhase, Task } from '@/payload-types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = body.name?.trim()
  const startDate: string = body.startDate
  const endDate: string = body.endDate
  const phaseId: string | undefined = body.phaseId
  const categoryId: string | undefined = body.categoryId

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!startDate || !endDate) return NextResponse.json({ error: 'Start and end date required' }, { status: 400 })
  if (!phaseId && !categoryId) return NextResponse.json({ error: 'phaseId or categoryId required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  // Validate task dates fall within parent phase bounds
  if (phaseId) {
    const parentPhase = await payload.findByID({
      collection: 'project-phases',
      id: phaseId,
      depth: 0,
      overrideAccess: true,
    }).catch(() => null) as ProjectPhase | null

    if (parentPhase) {
      const phaseStart = parentPhase.startDate.slice(0, 10)
      const phaseEnd = parentPhase.endDate.slice(0, 10)
      if (startDate < phaseStart) {
        return NextResponse.json({ error: `Start date cannot be before phase start (${phaseStart})` }, { status: 400 })
      }
      if (endDate > phaseEnd) {
        return NextResponse.json({ error: `End date cannot be after phase end (${phaseEnd})` }, { status: 400 })
      }
    }
  }

  const task = await payload.create({
    collection: 'tasks',
    data: {
      name,
      startDate,
      endDate,
      ...(phaseId ? { phase: phaseId } : {}),
      ...(categoryId ? { category: categoryId } : {}),
    },
    overrideAccess: true,
  })

  if (phaseId) {
    const phase = await payload.findByID({
      collection: 'project-phases',
      id: phaseId,
      depth: 0,
      overrideAccess: true,
    }) as ProjectPhase

    const existingTaskIds = (phase.tasks ?? []).map(
      (t: string | Task) => (typeof t === 'string' ? t : t.id),
    )

    await payload.update({
      collection: 'project-phases',
      id: phaseId,
      data: { tasks: [...existingTaskIds, task.id] },
      overrideAccess: true,
    })
  }

  return NextResponse.json(task, { status: 201 })
}
