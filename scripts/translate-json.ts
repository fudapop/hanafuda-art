/**
 * JSON Locale Translation Script
 *
 * Automatically translates missing keys from source JSON locale files to target locales
 * using AI translation while preserving JSON structure, placeholders, and technical terms.
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-json.ts
 *
 * Examples:
 *   # Check what would be translated (dry run)
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-json.ts --dry-run
 *
 *   # Translate missing keys from en-us to pl-pl only
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-json.ts --targets pl-pl
 *
 *   # Force update all keys (not just missing ones)
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-json.ts --force
 */

import { parseArgs } from 'jsr:@std/cli/parse-args'
import { existsSync } from 'jsr:@std/fs/exists'
import { googleAI } from 'npm:@genkit-ai/googleai'
import { genkit, z } from 'npm:genkit'
import {
  formatLocaleList,
  getDefaultSourceLocale,
  getLanguageName,
  getTargetLocaleFiles,
  setupWorkingDirectory,
  TranslationMode,
  validateTargetLocales,
} from './translation-utils.js'

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }

// Initialize Genkit with the Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0,
  }),
})

const translateJsonFlow = ai.defineFlow(
  {
    name: 'translateJsonFlow',
    inputSchema: z.object({
      sourceJson: z.record(z.any()),
      targetJson: z.record(z.any()).optional(),
      sourceLocale: z.string(),
      targetLocale: z.string(),
      missingKeys: z.array(z.string()),
    }),
    outputSchema: z.record(z.any()),
  },
  async (input) => {
    const { sourceJson, sourceLocale, targetLocale, missingKeys } = input

    // Extract only the missing key-value pairs from source
    const missingTranslations: JsonObject = {}
    for (const keyPath of missingKeys) {
      const value = getNestedValue(sourceJson, keyPath)
      if (value !== undefined) {
        setNestedValue(missingTranslations, keyPath, value)
      }
    }

    const sourceLanguageName = getLanguageName(sourceLocale)
    const targetLanguageName = getLanguageName(targetLocale)

    const prompt = `
You are a professional translator specializing in user interface localization.

Context: You are translating a JSON locale file from ${sourceLanguageName} (${sourceLocale}) to ${targetLanguageName} (${targetLocale}) for a Hanafuda Koi-Koi card game application.

Task: Translate ONLY the provided missing keys while maintaining:
- EXACT JSON structure and nesting
- Placeholder variables like {email}, {cost}, {current}, {max}, {creator}, etc.
- Special characters and emojis
- Technical terms (keep "Hanafuda", "Koi-Koi", "Yaku" untranslated)
- Contextual meaning appropriate for a card game interface

Source JSON (${sourceLanguageName}):
${JSON.stringify(missingTranslations, null, 2)}

Return a JSON object with the same structure containing the translations in ${targetLanguageName}.
Focus on natural, contextually appropriate translations for game UI elements.
`

    const { output } = await ai.generate({
      prompt,
    })

    if (!output) throw new Error('Failed to translate JSON content')

    return output
  },
)

const translateEntireJsonFlow = ai.defineFlow(
  {
    name: 'translateEntireJsonFlow',
    inputSchema: z.object({
      sourceJson: z.record(z.any()),
      sourceLocale: z.string(),
      targetLocale: z.string(),
    }),
    outputSchema: z.record(z.any()),
  },
  async (input) => {
    const { sourceJson, sourceLocale, targetLocale } = input

    const sourceLanguageName = getLanguageName(sourceLocale)
    const targetLanguageName = getLanguageName(targetLocale)

    const prompt = `
You are a professional translator specializing in user interface localization.

Context: You are translating an entire JSON locale file from ${sourceLanguageName} (${sourceLocale}) to ${targetLanguageName} (${targetLocale}) for a Hanafuda Koi-Koi card game application.

Task: Translate ALL text values while maintaining:
- EXACT JSON structure and nesting
- All object keys unchanged (do not translate keys, only values)
- Placeholder variables like {email}, {cost}, {current}, {max}, {creator}, etc.
- Special characters and emojis
- Technical terms (keep "Hanafuda", "Koi-Koi", "Yaku" untranslated)
- Contextual meaning appropriate for a card game interface

Source JSON (${sourceLanguageName}):
${JSON.stringify(sourceJson, null, 2)}

Return the complete JSON structure with all string values translated to ${targetLanguageName}.
Focus on natural, contextually appropriate translations for game UI elements.
`

    const { output } = await ai.generate({
      prompt,
    })

    if (!output) throw new Error('Failed to translate entire JSON content')

    return output
  },
)

// Parse command line arguments
function parseCliArgs() {
  const defaultTargetLocales = getTargetLocaleFiles()

  const args = parseArgs(Deno.args, {
    boolean: ['dry-run', 'help', 'force'],
    string: ['source', 'targets'],
    alias: {
      h: 'help',
      s: 'source',
      t: 'targets',
      f: 'force',
    },
    default: {
      source: getDefaultSourceLocale(TranslationMode.JSON),
      targets: defaultTargetLocales.join(','),
    },
  })

  const isDryRun = args['dry-run']
  const showHelp = args.help
  const forceUpdate = args.force
  const sourceLocale = args.source

  // Parse target locales
  const targetLocales = args.targets
    .split(',')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Setup working directory
  setupWorkingDirectory()

  // Validate source locale file exists
  const sourceFile = `i18n/locales/${sourceLocale}.json`
  if (!existsSync(sourceFile)) {
    console.error(`❌ Error: Source locale file does not exist: ${sourceFile}`)
    Deno.exit(1)
  }

  // Validate target locales
  const validation = validateTargetLocales(targetLocales, TranslationMode.JSON)
  if (!validation.isValid) {
    for (const error of validation.errors) {
      console.error(`❌ Error: ${error}`)
    }
    Deno.exit(1)
  }

  return {
    isDryRun,
    showHelp,
    forceUpdate,
    sourceLocale,
    targetLocales,
    sourceFile,
  }
}

// Configuration from CLI arguments will be loaded in main function

/**
 * Show help information
 */
function showHelpMessage() {
  const supportedLocales = formatLocaleList(TranslationMode.JSON)
  const defaultSource = getDefaultSourceLocale(TranslationMode.JSON)
  const defaultTargets = getTargetLocaleFiles()

  console.log(`
📖 JSON Locale Translation Script (Deno Version)

Translates missing keys from a source JSON locale file to target locale files,
maintaining JSON structure and preserving placeholders and technical terms.

Directory Structure:
  i18n/locales/
    en-us.json      ← English source file
    ja-jp.json      ← Japanese translations  
    pl-pl.json      ← Polish translations

Usage: deno run --allow-read --allow-write --allow-env --allow-net translate-json.ts [options]

Options:
  --dry-run                     Run in dry-run mode (show what would be done without executing)
  --help, -h                    Show this help message
  --source, -s <locale>         Source locale to translate from (default: ${defaultSource})
  --targets, -t <locales>       Comma-separated list of target locales (default: ${defaultTargets.join(',')})
  --force, -f                   Force update all keys, not just missing ones

Examples:
  # Use defaults (${defaultSource} → ${defaultTargets.join(',')}, missing keys only)
  deno run --allow-read --allow-write --allow-env --allow-net translate-json.ts

  # Translate to specific locales
  deno run --allow-read --allow-write --allow-env --allow-net translate-json.ts --targets "${defaultTargets.join(',')}"

  # Force update all keys (not just missing)
  deno run --allow-read --allow-write --allow-env --allow-net translate-json.ts --force

  # Dry run to preview changes
  deno run --allow-read --allow-write --allow-env --allow-net translate-json.ts --dry-run

Supported Locales:
  ${supportedLocales}
`)
}

interface TranslationResult {
  locale: string
  success: boolean
  missingKeysCount: number
  addedKeysCount: number
  error?: string
}

interface TranslationSummary {
  totalLocales: number
  successful: number
  failed: number
  totalMissingKeys: number
  totalAddedKeys: number
  results: TranslationResult[]
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: JsonObject, path: string): JsonValue {
  return path.split('.').reduce((current: JsonValue, key) => {
    return (current as JsonObject)?.[key]
  }, obj)
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj: JsonObject, path: string, value: JsonValue): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((current: JsonObject, key) => {
    if (!(key in current)) {
      current[key] = {}
    }
    return current[key] as JsonObject
  }, obj)
  target[lastKey] = value
}

/**
 * Find all missing keys by comparing source and target JSON structures
 */
function findMissingKeys(sourceObj: JsonObject, targetObj: JsonObject, prefix = ''): string[] {
  const missingKeys: string[] = []

  for (const key in sourceObj) {
    if (!Object.hasOwn(sourceObj, key)) continue

    const currentPath = prefix ? `${prefix}.${key}` : key

    if (!(key in targetObj)) {
      // Key is missing entirely
      missingKeys.push(currentPath)
    } else if (
      typeof sourceObj[key] === 'object' &&
      sourceObj[key] !== null &&
      !Array.isArray(sourceObj[key])
    ) {
      // Recursively check nested objects
      if (typeof targetObj[key] === 'object' && targetObj[key] !== null) {
        missingKeys.push(
          ...findMissingKeys(
            sourceObj[key] as JsonObject,
            targetObj[key] as JsonObject,
            currentPath,
          ),
        )
      } else {
        // Target has primitive where source has object
        missingKeys.push(currentPath)
      }
    }
    // If both are primitives and target exists, it's not missing
  }

  return missingKeys
}

/**
 * Find all keys (for force update mode)
 */
function findAllKeys(obj: JsonObject, prefix = ''): string[] {
  const keys: string[] = []

  for (const key in obj) {
    if (!Object.hasOwn(obj, key)) continue

    const currentPath = prefix ? `${prefix}.${key}` : key

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...findAllKeys(obj[key] as JsonObject, currentPath))
    } else {
      keys.push(currentPath)
    }
  }

  return keys
}

/**
 * Merge translated keys into target JSON
 */
function mergeTranslations(targetJson: JsonObject, translations: JsonObject): JsonObject {
  const result = JSON.parse(JSON.stringify(targetJson)) as JsonObject // Deep clone

  function mergeRecursive(target: JsonObject, source: JsonObject) {
    for (const key in source) {
      if (Object.hasOwn(source, key)) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          if (!(key in target) || typeof target[key] !== 'object') {
            target[key] = {}
          }
          mergeRecursive(target[key] as JsonObject, source[key] as JsonObject)
        } else {
          target[key] = source[key]
        }
      }
    }
  }

  mergeRecursive(result, translations)
  return result
}

/**
 * Translate missing keys for a target locale
 */
async function translateLocale(
  sourceJson: JsonObject,
  targetLocale: string,
  sourceLocale: string,
  isDryRun: boolean,
  forceUpdate: boolean,
): Promise<TranslationResult> {
  const result: TranslationResult = {
    locale: targetLocale,
    success: false,
    missingKeysCount: 0,
    addedKeysCount: 0,
  }

  const dryRunPrefix = isDryRun ? '[DRY RUN] ' : ''
  const targetFile = `i18n/locales/${targetLocale}.json`

  try {
    // Load existing target JSON (if exists)
    let targetJson: JsonObject = {}
    const targetFileExists = existsSync(targetFile)
    if (targetFileExists) {
      const targetContent = await Deno.readTextFile(targetFile)
      targetJson = JSON.parse(targetContent) as JsonObject
    }

    // Find missing keys
    const missingKeys =
      forceUpdate || !targetFileExists
        ? findAllKeys(sourceJson)
        : findMissingKeys(sourceJson, targetJson)

    result.missingKeysCount = missingKeys.length

    if (missingKeys.length === 0) {
      console.log(`✅ ${dryRunPrefix}${targetLocale}: No missing keys found`)
      result.success = true
      return result
    }

    console.log(`🔍 ${dryRunPrefix}${targetLocale}: Found ${missingKeys.length} missing keys`)
    if (isDryRun) {
      console.log(
        `   Keys that would be translated: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`,
      )
    }

    if (isDryRun) {
      // Simulate success in dry-run mode
      result.success = true
      result.addedKeysCount = missingKeys.length
      console.log(`✅ ${dryRunPrefix}Would add ${missingKeys.length} translations to ${targetFile}`)
      return result
    }

    // Perform actual translation
    let updatedJson: JsonObject

    if (!targetFileExists) {
      // Translate entire JSON for new file
      console.log(`🌐 Translating entire JSON from ${sourceLocale} to ${targetLocale}...`)

      updatedJson = await translateEntireJsonFlow({
        sourceJson,
        sourceLocale,
        targetLocale,
      })
    } else {
      // Translate only missing keys
      console.log(
        `🌐 Translating ${missingKeys.length} keys from ${sourceLocale} to ${targetLocale}...`,
      )

      const translationResult = await translateJsonFlow({
        sourceJson,
        targetJson,
        sourceLocale,
        targetLocale,
        missingKeys,
      })

      // Merge translations into target JSON
      updatedJson = mergeTranslations(targetJson, translationResult)
    }

    // Write the updated JSON file
    await Deno.writeTextFile(targetFile, JSON.stringify(updatedJson, null, 2) + '\n')

    result.success = true
    result.addedKeysCount = missingKeys.length
    console.log(`✅ Successfully added ${missingKeys.length} translations to ${targetFile}`)
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    console.error(`❌ ${dryRunPrefix}Failed to translate ${targetLocale}: ${result.error}`)
  }

  return result
}

/**
 * Main translation function
 */
async function translateJsonFiles(
  isDryRun: boolean,
  forceUpdate: boolean,
  sourceLocale: string,
  targetLocales: string[],
  sourceFile: string,
): Promise<TranslationSummary> {
  const modeText = isDryRun ? ' (DRY RUN MODE)' : ''
  const forceText = forceUpdate ? ' (FORCE UPDATE)' : ''
  console.log(`🌍 Starting JSON locale translation${forceText}${modeText}...\n`)

  // Show current configuration
  console.log('📋 Configuration:')
  console.log(`   📄 Source: ${sourceFile}`)
  console.log(`   🌐 Target locales: ${targetLocales.join(', ')}`)
  console.log(`   🔄 Mode: ${forceUpdate ? 'Force update all keys' : 'Add missing keys only'}`)
  console.log('')

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE: No files will be modified. Showing what would happen.\n')
  }

  const summary: TranslationSummary = {
    totalLocales: targetLocales.length,
    successful: 0,
    failed: 0,
    totalMissingKeys: 0,
    totalAddedKeys: 0,
    results: [],
  }

  // Load source JSON
  console.log(`📖 Loading source locale: ${sourceFile}`)
  const sourceContent = await Deno.readTextFile(sourceFile)
  const sourceJson = JSON.parse(sourceContent) as JsonObject

  // Process each target locale
  for (const targetLocale of targetLocales) {
    console.log(`\n🔄 Processing locale: ${targetLocale}`)

    const result = await translateLocale(
      sourceJson,
      targetLocale,
      sourceLocale,
      isDryRun,
      forceUpdate,
    )
    summary.results.push(result)
    summary.totalMissingKeys += result.missingKeysCount
    summary.totalAddedKeys += result.addedKeysCount

    if (result.success) {
      summary.successful++
    } else {
      summary.failed++
    }

    // Add a small delay to avoid rate limiting (skip in dry-run)
    if (!isDryRun && targetLocales.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return summary
}

/**
 * Print translation summary
 */
function printSummary(summary: TranslationSummary, isDryRun: boolean, forceUpdate: boolean) {
  const modeText = isDryRun ? ' (DRY RUN)' : ''
  const forceText = forceUpdate ? ' (FORCE UPDATE)' : ''
  console.log('\n' + '='.repeat(60))
  console.log(`📊 JSON TRANSLATION SUMMARY${forceText}${modeText}`)
  console.log('='.repeat(60))

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE: The following operations would be performed:')
  }

  console.log(`🌐 Total locales processed: ${summary.totalLocales}`)
  console.log(`🔍 Total missing keys found: ${summary.totalMissingKeys}`)
  console.log(`➕ Total keys that would be added: ${summary.totalAddedKeys}`)
  console.log(`✅ Successful: ${summary.successful}`)
  console.log(`❌ Failed: ${summary.failed}`)

  if (summary.failed > 0) {
    const failedText = isDryRun ? 'Would fail' : 'Failed'
    console.log(`\n❌ ${failedText} translations:`)
    summary.results
      .filter((r) => !r.success)
      .forEach((r) => {
        const prefix = isDryRun ? 'Would fail:' : 'Failed:'
        console.log(`   - ${prefix} ${r.locale}: ${r.error}`)
      })
  }

  if (summary.successful > 0) {
    const successText = isDryRun ? 'Would update' : 'Updated'
    console.log(`\n✅ ${successText} locales:`)
    summary.results
      .filter((r) => r.success)
      .forEach((r) => {
        const action = r.addedKeysCount > 0 ? `${r.addedKeysCount} keys added` : 'no changes needed'
        console.log(`   - ${r.locale}: ${action}`)
      })
  }

  const completeText = isDryRun
    ? 'Dry run complete! No files were modified.'
    : 'JSON translation process complete!'
  console.log(`\n🎉 ${completeText}`)
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse CLI arguments
    const { isDryRun, showHelp, forceUpdate, sourceLocale, targetLocales, sourceFile } =
      parseCliArgs()

    // Show help if requested
    if (showHelp) {
      showHelpMessage()
      return
    }

    const summary = await translateJsonFiles(
      isDryRun,
      forceUpdate,
      sourceLocale,
      targetLocales,
      sourceFile,
    )
    printSummary(summary, isDryRun, forceUpdate)
  } catch (error) {
    console.error('💥 JSON translation process failed:', error)
    Deno.exit(1)
  }
}

if (import.meta.main) {
  main().catch(console.error)
}
