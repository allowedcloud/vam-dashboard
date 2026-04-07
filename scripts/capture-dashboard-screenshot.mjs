import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const defaultUrl = 'http://localhost:3002'
const defaultOutput = path.resolve('.artifacts/screenshots/dashboard.png')
const defaultExecutablePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'

const url = process.env.DASHBOARD_SCREENSHOT_URL || defaultUrl
const outputPath = path.resolve(process.env.DASHBOARD_SCREENSHOT_OUTPUT || defaultOutput)
const executablePath = process.env.BRAVE_EXECUTABLE_PATH || defaultExecutablePath
const width = Number.parseInt(process.env.DASHBOARD_SCREENSHOT_WIDTH || '1920', 10)
const height = Number.parseInt(process.env.DASHBOARD_SCREENSHOT_HEIGHT || '1080', 10)

async function main() {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  let browser

  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
    })
  }
  catch (error) {
    process.stderr.write(`Brave launch failed, falling back to bundled Chromium: ${error instanceof Error ? error.message : String(error)}\n`)
    browser = await chromium.launch({
      headless: true,
    })
  }

  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    })

    let lastError
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 })
        await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(1500)
        lastError = undefined
        break
      }
      catch (error) {
        lastError = error
        await page.waitForTimeout(1000)
      }
    }

    if (lastError) {
      throw lastError
    }

    await page.screenshot({
      path: outputPath,
      fullPage: true,
    })

    process.stdout.write(`${outputPath}\n`)
  }
  finally {
    await browser.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`)
  process.exitCode = 1
})
