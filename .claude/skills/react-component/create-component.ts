import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const [componentName, componentPath] = process.argv.slice(2)

if (!componentName || !componentPath) {
  console.error('Usage: npx ts-node create-component.ts <ComponentName> <path>')
  console.error('Example: npx ts-node create-component.ts Button ui/buttons')
  process.exit(1)
}

const skillDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(skillDir, '../../..')
const outputDir = path.join(projectRoot, 'src', 'components', componentPath, componentName)

const boilerplateTsx = fs.readFileSync(path.join(skillDir, 'boilerplate.tsx'), 'utf-8')
const boilerplateScss = fs.readFileSync(path.join(skillDir, 'boilerplate.module.scss'), 'utf-8')

const tsx = boilerplateTsx.replaceAll('BoilerplateComponent', componentName)
const scss = boilerplateScss.replaceAll('BoilerplateComponent', componentName)

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, `${componentName}.tsx`), tsx)
fs.writeFileSync(path.join(outputDir, `${componentName}.module.scss`), scss)

console.log(`Created ${componentName} at src/components/${componentPath}/${componentName}/`)
