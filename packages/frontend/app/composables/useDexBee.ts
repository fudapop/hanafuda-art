// Shared DexBee instance for the entire app (profiles, sync metadata, game saves)
// Ensures a single IndexedDB schema for 'newhanafuda' and prevents schema drift

type DexBeeDb = {
  table: (name: 'playerProfiles' | 'syncMetadata' | 'gameSaves') => any
}

let dbPromise: Promise<DexBeeDb> | null = null

export const getDexBeeDb = async (): Promise<DexBeeDb> => {
  if (dbPromise) return dbPromise

  dbPromise = (async () => {
    const { DexBee, defineSchema } = await import('dexbee-js')

    const schema = defineSchema({
      // Bump version when adding new tables or changing IndexedDB schema
      version: 5,
      tables: {
        playerProfiles: {
          schema: {
            uid: { type: 'string', required: true },
            email: { type: 'string' },
            avatar: { type: 'string', required: true },
            username: { type: 'string', required: true },
            record: { type: 'object', required: true },
            lastUpdated: { type: 'date', required: true },
            designs: { type: 'object', required: true },
            settings: { type: 'object' },
            flags: { type: 'object', required: true },
            isGuest: { type: 'boolean' },
            stats: { type: 'object' },
          },
          primaryKey: 'uid',
          indexes: [{ name: 'email_idx', keyPath: 'email', unique: false }],
        },
        syncMetadata: {
          schema: {
            uid: { type: 'string', required: true },
            lastSyncedAt: { type: 'date' },
            lastSyncError: { type: 'string' },
            pendingChanges: { type: 'boolean', required: true },
            syncVersion: { type: 'number', required: true },
          },
          primaryKey: 'uid',
        },
        gameSaves: {
          schema: {
            id: { type: 'string', required: true },
            uid: { type: 'string', required: true },
            saveKey: { type: 'string', required: true },
            gameState: { type: 'object', required: true },
            timestamp: { type: 'date', required: true },
            gameId: { type: 'string', required: true },
            mode: { type: 'string', required: true },
            p1: { type: 'string', nullable: true },
            p2: { type: 'string', nullable: true },
            activePlayer: { type: 'string', nullable: true },
          },
          primaryKey: 'id',
          indexes: [
            { name: 'uid_idx', keyPath: 'uid', unique: false },
            { name: 'timestamp_idx', keyPath: 'timestamp', unique: false },
            { name: 'mode_idx', keyPath: 'mode', unique: false },
          ],
        },
      },
    })

    const db = DexBee.create('newhanafuda', schema)

    try {
      await db.connect()
      return db as DexBeeDb
    } catch (error) {
      dbPromise = null
      throw error
    }
  })()

  return dbPromise
}
