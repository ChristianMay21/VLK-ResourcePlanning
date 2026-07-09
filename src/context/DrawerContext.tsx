'use client'

import { createContext, useContext, useState } from 'react'
import type EmployeeDetail from '@/components/EmployeeDetail/EmployeeDetail'
import type WorkItemDetail from '@/components/WorkItemDetail/WorkItemDetail'
import type EmployeeForm from '@/components/EmployeeForm/EmployeeForm'
import type ProjectForm from '@/components/ProjectForm/ProjectForm'
import type PhaseForm from '@/components/PhaseForm/PhaseForm'
import type TaskForm from '@/components/TaskForm/TaskForm'

// DrawerState is a discriminated union — the type IS the registry.
export type DrawerState =
  | { component: typeof EmployeeDetail; componentProps: React.ComponentProps<typeof EmployeeDetail> }
  | { component: typeof WorkItemDetail; componentProps: React.ComponentProps<typeof WorkItemDetail> }
  | { component: typeof EmployeeForm; componentProps: React.ComponentProps<typeof EmployeeForm> }
  | { component: typeof ProjectForm; componentProps: React.ComponentProps<typeof ProjectForm> }
  | { component: typeof PhaseForm; componentProps: React.ComponentProps<typeof PhaseForm> }
  | { component: typeof TaskForm; componentProps: React.ComponentProps<typeof TaskForm> }

type DrawerContextType = {
  drawer: DrawerState | null
  setDrawer: (drawer: DrawerState | null) => void
}

const DrawerContext = createContext<DrawerContextType | null>(null)

export function DrawerProvider(props: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerState | null>(null)

  return (
    <DrawerContext.Provider value={{ drawer, setDrawer }}>
      {props.children}
    </DrawerContext.Provider>
  )
}

export function useDrawer() {
  const context = useContext(DrawerContext)
  if (!context) throw new Error('useDrawer must be used within a DrawerProvider')
  return context
}
