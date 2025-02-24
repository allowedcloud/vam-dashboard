import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function bumpVersion() {
  const packagePath = path.join(process.cwd(), 'package.json')
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

  // Split version into major.minor.patch
  const [major, minor, patch] = pkg.version.split('.').map(Number)

  // Increment patch version
  pkg.version = `${major}.${minor}.${patch + 1}`

  // Write back to package.json
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2))

  // Update runtime config file with version and last update date
  const runtimeConfig = {
    version: pkg.version,
    lastUpdated: new Date().toISOString(),
  }

  fs.writeFileSync(
    path.join(process.cwd(), 'runtime.config.ts'),
    `export default defineAppConfig(${JSON.stringify(runtimeConfig, null, 2)})`,
  )
}

bumpVersion()
