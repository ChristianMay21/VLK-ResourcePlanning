---
name: create-component
description: create a boilerplate react component as a starting point for a new component
allowed-tools: Bash(pnpm run create-component)
---

Run `pnpm run create-component` to create the boilerplate React for a new component - this should ALWAYS be used for new components. You may make modifications afterward - ONLY IF REQUESTED BY THE USER - but carefully avoid complexity unless absolutely necessary. Prompt the user for advice if you're not sure. Unless otherwise requested, the folder name passed in (which represents a subfolder of src/components/) should just be `.`. Example execution: `pnpm run create-component ComponentName .`
