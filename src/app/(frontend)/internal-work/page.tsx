import { getPayload } from 'payload'
import config from '@/payload.config'
import type { InternalWorkCategory, Task } from '@/payload-types'
import InternalWorkList from '@/components/InternalWorkList/InternalWorkList'

type TaskRow = {
  id: string
  name: string
  startDate: string
  endDate: string
  completed: boolean
  assignmentCount: number
}

type CategoryGroup = {
  id: string
  name: string
  tasks: TaskRow[]
}

export default async function InternalWorkPage() {
  const payload = await getPayload({ config: await config })

  const [{ docs: categories }, { docs: tasks }, { docs: assignments }] = await Promise.all([
    payload.find({ collection: 'internal-work-categories', limit: 200, sort: 'name', overrideAccess: true }),
    payload.find({
      collection: 'tasks',
      where: { category: { exists: true } },
      limit: 2000,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'assignments',
      where: { 'workItem.relationTo': { equals: 'tasks' } },
      limit: 10000,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  // Count assignments per task
  const assignmentCountByTask: Record<string, number> = {}
  for (const a of assignments) {
    const wv = a.workItem.value
    const taskId = typeof wv === 'string' ? wv : (wv as { id: string })?.id
    if (taskId) assignmentCountByTask[taskId] = (assignmentCountByTask[taskId] ?? 0) + 1
  }

  // Group tasks by category
  const tasksByCategory: Record<string, TaskRow[]> = {}
  for (const task of tasks as Task[]) {
    const catVal = task.category
    const catId = catVal ? (typeof catVal === 'string' ? catVal : (catVal as InternalWorkCategory).id) : null
    if (!catId) continue
    if (!tasksByCategory[catId]) tasksByCategory[catId] = []
    tasksByCategory[catId].push({
      id: task.id,
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      completed: task.completed ?? false,
      assignmentCount: assignmentCountByTask[task.id] ?? 0,
    })
  }

  const categoryGroups: CategoryGroup[] = (categories as InternalWorkCategory[]).map(cat => ({
    id: cat.id,
    name: cat.name,
    tasks: tasksByCategory[cat.id] ?? [],
  }))

  return (
    <main style={{ padding: '32px 40px' }}>
      <h1 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '28px', marginBottom: '32px' }}>
        Internal Work
      </h1>
      <InternalWorkList categories={categoryGroups} />
    </main>
  )
}
