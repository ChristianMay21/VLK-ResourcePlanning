import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Employee, InternalWorkCategory, Task } from '@/payload-types'
import InternalWorkList from '@/components/InternalWorkList/InternalWorkList'
import { deriveStatus } from '@/lib/dateUtils'

type TaskAvatar = { name: string; color: string | null }

type TaskRow = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'complete'
  avatars: TaskAvatar[]
  totalHours: number
}

type CategoryGroup = {
  id: string
  name: string
  taskCount: number
  totalHours: number
  tasks: TaskRow[]
}

export const dynamic = 'force-dynamic'

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
      depth: 1,
      limit: 10000,
      overrideAccess: true,
    }),
  ])

  // Build per-task: hours total and avatar list (from assignment employees)
  type TaskMeta = { totalHours: number; avatars: TaskAvatar[] }
  const metaByTask: Record<string, TaskMeta> = {}

  for (const a of assignments) {
    const wv = a.workItem.value
    const taskId = typeof wv === 'string' ? wv : (wv as { id: string })?.id
    if (!taskId) continue
    if (!metaByTask[taskId]) metaByTask[taskId] = { totalHours: 0, avatars: [] }
    metaByTask[taskId].totalHours += a.hours
    const emp = a.employee
    if (typeof emp === 'object' && emp !== null) {
      const e = emp as Employee
      const alreadyAdded = metaByTask[taskId].avatars.some(av => av.name === e.name)
      if (!alreadyAdded) {
        metaByTask[taskId].avatars.push({ name: e.name, color: e.color ?? null })
      }
    }
  }

  // Group tasks by category
  const tasksByCategory: Record<string, TaskRow[]> = {}
  for (const task of tasks as Task[]) {
    const catVal = task.category
    const catId = catVal ? (typeof catVal === 'string' ? catVal : (catVal as InternalWorkCategory).id) : null
    if (!catId) continue
    if (!tasksByCategory[catId]) tasksByCategory[catId] = []
    const meta = metaByTask[task.id] ?? { totalHours: 0, avatars: [] }
    tasksByCategory[catId].push({
      id: task.id,
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      status: deriveStatus(task.startDate, task.endDate, task.completed),
      avatars: meta.avatars,
      totalHours: meta.totalHours,
    })
  }

  const categoryGroups: CategoryGroup[] = (categories as InternalWorkCategory[]).map(cat => {
    const catTasks = tasksByCategory[cat.id] ?? []
    const totalHours = catTasks.reduce((sum, t) => sum + t.totalHours, 0)
    return {
      id: cat.id,
      name: cat.name,
      taskCount: catTasks.length,
      totalHours,
      tasks: catTasks,
    }
  })

  return <InternalWorkList categories={categoryGroups} />
}
