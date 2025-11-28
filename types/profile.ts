import type { CardDesign } from '~/composables/useCardDesign'
import type { GameSettings } from '~~/stores/configStore'

export interface PlayerRecord {
  coins: number
  win: number
  draw: number
  loss: number
}

export interface PlayerFlags {
  isNewPlayer: boolean
  hasSubmittedFeedback: boolean
  // Open set of future boolean/primitive flags
  [key: string]: unknown
}

export interface PlayerDesigns {
  unlocked: CardDesign[]
  liked: CardDesign[]
}

export interface PlayerProfile {
  uid: string
  email: string
  avatar: string
  username: string
  record: PlayerRecord
  lastUpdated: Date
  designs: PlayerDesigns
  settings: GameSettings | undefined
  flags: PlayerFlags
  isGuest?: boolean
  stats: Record<string, number>
}

export interface LocalProfileStore {
  init(): Promise<void>
  get(uid: string): Promise<PlayerProfile | null>
  set(profile: PlayerProfile): Promise<void>
  remove(uid: string): Promise<void>
  hasAny(): Promise<boolean>
  getSyncMetadata(uid: string): Promise<SyncMetadata | null>
  setSyncMetadata(uid: string, metadata: SyncMetadata): Promise<void>
}

export type SyncStatus = 'idle' | 'pulling' | 'pushing' | 'syncing' | 'error'

export interface SyncMetadata {
  lastSyncedAt: Date | null
  lastSyncError: string | null
  pendingChanges: boolean
  syncVersion: number
}

export interface SyncResult {
  success: boolean
  error?: string
  local: PlayerProfile | null
  remote: PlayerProfile | null
  merged?: PlayerProfile
  action: 'pulled' | 'pushed' | 'merged' | 'skipped'
}
