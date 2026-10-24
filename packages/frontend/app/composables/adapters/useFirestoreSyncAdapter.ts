import {
  deleteField,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import type { SyncAdapter, PlayerProfile } from '~/types/profile'
import { buildLeaderboardEntry } from '~/utils/leaderboard'
import { sanitizeFirestoreData } from '~/utils/profile'

/**
 * @fileoverview Firestore sync adapter for remote profile storage.
 *
 * Private data lives at `users/u_{uid}` and is readable only by that user.
 * A public `leaderboard/{uid}` snapshot is written in the same push so Rankings
 * and multiplayer can show a name, avatar, and record without reading email.
 */
export function useFirestoreSyncAdapter(): SyncAdapter {
  const db = getFirestore()

  return {
    name: 'firestore',

    async pull(uid: string): Promise<PlayerProfile | null> {
      try {
        const docRef = doc(db, 'users', `u_${uid}`)
        const snapshot = await getDoc(docRef)

        if (!snapshot.exists()) {
          return null
        }

        const data = snapshot.data()

        // Sanitize Firestore data (handles Timestamps, etc.)
        return await sanitizeFirestoreData(data, uid, '')
      } catch (error) {
        console.error('Firestore pull error:', error)
        throw error
      }
    },

    async push(profile: PlayerProfile): Promise<boolean> {
      try {
        const userRef = doc(db, 'users', `u_${profile.uid}`)
        const updatedAt =
          profile.lastUpdated instanceof Date ? profile.lastUpdated : new Date(profile.lastUpdated)

        // Email stays in Firebase Auth and IndexedDB. deleteField() is required in this
        // same write so an older document that still has email passes the security rules.
        const firestoreData: Record<string, unknown> = {
          uid: profile.uid,
          email: deleteField(),
          avatar: profile.avatar,
          username: profile.username,
          record: profile.record,
          lastUpdated: Timestamp.fromDate(updatedAt),
          designs: {
            unlocked: profile.designs.unlocked,
            liked: profile.designs.liked,
          },
          settings: profile.settings,
          flags: profile.flags,
          stats: profile.stats,
        }

        // Only include isGuest if it's explicitly true
        if (profile.isGuest === true) {
          firestoreData.isGuest = true
        }

        await setDoc(userRef, firestoreData, { merge: true })

        const entry = buildLeaderboardEntry({ ...profile, lastUpdated: updatedAt })
        if (!entry) return false

        // Replace the public doc so dropped fields cannot linger.
        await setDoc(doc(db, 'leaderboard', profile.uid), {
          ...entry,
          lastUpdated: Timestamp.fromDate(entry.lastUpdated),
        })
        return true
      } catch (error) {
        console.error('Firestore push error:', error)
        return false
      }
    },

    async isAvailable(): Promise<boolean> {
      try {
        // Simple check - can be enhanced with network detection
        return typeof window !== 'undefined' && navigator.onLine
      } catch {
        return false
      }
    },

    // Optional: Real-time sync via Firestore listeners
    subscribe(uid: string, callback: (profile: PlayerProfile) => void): () => void {
      const docRef = doc(db, 'users', `u_${uid}`)

      const unsubscribe = onSnapshot(
        docRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            const profile = await sanitizeFirestoreData(data, uid, '')
            callback(profile)
          }
        },
        (error) => {
          console.error('Firestore subscription error:', error)
        },
      )

      return unsubscribe
    },

    // Custom conflict resolution for Firestore
    async resolve(local: PlayerProfile, remote: PlayerProfile): Promise<PlayerProfile> {
      // Firestore-specific resolution logic
      // For now, use LWW but this can be customized
      if (local.lastUpdated > remote.lastUpdated) {
        return local
      } else if (remote.lastUpdated > local.lastUpdated) {
        return remote
      }

      // If timestamps are equal, merge intelligently
      return {
        ...remote,
        ...local,
        record: {
          coins: Math.max(local.record.coins, remote.record.coins),
          win: Math.max(local.record.win, remote.record.win),
          loss: Math.max(local.record.loss, remote.record.loss),
          draw: Math.max(local.record.draw, remote.record.draw),
        },
        designs: {
          unlocked: Array.from(new Set([...local.designs.unlocked, ...remote.designs.unlocked])),
          liked: Array.from(new Set([...local.designs.liked, ...remote.designs.liked])),
        },
        lastUpdated: new Date(), // New merge timestamp
      }
    },
  }
}
