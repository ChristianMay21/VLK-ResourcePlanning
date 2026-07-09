'use client'

import { useRouter } from 'next/navigation'
import UtilizationRing from '@/components/UtilizationRing/UtilizationRing'
import WorkItemDetail from '@/components/WorkItemDetail/WorkItemDetail'
import EmployeeDetail from '@/components/EmployeeDetail/EmployeeDetail'
import { useDrawer } from '@/context/DrawerContext'
import styles from './ProjectTeam.module.scss'

type TeamMemberData = {
  id: string
  name: string
  color: string | null
  roles: string[]
  rate: number | null
  totalHours: number
  totalCost: number
  utilPct: number
}

type ProjectTeamProps = {
  projectId: string
  members: TeamMemberData[]
}

function fmtMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export default function ProjectTeam(props: ProjectTeamProps) {
  const { setDrawer } = useDrawer()
  const router = useRouter()

  function openAssignToProject() {
    setDrawer({
      component: WorkItemDetail,
      componentProps: {
        workItemId: props.projectId,
        workItemType: 'project',
        onAssignmentChange: () => router.refresh(),
      },
    })
  }

  function openEmployee(employeeId: string) {
    setDrawer({ component: EmployeeDetail, componentProps: { employeeId } })
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <button type="button" className={styles.assignBtn} onClick={openAssignToProject}>
          + ASSIGN TO PROJECT
        </button>
      </div>
      {props.members.length > 0 ? (
        <div className={styles.list}>
          {props.members.map(member => (
            <div key={member.id} className={styles.row}>
              <button
                type="button"
                className={styles.avatarBtn}
                onClick={() => openEmployee(member.id)}
              >
                <UtilizationRing
                  size="sm"
                  pct={member.utilPct}
                  name={member.name}
                  avatarColor={member.color ?? '#9a9484'}
                  windowWeeks={4}
                />
              </button>
              <div className={styles.info}>
                <button
                  type="button"
                  className={styles.nameBtn}
                  onClick={() => openEmployee(member.id)}
                >
                  {member.name}
                </button>
                <div className={styles.meta}>
                  {member.roles.join(', ')}
                  {member.rate != null && (
                    <span className={styles.rate}>${member.rate}/hr</span>
                  )}
                </div>
              </div>
              <span className={styles.hours}>
                {member.totalHours} hrs
                {member.totalCost > 0 && <> · {fmtMoney(member.totalCost)}</>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No one assigned yet.</p>
      )}
    </div>
  )
}
