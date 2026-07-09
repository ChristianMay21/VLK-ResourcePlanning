import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const payload = await getPayload({ config: await config })

  const created = await payload.create({
    collection: 'employees',
    data: {
      name: body.name,
      jobTitle: body.jobTitle ?? undefined,
      manager: body.manager || undefined,
      maximumHours: body.maximumHours ?? 40,
      baseHourlyRate: body.baseHourlyRate ?? 150,
      color: body.color ?? undefined,
      skills: body.skills ?? [],
      sectorExperience: body.sectorExperience ?? [],
    },
    overrideAccess: true,
  })

  return NextResponse.json(created)
}
