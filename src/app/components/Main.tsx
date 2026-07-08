'use client'

import React, { useState } from 'react'
import styles from './Main.module.scss'

interface MainProps {}

const Main: React.FC<MainProps> = (props) => {
  return <div className={styles.main}></div>
}

export default Main
