'use client'

import { createContext, useContext, useState } from 'react'
import type ProjectDetail from '@/components/ProjectDetail/ProjectDetail'

export type ModalState = {
  component: typeof ProjectDetail
  componentProps: React.ComponentProps<typeof ProjectDetail>
}

type ModalContextType = {
  modal: ModalState | null
  setModal: (modal: ModalState | null) => void
}

const ModalContext = createContext<ModalContextType | null>(null)

export function ModalProvider(props: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null)

  return (
    <ModalContext.Provider value={{ modal, setModal }}>
      {props.children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) throw new Error('useModal must be used within a ModalProvider')
  return context
}
