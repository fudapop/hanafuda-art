#!/usr/bin/env node

/**
 * CalVer Release Script
 * Format: YYYY.MM.MICRO
 * Example: 2025.10.1, 2025.10.2, 2025.11.1
 *
 * Usage:
 *   node release-calver.cjs           # Run release process
 *   node release-calver.cjs --dry-run  # Preview what would be done
 *   node release-calver.cjs -d         # Same as --dry-run
 */

const fs = require('fs')
const { execSync } = require('child_process')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run') || args.includes('-d')

const PACKAGE_JSON = path.join(__dirname, '../package.json')

/**
 * Execute shell command and return output
 */
const exec = (cmd, options = {}) => {
  if (isDryRun && options.skipDryRun !== true) {
    console.log(`[DRY RUN] Would execute: ${cmd}`)
    return ''
  }
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'inherit', ...options })
  } catch (error) {
    console.error(`Command failed: ${cmd}`, error)
    process.exit(1)
  }
}

/**
 * Execute shell command silently and return output
 */
const execSilent = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim()
  } catch {
    return ''
  }
}

/**
 * Parse CalVer version string
 */
const parseCalVer = (version) => {
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
const getNextVersion = (currentVersion) => {
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

  // New month or year, reset micro to 1
  return `${currentYear}.${currentMonth}.1`
}

/**
 * Check if git signing key is configured
 */
const hasSigningKey = () => {
  const signingKey = execSilent('git config --get user.signingkey')
  return signingKey.length > 0
}

/**
 * Main release process
 */
const main = () => {
  if (isDryRun) {
    console.log('🗓️  CalVer Release Process (DRY RUN MODE)\n')
    console.log('⚠️  This is a dry run. No changes will be made.\n')
  } else {
    console.log('🗓️  CalVer Release Process\n')
  }

  // Check for uncommitted changes
  const status = execSilent('git status --porcelain')
  if (status) {
    console.error('❌ Error: You have uncommitted changes. Please commit or stash them first.')
    process.exit(1)
  }

  // Read current version
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'))
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
    fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n')
    console.log('✅ Updated package.json\n')
  }

  // Run prerelease hook (tests)
  console.log('🧪 Running prerelease tests...')
  exec('pnpm test')
  if (!isDryRun) {
    console.log('✅ Tests passed\n')
  } else {
    console.log('[DRY RUN] Tests would be run here\n')
  }

  // Run version hook (generate static site)
  console.log('🏗️  Generating static site...')
  exec('pnpm generate')
  if (!isDryRun) {
    console.log('✅ Site generated\n')
  } else {
    console.log('[DRY RUN] Site generation would be run here\n')
  }

  // Stage all changes
  console.log('📋 Staging changes...')
  exec('git add -A')
  if (!isDryRun) {
    console.log('✅ Changes staged\n')
  } else {
    console.log('[DRY RUN] Would stage all changes\n')
  }

  // Create signed commit
  const shouldSign = hasSigningKey()
  const signFlag = shouldSign ? '-S' : ''
  const commitMessage = `Release v${nextVersion}`

  console.log(`📝 Creating commit: "${commitMessage}"${shouldSign ? ' (signed)' : ''}`)
  exec(`git commit ${signFlag} -m "${commitMessage}"`)
  if (!isDryRun) {
    console.log('✅ Commit created\n')
  } else {
    console.log('[DRY RUN] Would create commit\n')
  }

  // Create git tag
  console.log(`🏷️  Creating tag: v${nextVersion}`)
  exec(`git tag v${nextVersion}`)
  if (!isDryRun) {
    console.log('✅ Tag created\n')
  } else {
    console.log('[DRY RUN] Would create tag\n')
  }

  // Push changes and tags
  console.log('⬆️  Pushing to remote...')
  exec('git push && git push --tags')
  if (!isDryRun) {
    console.log('✅ Pushed to remote\n')
  } else {
    console.log('[DRY RUN] Would push changes and tags\n')
  }

  // Deploy preview
  console.log('🚀 Deploying preview...')
  exec('pnpm deploy:preview')
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
