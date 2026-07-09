'use client'

import { useRouter } from 'next/navigation'
import WorkItemDetail from '@/components/WorkItemDetail/WorkItemDetail'
import TaskForm from '@/components/TaskForm/TaskForm'
import { useDrawer } from '@/context/DrawerContext'
import { formatDateRange, getInitials } from '@/lib/dateUtils'
import styles from './InternalWorkList.module.scss'

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

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Internal Work</h1>
        <p className={styles.subtitle}>
          Internal, non-billable work that still counts against an employee&apos;s weekly bandwidth — no client budget is tracked here.
        </p>
      </div>

      {props.categories.length === 0 ? (
        <div className={styles.empty}>
          No internal work categories yet. Add categories in Admin to get started.
        </div>
      ) : (
        props.categories.map(cat => (
          <div key={cat.id} className={styles.category}>
            <div className={styles.categoryHeader}>
              <h3 className={styles.categoryName}>{cat.name}</h3>
              <span className={styles.categoryMeta}>
                {cat.taskCount} task{cat.taskCount !== 1 ? 's' : ''}
                {cat.totalHours > 0 && <> &middot; {cat.totalHours} hrs total</>}
              </span>
              <button
                type="button"
                className={styles.addTaskBtn}
                onClick={() => openAddTask(cat)}
              >
                + ADD TASK
              </button>
            </div>

            <div className={styles.taskCard}>
              {cat.tasks.length === 0 ? (
                <div className={styles.noTasks}>No tasks in this category yet.</div>
              ) : (
                cat.tasks.map(task => (
                  <div
                    key={task.id}
                    className={styles.taskRow}
                    onClick={() => openTask(task.id)}
                  >
                    <div className={styles.taskLeft}>
                      <span className={styles.statusDot} data-status={task.status} />
                      <span className={styles.taskName}>{task.name}</span>
                      <span className={styles.taskDates}>{formatDateRange(task.startDate, task.endDate)}</span>
                    </div>
                    <div className={styles.taskRight}>
                      {task.avatars.length > 0 && (
                        <div className={styles.avatarStack}>
                          {task.avatars.map((av, i) => (
                            <span
                              key={i}
                              className={styles.avatar}
                              style={av.color ? { '--avatar-color': av.color } as React.CSSProperties : undefined}
                              title={av.name}
                            >
                              {getInitials(av.name)}
                            </span>
                          ))}
                        </div>
                      )}
                      {task.totalHours > 0 && (
                        <span className={styles.taskHours}>{task.totalHours} hrs</span>
                      )}
                      <button
                        type="button"
                        className={styles.assignBtn}
                        onClick={e => { e.stopPropagation(); openTask(task.id) }}
                      >
                        + ASSIGN
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
