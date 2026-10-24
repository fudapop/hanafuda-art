/**
 * Copy public ranking fields from `users/*` into `leaderboard/{uid}` and delete
 * `email` from every user document.
 *
 * The Admin SDK bypasses security rules. Dry-run is the default; pass `--apply` to write.
 * Do not log profile documents — they may still contain email addresses.
 *
 * Run this after the new Firestore rules are deployed, from packages/frontend:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     pnpm backfill:leaderboard
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     pnpm backfill:leaderboard -- --apply
 *
 * The service account needs Cloud Datastore User (or Firebase Admin) on project `new-hanafuda`.
 * Re-running is safe: leaderboard docs are replaced, and deleting a missing email is skipped.
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { FieldPath, FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { buildLeaderboardEntry } from '../app/utils/leaderboard.ts'

const PAGE_SIZE = 200
const BATCH_LIMIT = 400
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'new-hanafuda'

async function main() {
  const apply = process.argv.includes('--apply')

  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  })

  const db = getFirestore()
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    projectId: PROJECT_ID,
    scanned: 0,
    leaderboardWrites: 0,
    emailDeletes: 0,
    missingUid: 0,
  }

  let lastId: string | undefined

  for (;;) {
    let page = db.collection('users').orderBy(FieldPath.documentId()).limit(PAGE_SIZE)
    if (lastId) page = page.startAfter(lastId)

    const snap = await page.get()
    if (snap.empty) break

    let batch = db.batch()
    let ops = 0

    const flush = async () => {
      if (!apply || ops === 0) {
        batch = db.batch()
        ops = 0
        return
      }
      await batch.commit()
      batch = db.batch()
      ops = 0
    }

    for (const userDoc of snap.docs) {
      summary.scanned += 1
      const data = userDoc.data()
      const storedUid = typeof data.uid === 'string' ? data.uid.trim() : ''
      const uid = storedUid || userDoc.id.replace(/^u_/, '')

      if (!uid) {
        summary.missingUid += 1
        continue
      }

      if (Object.prototype.hasOwnProperty.call(data, 'email')) {
        summary.emailDeletes += 1
        if (apply) {
          batch.update(userDoc.ref, { email: FieldValue.delete() })
          ops += 1
        }
      }

      const entry = buildLeaderboardEntry({
        uid,
        username: typeof data.username === 'string' ? data.username : undefined,
        avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
        isGuest: data.isGuest === true,
        record: data.record,
        designs: data.designs,
        lastUpdated:
          typeof data.lastUpdated?.toDate === 'function'
            ? data.lastUpdated.toDate()
            : data.lastUpdated,
      })

      if (entry) {
        summary.leaderboardWrites += 1
        if (apply) {
          batch.set(db.collection('leaderboard').doc(uid), {
            ...entry,
            lastUpdated: Timestamp.fromDate(entry.lastUpdated),
          })
          ops += 1
        }
      }

      if (ops >= BATCH_LIMIT) await flush()
    }

    await flush()
    lastId = snap.docs.at(-1)?.id
    if (snap.size < PAGE_SIZE) break
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'leaderboard backfill failed'
  console.error(message)
  process.exit(1)
})
