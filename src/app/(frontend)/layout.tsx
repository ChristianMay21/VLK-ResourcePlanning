import React from 'react'
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import Nav from '@/components/Nav/Nav'
import Drawer from '@/components/Drawer/Drawer'
import { DrawerProvider } from '@/context/DrawerContext'
import './styles.scss'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata = {
  description: 'Resource planning for architecture firms.',
  title: 'Resource Planner',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const fontClasses = [newsreader.variable, ibmPlexSans.variable, ibmPlexMono.variable].join(' ')

  return (
    <html lang="en" className={fontClasses}>
      <body>
        <DrawerProvider>
          <Nav />
          <main>{props.children}</main>
          <Drawer />
        </DrawerProvider>
      </body>
    </html>
  )
}
