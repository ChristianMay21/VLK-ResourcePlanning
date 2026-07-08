import React from 'react'
import Nav from '@/components/Nav/Nav'
import Modal from '@/components/Modal/Modal'
import { ModalProvider } from '@/context/ModalContext'
import './styles.scss'

export const metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Project Management Portal',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <ModalProvider>
          <Nav />
          <main>{children}</main>
          <Modal />
        </ModalProvider>
      </body>
    </html>
  )
}
