'use client'

import { useState } from 'react'
import WorkItemDetail from '@/components/WorkItemDetail/WorkItemDetail'
import { useDrawer } from '@/context/DrawerContext'
import styles from './PhaseList.module.scss'
import { formatDateRange, getInitials } from '@/lib/dateUtils'

type AvatarData = {
  id: string
  name: string
  color: string | null
}

type TaskData = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'complete'
  requiredSkills: string[]
  avatars: AvatarData[]
}

type PhaseData = {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'complete'
  requiredSkills: string[]
  avatars: AvatarData[]
  tasks: TaskData[]
}

type PhaseListProps = {
  phases: PhaseData[]
  projectId: string
}

const STATUS_COLORS = {
  upcoming: '#9a9484',
  active: '#2c4a6e',
  complete: '#4a7c59',
}

const SKILL_CAP = 2

function SkillTags(props: { skills: string[] }) {
  const visible = props.skills.slice(0, SKILL_CAP)
  const overflow = props.skills.length - SKILL_CAP

  return (
    <>
      {visible.map(skill => (
        <span key={skill} className={styles.skillTag}>{skill}</span>
      ))}
      {overflow > 0 && (
        <span className={styles.skillTag} title={props.skills.slice(SKILL_CAP).join(', ')}>
          +{overflow}
        </span>
      )}
    </>
  )
}

function AvatarStack(props: { avatars: AvatarData[]; size?: number }) {
  const size = props.size ?? 24
  return (
    <div className={styles.avatarStack}>
      {props.avatars.map(av => (
        <span
          key={av.id}
          className={styles.avatar}
          style={{
            width: size,
            height: size,
            background: av.color ?? '#9a9484',
            fontSize: size * 0.42,
          }}
          title={av.name}
        >
          {getInitials(av.name)}
        </span>
      ))}
    </div>
  )
}

export default function PhaseList(props: PhaseListProps) {
  const { setDrawer } = useDrawer()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    props.phases.forEach(p => { initial[p.id] = true })
    return initial
  })

  function openPhase(phaseId: string) {
    setDrawer({ component: WorkItemDetail, componentProps: { workItemId: phaseId, workItemType: 'phase' } })
  }

  function openTask(taskId: string) {
    setDrawer({ component: WorkItemDetail, componentProps: { workItemId: taskId, workItemType: 'task' } })
  }

  return (
    <div className={styles.root}>
      {props.phases.map(phase => (
        <div key={phase.id} className={styles.phaseBlock}>
          <div className={styles.phaseRow} onClick={() => openPhase(phase.id)}>
            <div className={styles.rowLeft}>
              <button
                type="button"
                className={styles.chevron}
                data-open={expanded[phase.id] ? 'true' : undefined}
                onClick={e => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [phase.id]: !prev[phase.id] })) }}
                aria-label={expanded[phase.id] ? 'Collapse' : 'Expand'}
              >
                ▶
              </button>
              <span
                className={styles.statusDot}
                style={{ background: STATUS_COLORS[phase.status] }}
              />
              <span className={styles.phaseName}>{phase.name}</span>
              <span className={styles.dateRange}>{formatDateRange(phase.startDate, phase.endDate)}</span>
            </div>
            <div className={styles.rowRight}>
              <SkillTags skills={phase.requiredSkills} />
              <AvatarStack avatars={phase.avatars} size={24} />
              <button
                className={styles.assignLink}
                onClick={e => e.stopPropagation()}
                type="button"
              >
                + ASSIGN
              </button>
            </div>
          </div>
          {expanded[phase.id] && phase.tasks.map(task => (
            <div key={task.id} className={styles.taskRow} onClick={() => openTask(task.id)}>
              <div className={styles.rowLeft}>
                <span
                  className={styles.statusDot}
                  style={{ background: STATUS_COLORS[task.status], width: 6, height: 6 }}
                />
                <span className={styles.taskName}>{task.name}</span>
                <span className={styles.dateRange}>{formatDateRange(task.startDate, task.endDate)}</span>
              </div>
              <div className={styles.rowRight}>
                <SkillTags skills={task.requiredSkills} />
                <AvatarStack avatars={task.avatars} size={20} />
                <button
                  className={styles.assignLink}
                  onClick={e => e.stopPropagation()}
                  type="button"
                  style={{ fontSize: 10 }}
                >
                  + ASSIGN
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
