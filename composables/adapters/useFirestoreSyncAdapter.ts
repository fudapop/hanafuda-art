import { doc, getDoc, setDoc, getFirestore, onSnapshot } from 'firebase/firestore'
import type { SyncAdapter, PlayerProfile } from '~/types/profile'
import { sanitizeFirestoreData } from '~/utils/profile'

/**
 * Firestore sync adapter for remote profile storage
 * Collection: users/{u_{uid}}
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
        const docRef = doc(db, 'users', `u_${profile.uid}`)

        // Convert Date to Firestore Timestamp for storage
        // Remove undefined values which Firestore doesn't accept
        const firestoreData: Record<string, any> = {
          uid: profile.uid,
          email: profile.email,
          avatar: profile.avatar,
          username: profile.username,
          record: profile.record,
          lastUpdated: profile.lastUpdated,
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

        await setDoc(docRef, firestoreData, { merge: true })
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
