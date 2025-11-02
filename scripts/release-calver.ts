#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

/**
 * CalVer Release Script
 * Format: YYYY.MM.MICRO
 * Example: 2025.10.1, 2025.10.2, 2025.11.1
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env --allow-run scripts/release-calver.ts           # Run release process
 *   deno run --allow-read --allow-write --allow-env --allow-run scripts/release-calver.ts --dry-run  # Preview what would be done
 *   deno run --allow-read --allow-write --allow-env --allow-run scripts/release-calver.ts -d         # Same as --dry-run
 */

import { join } from '@std/path/join'

// Parse command line arguments
const isDryRun = Deno.args.includes('--dry-run') || Deno.args.includes('-d')

const PACKAGE_JSON = join(import.meta.dirname!, '../package.json')

/**
 * Parse command string into command and args, handling quoted strings
 */
const parseCommand = (cmd: string): { command: string; args: string[] } => {
  const args: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i]
    if ((char === '"' || char === "'") && (i === 0 || cmd[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      } else {
        current += char
      }
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current) {
    args.push(current)
  }

  return { command: args[0], args: args.slice(1) }
}

/**
 * Execute shell command and return output
 */
const exec = async (cmd: string, options: { skipDryRun?: boolean } = {}) => {
  if (isDryRun && options.skipDryRun !== true) {
    console.log(`[DRY RUN] Would execute: ${cmd}`)
    return ''
  }
  try {
    // Handle commands with && (e.g., "git push && git push --tags")
    if (cmd.includes(' && ')) {
      const commands = cmd.split(' && ')
      for (const subCmd of commands) {
        await exec(subCmd.trim(), { skipDryRun: true })
      }
      return ''
    }

    const { command, args } = parseCommand(cmd)

    const process = new Deno.Command(command, {
      args,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    })

    const { code } = await process.output()
    if (code !== 0) {
      console.error(`Command failed: ${cmd} (exit code: ${code})`)
      Deno.exit(1)
    }
    return ''
  } catch (error) {
    console.error(`Command failed: ${cmd}`, error)
    Deno.exit(1)
  }
}

/**
 * Execute shell command silently and return output
 */
const execSilent = async (cmd: string): Promise<string> => {
  try {
    const { command, args } = parseCommand(cmd)

    const process = new Deno.Command(command, {
      args,
      stdout: 'piped',
      stderr: 'piped',
    })

    const { code, stdout } = await process.output()
    if (code !== 0) {
      return ''
    }
    return new TextDecoder().decode(stdout).trim()
  } catch {
    return ''
  }
}

/**
 * Parse CalVer version string
 */
const parseCalVer = (version: string) => {
  const match = version.match(/^(\d{4})\.(\d{1,2})\.(\d+)$/)
  if (!match) return null
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    micro: parseInt(match[3], 10),
  }
}

/**
 * Calculate next CalVer version
 */
const getNextVersion = (currentVersion: string): string => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 0-indexed

  const parsed = parseCalVer(currentVersion)

  if (!parsed) {
    // If current version is not CalVer (e.g., migrating from semver)
    console.log(
      `Current version "${currentVersion}" is not CalVer format. Starting with ${currentYear}.${currentMonth}.1`,
    )
    return `${currentYear}.${currentMonth}.1`
  }

  // If same month/year, increment micro
  if (parsed.year === currentYear && parsed.month === currentMonth) {
    return `${currentYear}.${currentMonth}.${parsed.micro + 1}`
  }

  // New month or year, reset micro to 0
  return `${currentYear}.${currentMonth}.0`
}

/**
 * Check if git signing key is configured
 */
const hasSigningKey = async (): Promise<boolean> => {
  const signingKey = await execSilent('git config --get user.signingkey')
  return signingKey.length > 0
}

/**
 * Main release process
 */
const main = async () => {
  if (isDryRun) {
    console.log('🗓️  CalVer Release Process (DRY RUN MODE)\n')
    console.log('⚠️  This is a dry run. No changes will be made.\n')
  } else {
    console.log('🗓️  CalVer Release Process\n')
  }

  // Check for uncommitted changes
  const status = await execSilent('git status --porcelain')
  if (status) {
    console.error('❌ Error: You have uncommitted changes. Please commit or stash them first.')
    Deno.exit(1)
  }

  // Read current version
  const pkgText = Deno.readTextFileSync(PACKAGE_JSON)
  const pkg = JSON.parse(pkgText)
  const currentVersion = pkg.version
  const nextVersion = getNextVersion(currentVersion)

  console.log(`📦 Current version: ${currentVersion}`)
  console.log(`📦 Next version: ${nextVersion}\n`)

  // Update package.json
  if (isDryRun) {
    console.log('[DRY RUN] Would update package.json version to:', nextVersion)
    console.log('[DRY RUN] Would write:', JSON.stringify({ ...pkg, version: nextVersion }, null, 2))
    console.log('')
  } else {
    pkg.version = nextVersion
    Deno.writeTextFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n')
    console.log('✅ Updated package.json\n')
  }

  // Run prerelease hook (tests)
  console.log('🧪 Running prerelease tests...')
  await exec('pnpm test')
  if (!isDryRun) {
    console.log('✅ Tests passed\n')
  } else {
    console.log('[DRY RUN] Tests would be run here\n')
  }

  // Run version hook (generate static site)
  console.log('🏗️  Generating static site...')
  await exec('pnpm generate')
  if (!isDryRun) {
    console.log('✅ Site generated\n')
  } else {
    console.log('[DRY RUN] Site generation would be run here\n')
  }

  // Stage all changes
  console.log('📋 Staging changes...')
  await exec('git add -A')
  if (!isDryRun) {
    console.log('✅ Changes staged\n')
  } else {
    console.log('[DRY RUN] Would stage all changes\n')
  }

  // Create signed commit
  const shouldSign = await hasSigningKey()
  const commitMessage = `Release v${nextVersion}`
  const commitCmd = shouldSign
    ? `git commit -S -m "${commitMessage}"`
    : `git commit -m "${commitMessage}"`

  console.log(`📝 Creating commit: "${commitMessage}"${shouldSign ? ' (signed)' : ''}`)
  await exec(commitCmd)
  if (!isDryRun) {
    console.log('✅ Commit created\n')
  } else {
    console.log('[DRY RUN] Would create commit\n')
  }

  // Create git tag
  console.log(`🏷️  Creating tag: v${nextVersion}`)
  await exec(`git tag v${nextVersion}`)
  if (!isDryRun) {
    console.log('✅ Tag created\n')
  } else {
    console.log('[DRY RUN] Would create tag\n')
  }

  // Push changes and tags
  console.log('⬆️  Pushing to remote...')
  await exec('git push && git push --tags')
  if (!isDryRun) {
    console.log('✅ Pushed to remote\n')
  } else {
    console.log('[DRY RUN] Would push changes and tags\n')
  }

  // Deploy preview
  console.log('🚀 Deploying preview...')
  await exec('pnpm deploy:preview')
  if (!isDryRun) {
    console.log('✅ Preview deployed\n')
  } else {
    console.log('[DRY RUN] Would deploy preview\n')
  }

  if (isDryRun) {
    console.log(`🎉 Dry run completed! Would release v${nextVersion}`)
    console.log('   Run without --dry-run to execute the release.')
  } else {
    console.log(`🎉 Release v${nextVersion} completed successfully!`)
  }
}

main()
