import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import type { GameSaveRecord } from '~~/types/profile'

/**
 * Game saves sync adapter for Firestore
 * Collection: game_saves
 * Document ID: ${uid}_${saveKey}
 */
export interface GameSavesSyncAdapter {
  name: string

  /**
   * Pull all saves for a user from Firestore
   */
  pull(uid: string): Promise<GameSaveRecord[]>

  /**
   * Push a single save to Firestore
   */
  push(save: GameSaveRecord): Promise<boolean>

  /**
   * Remove a save from Firestore
   */
  remove(uid: string, saveKey: string): Promise<boolean>

  /**
   * Check if Firestore is available
   */
  isAvailable(): Promise<boolean>
}

export function useGameSavesSyncAdapter(): GameSavesSyncAdapter {
  const db = getFirestore()

  return {
    name: 'firestore-game-saves',

    async pull(uid: string): Promise<GameSaveRecord[]> {
      try {
        const savesRef = collection(db, 'game_saves')
        const q = query(savesRef, where('uid', '==', uid))
        const snapshot = await getDocs(q)

        const saves: GameSaveRecord[] = []
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data()
          // Convert Firestore Timestamp to Date
          const timestamp =
            data.timestamp instanceof Timestamp
              ? data.timestamp.toDate()
              : data.timestamp?.toDate?.() || new Date(data.timestamp)

          saves.push({
            id: data.id || docSnapshot.id,
            uid: data.uid,
            saveKey: data.saveKey,
            gameState: data.gameState,
            timestamp,
            gameId: data.gameId,
            mode: data.mode || 'single', // Default to 'single' for legacy saves
            p1: data.p1 || null,
            p2: data.p2 || null,
            activePlayer: data.activePlayer || null,
          } as GameSaveRecord)
        })

        return saves
      } catch (error) {
        console.error('Firestore game saves pull error:', error)
        throw error
      }
    },

    async push(save: GameSaveRecord): Promise<boolean> {
      try {
        const docRef = doc(db, 'game_saves', `${save.uid}_${save.saveKey}`)

        // Convert Date to Firestore Timestamp for storage
        const firestoreData = {
          id: `${save.uid}_${save.saveKey}`,
          uid: save.uid,
          saveKey: save.saveKey,
          gameState: save.gameState,
          timestamp:
            save.timestamp instanceof Date ? Timestamp.fromDate(save.timestamp) : save.timestamp,
          gameId: save.gameId,
          mode: save.mode,
          p1: save.p1 || null,
          p2: save.p2 || null,
          activePlayer: save.activePlayer || null,
        }

        await setDoc(docRef, firestoreData, { merge: true })
        return true
      } catch (error) {
        console.error('Firestore game saves push error:', error)
        return false
      }
    },

    async remove(uid: string, saveKey: string): Promise<boolean> {
      try {
        const saveId = `${uid}_${saveKey}`
        const docRef = doc(db, 'game_saves', saveId)
        await deleteDoc(docRef)
        return true
      } catch (error) {
        console.error('Firestore game saves remove error:', error)
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
  }
}
