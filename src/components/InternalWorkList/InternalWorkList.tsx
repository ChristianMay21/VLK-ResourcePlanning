'use client'

import { useRouter } from 'next/navigation'
import WorkItemDetail from '@/components/WorkItemDetail/WorkItemDetail'
import TaskForm from '@/components/TaskForm/TaskForm'
import { useDrawer } from '@/context/DrawerContext'
import { formatDateRange } from '@/lib/dateUtils'
import styles from './InternalWorkList.module.scss'

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

type InternalWorkListProps = {
  categories: CategoryGroup[]
}

export default function InternalWorkList(props: InternalWorkListProps) {
  const { setDrawer } = useDrawer()
  const router = useRouter()

  function openTask(taskId: string) {
    setDrawer({ component: WorkItemDetail, componentProps: { workItemId: taskId, workItemType: 'task' } })
  }

  function openAddTask(cat: CategoryGroup) {
    setDrawer({
      component: TaskForm,
      componentProps: { categoryId: cat.id, categoryName: cat.name, onSave: () => router.refresh() },
    })
  }

  if (props.categories.length === 0) {
    return (
      <div className={styles.empty}>
        No internal work categories yet. Add categories in Admin to get started.
      </div>
    )
  }

  return (
    <div className={styles.root}>
      {props.categories.map(cat => (
        <section key={cat.id} className={styles.category}>
          <div className={styles.categoryHeader}>
            <h2 className={styles.categoryName}>{cat.name}</h2>
            <span className={styles.taskCount}>{cat.tasks.length} task{cat.tasks.length !== 1 ? 's' : ''}</span>
            <button
              type="button"
              className={styles.addTaskBtn}
              onClick={() => openAddTask(cat)}
            >
              + ADD TASK
            </button>
          </div>
          {cat.tasks.length === 0 ? (
            <div className={styles.noTasks}>No tasks in this category yet.</div>
          ) : (
            <div className={styles.taskList}>
              {cat.tasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  className={styles.taskRow}
                  data-complete={task.completed ? 'true' : undefined}
                  onClick={() => openTask(task.id)}
                >
                  <span className={styles.taskStatus} data-complete={task.completed ? 'true' : undefined} />
                  <span className={styles.taskName}>{task.name}</span>
                  <span className={styles.taskDates}>{formatDateRange(task.startDate, task.endDate)}</span>
                  {task.assignmentCount > 0 && (
                    <span className={styles.taskAssigned}>{task.assignmentCount} assigned</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
