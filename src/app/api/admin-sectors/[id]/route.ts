import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee, Project } from '@/payload-types'

type Params = { id: string }

export async function PATCH(req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const payload = await getPayload({ config: await config })

  // Get current sector name before updating
  const current = await payload.findByID({ collection: 'sectors', id, overrideAccess: true })
  const oldName = (current as { name: string }).name

  const updated = await payload.update({ collection: 'sectors', id, data: { name: name.trim() }, overrideAccess: true })

  // Cascade rename to employee sectorExperience
  if (oldName !== name.trim()) {
    const { docs: employees } = await payload.find({ collection: 'employees', limit: 500, overrideAccess: true })
    for (const emp of employees) {
      const sectors = ((emp as Employee).sectorExperience ?? [])
      const idx = sectors.findIndex(s => s.sector === oldName)
      if (idx >= 0) {
        const newSectors = sectors.map(s => s.sector === oldName ? { ...s, sector: name.trim() } : s)
        await payload.update({ collection: 'employees', id: emp.id, data: { sectorExperience: newSectors }, overrideAccess: true })
      }
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<Params> }) {
  const { id } = await context.params
  const payload = await getPayload({ config: await config })

  // Check if any project uses this sector
  const { totalDocs: projectCount } = await payload.find({
    collection: 'projects',
    where: { sector: { equals: id } },
    limit: 1,
    overrideAccess: true,
  })

  if (projectCount > 0) {
    return NextResponse.json({ error: 'Sector is in use by projects', inUse: true }, { status: 409 })
  }

  // Check if any employee has this sector (by name lookup)
  const sector = await payload.findByID({ collection: 'sectors', id, overrideAccess: true })
  const sectorName = (sector as { name: string }).name

  const { docs: employees } = await payload.find({ collection: 'employees', limit: 500, overrideAccess: true })
  const empUsing = employees.some((emp: unknown) => {
    const e = emp as Employee
    return (e.sectorExperience ?? []).some(s => s.sector === sectorName)
  })

  if (empUsing) {
    return NextResponse.json({ error: 'Sector is referenced by employees', inUse: true }, { status: 409 })
  }

  await payload.delete({ collection: 'sectors', id, overrideAccess: true })
  return NextResponse.json({ deleted: true })
}
