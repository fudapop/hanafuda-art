/**
 * Content Translation Script
 *
 * Automatically translates English markdown content files to multiple target locales
 * using AI translation while preserving markdown formatting, links, and metadata.
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-content.ts
 *
 * Examples:
 *   # Check what would be translated (dry run)
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-content.ts --dry-run
 *
 *   # Translate specific directories to multiple locales
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-content.ts --include "content/en/policies,content/en/changelog" --locales "ja,pl"
 *
 *   # Translate announcements to Japanese only
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-content.ts --include "content/en/announcements" --locales "ja"
 *
 *   # Translate all content with preview
 *   deno run --allow-read --allow-write --allow-env --allow-net scripts/translate-content.ts --dry-run --include "content/en" --locales "ja,pl"
 */

import { parseArgs } from 'jsr:@std/cli/parse-args'
import { existsSync } from 'jsr:@std/fs/exists'
import { dirname, join } from 'jsr:@std/path'
import { googleAI } from 'npm:@genkit-ai/googleai'
import { genkit, z } from 'npm:genkit'
import {
  formatLocaleList,
  getSupportedTargetLocales,
  setupWorkingDirectory,
  TranslationMode,
  validateTargetLocales,
} from './translation-utils.ts'

// Initialize Genkit with the Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0.1,
  }),
})

const translateContentFlow = ai.defineFlow(
  {
    name: 'translateContentFlow',
    inputSchema: z.object({
      content: z.string(),
      languages: z.array(z.string()).min(1),
    }),
    outputSchema: z.object({
      translations: z.record(z.string(), z.string()), // language code -> translated content
    }),
  },
  async (input: { content: string; languages: string[] }) => {
    const languageList = input.languages.join(', ')
    const prompt = `
    You are a professional translator.
    Translate the provided markdown content from English into the following languages: ${languageList}.
    Ensure each translation is contextually correct and does not change the meaning of the original content.
    
    Return the translations as a JSON object where each key is the language code and the value is the translated content.
    
    Expected format:
    {
      "translations": {
        "${input.languages[0]}": "translated content in ${input.languages[0]}",
        ${input.languages
          .slice(1)
          .map((lang: string) => `"${lang}": "translated content in ${lang}"`)
          .join(',\n        ')}
      }
    }
    
    Content to translate: ${input.content}`

    // Create dynamic schema based on the input languages
    const translationsSchema = z.object(
      input.languages.reduce(
        (acc: Record<string, z.ZodString>, lang: string) => {
          acc[lang] = z.string().describe(`Translation in ${lang}`)
          return acc
        },
        {} as Record<string, z.ZodString>,
      ),
    )

    const { output } = await ai.generate({
      prompt,
      output: {
        schema: z.object({
          translations: translationsSchema,
        }),
      },
    })

    if (!output) throw new Error('Failed to translate content')

    return output
  },
)

// Parse command line arguments
function parseCliArgs() {
  const defaultTargetLocales = getSupportedTargetLocales()

  const args = parseArgs(Deno.args, {
    boolean: ['dry-run', 'help'],
    string: ['include', 'locales'],
    alias: {
      h: 'help',
      i: 'include',
      l: 'locales',
    },
    default: {
      include: 'content/en',
      locales: defaultTargetLocales.join(','),
    },
  })

  const isDryRun = args['dry-run']
  const showHelp = args.help

  // Parse directories
  const contentDirectories = args.include
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  // Parse target locales
  const targetLanguages = args.locales
    .split(',')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Validation
  if (contentDirectories.length === 0) {
    console.error('❌ Error: At least one directory path must be specified.')
    Deno.exit(1)
  }

  // Setup working directory
  setupWorkingDirectory()

  // Validate directories exist and are English source directories
  for (const dir of contentDirectories) {
    if (!dir.startsWith('content/en')) {
      console.error(`❌ Error: Directory must be under 'content/en' directory: ${dir}`)
      console.error('   The script translates from English source files in content/en/')
      Deno.exit(1)
    }
    if (!existsSync(dir, { isDirectory: true })) {
      // log current working directory
      console.error(`❌ Error: Current working directory: ${Deno.cwd()}`)
      console.error(`❌ Error: Directory does not exist: ${dir}`)
      Deno.exit(1)
    }
  }

  // Validate target locales
  const validation = validateTargetLocales(targetLanguages, TranslationMode.CONTENT)
  if (!validation.isValid) {
    for (const error of validation.errors) {
      console.error(`❌ Error: ${error}`)
    }
    Deno.exit(1)
  }

  return {
    isDryRun,
    showHelp,
    contentDirectories,
    targetLanguages,
  }
}

// Configuration from CLI arguments will be loaded in main function

/**
 * Show help information
 */
function showHelpMessage() {
  const supportedLocales = formatLocaleList(TranslationMode.CONTENT)
  const defaultTargetLocales = getSupportedTargetLocales()

  console.log(`
📖 Content Translation Script (Deno Version)

Efficiently translates English files from content/en/ to multiple target locales
using a single API call per file to minimize costs and input token usage.

Directory Structure:
  content/
    en/           ← English source files
      policies/
      announcements/
      changelog/
    ja/           ← Japanese translations
    pl/           ← Polish translations

Usage: deno run --allow-read --allow-write --allow-env --allow-net translate-content.ts [options]

Options:
  --dry-run                     Run in dry-run mode (show what would be done without executing)
  --help, -h                    Show this help message
  --include, -i <directories>   Comma-separated list of directories to scan (default: content/en)
  --locales, -l <languages>     Comma-separated list of target locales (default: ${defaultTargetLocales.join(',')})

Examples:
  # Use defaults (content/en → ${defaultTargetLocales.join(',')})
  deno run --allow-read --allow-write --allow-env --allow-net translate-content.ts

  # Translate specific directories to multiple locales
  deno run --allow-read --allow-write --allow-env --allow-net translate-content.ts --include "content/en/policies,content/en/changelog" --locales "${defaultTargetLocales.join(',')}"

  # Short form with preview
  deno run --allow-read --allow-write --allow-env --allow-net translate-content.ts --dry-run -i "content/en/announcements" -l "${defaultTargetLocales[0]}"

  # Translate all content to specific locales
  deno run --allow-read --allow-write --allow-env --allow-net translate-content.ts -i "content/en" -l "${defaultTargetLocales.join(',')}"

Supported Locales:
  ${supportedLocales}
`)
}

interface TranslationResult {
  file: string
  language: string
  success: boolean
  isUpdate: boolean // true if updating existing translation, false if new
  error?: string
}

interface TranslationSummary {
  totalFiles: number
  totalTranslations: number
  newTranslations: number
  updatedTranslations: number
  successful: number
  failed: number
  skipped: number
  results: TranslationResult[]
}

/**
 * Get all English source files (.md) that need translation
 */
async function getFilesToTranslate(contentDirectories: string[]): Promise<string[]> {
  const filesToTranslate: string[] = []

  for (const dir of contentDirectories) {
    try {
      // Recursively find all .md files in the directory
      const files = await findMarkdownFiles(dir)
      filesToTranslate.push(...files)
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error)
    }
  }

  return filesToTranslate
}

/**
 * Recursively find all markdown files in a directory
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  try {
    for await (const entry of Deno.readDir(dir)) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory) {
        // Recursively search subdirectories
        const subFiles = await findMarkdownFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile && entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error)
  }

  return files
}

/**
 * Translation status enum
 */
const TranslationStatus = {
  NOT_EXISTS: 'not_exists',
  UP_TO_DATE: 'up_to_date',
  NEEDS_UPDATE: 'needs_update',
} as const

type TranslationStatus = (typeof TranslationStatus)[keyof typeof TranslationStatus]

/**
 * Check translation status for a file
 */
async function getTranslationStatus(
  filePath: string,
  language: string,
): Promise<TranslationStatus> {
  const translatedPath = getTranslatedPath(filePath, language)

  try {
    // Check if translated file exists
    await Deno.stat(translatedPath)

    // Get modification times
    const originalStats = await Deno.stat(filePath)
    const translatedStats = await Deno.stat(translatedPath)

    // If original file is newer than translation, needs update
    if (
      originalStats.mtime &&
      translatedStats.mtime &&
      originalStats.mtime > translatedStats.mtime
    ) {
      return TranslationStatus.NEEDS_UPDATE
    }

    return TranslationStatus.UP_TO_DATE
  } catch {
    return TranslationStatus.NOT_EXISTS
  }
}

/**
 * Get the target path for a translated file
 */
function getTranslatedPath(filePath: string, language: string): string {
  // Convert from content/en/... to content/{language}/...
  // Example: content/en/policies/privacy-policy.md → content/ja/policies/privacy-policy.md
  return filePath.replace('/en/', `/${language}/`)
}

/**
 * Ensure target directory exists for a translated file
 */
async function ensureTargetDirectoryExists(targetPath: string): Promise<void> {
  const targetDir = dirname(targetPath)
  try {
    await Deno.stat(targetDir)
  } catch {
    // Directory doesn't exist, create it
    await Deno.mkdir(targetDir, { recursive: true })
  }
}

/**
 * Translate a single file to multiple languages (or simulate in dry-run mode)
 */
async function translateFileToLanguages(
  filePath: string,
  languageActions: { language: string; isUpdate: boolean }[],
  isDryRun: boolean,
): Promise<TranslationResult[]> {
  const results: TranslationResult[] = []
  const dryRunPrefix = isDryRun ? '[DRY RUN] ' : ''

  // Initialize results
  for (const { language, isUpdate } of languageActions) {
    results.push({
      file: filePath,
      language,
      success: false,
      isUpdate,
    })
  }

  try {
    const languages = languageActions.map((la) => la.language)
    const languageList = languages.join(', ')
    console.log(`📄 ${dryRunPrefix}Translating ${filePath} to ${languageList}...`)

    if (isDryRun) {
      // In dry-run mode, simulate success without actually doing anything
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const { isUpdate } = languageActions[i]
        result.success = true
        const translatedPath = getTranslatedPath(filePath, result.language)
        const actionPast = isUpdate ? 'Updated' : 'Translated'
        console.log(`✅ ${dryRunPrefix}Would ${actionPast.toLowerCase()} to ${translatedPath}`)
      }
    } else {
      // Actual translation
      const content = await Deno.readTextFile(filePath)
      const translationResult = await translateContentFlow({
        content,
        languages,
      })

      // Write each translation and update results
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const { isUpdate } = languageActions[i]

        try {
          const translatedContent = translationResult.translations[result.language]
          if (!translatedContent) {
            throw new Error(`No translation returned for language: ${result.language}`)
          }

          const translatedPath = getTranslatedPath(filePath, result.language)
          await ensureTargetDirectoryExists(translatedPath)
          await Deno.writeTextFile(translatedPath, translatedContent)

          result.success = true
          const actionPast = isUpdate ? 'Updated' : 'Translated'
          console.log(`✅ Successfully ${actionPast.toLowerCase()} to ${translatedPath}`)
        } catch (writeError) {
          result.error = writeError instanceof Error ? writeError.message : String(writeError)
          console.error(`❌ Failed to write ${result.language} translation: ${result.error}`)
        }
      }
    }
  } catch (error) {
    // If the main translation fails, mark all results as failed
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`❌ ${dryRunPrefix}Failed to translate ${filePath}: ${errorMessage}`)

    for (const result of results) {
      result.error = errorMessage
    }
  }

  return results
}

/**
 * Main translation function
 */
async function translateContent(
  isDryRun: boolean,
  contentDirectories: string[],
  targetLanguages: string[],
): Promise<TranslationSummary> {
  const modeText = isDryRun ? ' (DRY RUN MODE)' : ''
  console.log(`🌍 Starting content translation process${modeText}...\n`)

  // Show current configuration
  console.log('📋 Configuration:')
  console.log(`   📁 Directories: ${contentDirectories.join(', ')}`)
  console.log(`   🌐 Target locales: ${targetLanguages.join(', ')}`)
  console.log('')

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE: No files will be modified. Showing what would happen.\n')
  }

  const summary: TranslationSummary = {
    totalFiles: 0,
    totalTranslations: 0,
    newTranslations: 0,
    updatedTranslations: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    results: [],
  }

  // Get all files that need translation
  const filesToTranslate = await getFilesToTranslate(contentDirectories)
  summary.totalFiles = filesToTranslate.length

  console.log(`📚 Found ${filesToTranslate.length} English markdown files`)
  console.log(`🗣️  Target locales: ${targetLanguages.join(', ')}\n`)

  if (filesToTranslate.length === 0) {
    console.log('💡 No .md files found to translate in the specified directories.')
    console.log(
      '   Make sure your English source files are in the content/en/ directory structure.',
    )
    return summary
  }

  // Process each file - group languages that need translation
  for (const filePath of filesToTranslate) {
    console.log(`\n📖 Processing: ${filePath}`)

    const languageActions: { language: string; isUpdate: boolean }[] = []

    // Check what needs to be done for each language
    for (const language of targetLanguages) {
      const status = await getTranslationStatus(filePath, language)

      switch (status) {
        case TranslationStatus.UP_TO_DATE:
          console.log(`✅ Translation for ${language} is up to date, skipping...`)
          summary.skipped++
          continue

        case TranslationStatus.NOT_EXISTS:
          console.log(`🆕 Will create new translation for ${language}`)
          languageActions.push({ language, isUpdate: false })
          break

        case TranslationStatus.NEEDS_UPDATE:
          console.log(`🔄 Will update outdated translation for ${language}`)
          languageActions.push({ language, isUpdate: true })
          break
      }
    }

    // If there are languages to translate, do them all at once
    if (languageActions.length > 0) {
      summary.totalTranslations += languageActions.length
      const results = await translateFileToLanguages(filePath, languageActions, isDryRun)

      // Process results
      for (const result of results) {
        summary.results.push(result)

        if (result.success) {
          summary.successful++
          if (result.isUpdate) {
            summary.updatedTranslations++
          } else {
            summary.newTranslations++
          }
        } else {
          summary.failed++
        }
      }

      // Add a small delay to avoid rate limiting (skip in dry-run)
      if (!isDryRun) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  return summary
}

/**
 * Print translation summary
 */
function printSummary(summary: TranslationSummary, isDryRun: boolean) {
  const modeText = isDryRun ? ' (DRY RUN)' : ''
  console.log('\n' + '='.repeat(50))
  console.log(`📊 TRANSLATION SUMMARY${modeText}`)
  console.log('='.repeat(50))

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE: The following operations would be performed:')
  }

  console.log(`📚 Total files processed: ${summary.totalFiles}`)
  console.log(`🔄 Total translations attempted: ${summary.totalTranslations}`)
  console.log(`🆕 New translations: ${summary.newTranslations}`)
  console.log(`🔄 Updated translations: ${summary.updatedTranslations}`)
  console.log(`⏭️  Skipped (up to date): ${summary.skipped}`)
  console.log(`✅ Successful: ${summary.successful}`)
  console.log(`❌ Failed: ${summary.failed}`)

  if (summary.failed > 0) {
    const failedText = isDryRun ? 'Would fail' : 'Failed'
    console.log(`\n❌ ${failedText} translations:`)
    summary.results
      .filter((r) => !r.success)
      .forEach((r) => {
        const action = r.isUpdate ? 'update' : 'translate'
        const prefix = isDryRun ? 'Would fail to' : 'Failed to'
        console.log(`   - ${prefix} ${action} ${r.file} (${r.language}): ${r.error}`)
      })
  }

  if (summary.successful > 0) {
    const successText = isDryRun ? 'Would perform' : 'Successful'
    console.log(`\n✅ ${successText} operations:`)
    summary.results
      .filter((r) => r.success)
      .forEach((r) => {
        const action = r.isUpdate ? '🔄 Updated' : '🆕 Created'
        const prefix = isDryRun ? 'Would ' : ''
        console.log(`   - ${prefix}${action.toLowerCase()} ${r.file} → ${r.language}`)
      })
  }

  const completeText = isDryRun
    ? 'Dry run complete! No files were modified.'
    : 'Translation process complete!'
  console.log(`\n🎉 ${completeText}`)
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse CLI arguments
    const { isDryRun, showHelp, contentDirectories, targetLanguages } = parseCliArgs()

    // Show help if requested
    if (showHelp) {
      showHelpMessage()
      return
    }

    const summary = await translateContent(isDryRun, contentDirectories, targetLanguages)
    printSummary(summary, isDryRun)
  } catch (error) {
    console.error('💥 Translation process failed:', error)
    Deno.exit(1)
  }
}

if (import.meta.main) {
  main().catch(console.error)
}
