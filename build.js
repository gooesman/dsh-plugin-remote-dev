#!/usr/bin/env node

/**
 * Simple build script - copies source to lib directory
 * For production, you might want to add bundling/transpilation
 */

import { copyFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'

const srcDir = join(import.meta.dirname, 'src')
const libDir = join(import.meta.dirname, 'lib')

async function build() {
  console.log('Building dsh-plugin-remote-dev...')

  // Create lib directories
  await mkdir(join(libDir, 'host'), { recursive: true })
  await mkdir(join(libDir, 'client'), { recursive: true })
  await mkdir(join(libDir, 'types'), { recursive: true })
  await mkdir(join(libDir, 'types', 'host'), { recursive: true })
  await mkdir(join(libDir, 'types', 'client'), { recursive: true })

  // Copy host files
  const hostFiles = await readdir(join(srcDir, 'host'))
  for (const file of hostFiles) {
    if (file.endsWith('.js')) {
      await copyFile(join(srcDir, 'host', file), join(libDir, 'host', file))
      console.log('  Copied host/' + file)
    }
  }

  // Copy client files
  const clientFiles = await readdir(join(srcDir, 'client'))
  for (const file of clientFiles) {
    if (file.endsWith('.js')) {
      await copyFile(join(srcDir, 'client', file), join(libDir, 'client', file))
      console.log('  Copied client/' + file)
    }
  }

  // Create type definitions
  await mkdir(join(libDir, 'types'), { recursive: true })
  await writeFile(join(libDir, 'types', 'index.d.ts'), `
export * from './host'
export * from './client'
`)

  await writeFile(join(libDir, 'types', 'host', 'index.d.ts'), `
export declare function apply(ctx: any): any
export default { apply }
`)

  await writeFile(join(libDir, 'types', 'client', 'index.d.ts'), `
export declare function apply(ctx: any): any
export default { apply }
`)

  console.log('Build complete!')
}

// Simple file write helper
async function writeFile(path, content) {
  const { writeFile } = await import('fs/promises')
  return writeFile(path, content)
}

build().catch(err => {
  console.error('Build failed:', err)
  process.exit(1)
})
