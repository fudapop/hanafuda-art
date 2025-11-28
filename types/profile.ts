import type { CardDesign } from '~/composables/useCardDesign'
import type { SerializedGameState } from '~/composables/useStoreManager'
import type { PlayerStats } from '~/utils/stats'
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
  stats: PlayerStats
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

export interface SyncAdapter {
  name: string

  /**
   * Pull profile from remote storage
   * @returns Remote profile or null if not found
   */
  pull(uid: string): Promise<PlayerProfile | null>

  /**
   * Push profile to remote storage
   * @returns Success status
   */
  push(profile: PlayerProfile): Promise<boolean>

  /**
   * Resolve conflicts between local and remote profiles
   * Default: Last-Write-Wins by lastUpdated
   * @returns Merged profile
   */
  resolve?(local: PlayerProfile, remote: PlayerProfile): Promise<PlayerProfile>

  /**
   * Check if remote storage is available
   */
  isAvailable(): Promise<boolean>

  /**
   * Optional: Listen for remote changes (real-time sync)
   */
  subscribe?(uid: string, callback: (profile: PlayerProfile) => void): () => void
}

export interface SyncOptions {
  /**
   * Enable automatic sync on profile changes
   * @default true
   */
  autoSync?: boolean

  /**
   * Debounce delay for batching changes (ms)
   * @default 1000
   */
  debounceMs?: number

  /**
   * Max retry attempts for failed syncs
   * @default 3
   */
  maxRetries?: number

  /**
   * Enable real-time sync (if adapter supports it)
   * @default false
   */
  realtimeSync?: boolean

  /**
   * Conflict resolution strategy
   * @default 'last-write-wins'
   */
  conflictStrategy?: 'last-write-wins' | 'merge-fields' | 'manual'
}

export interface SyncResult {
  success: boolean
  error?: string
  local: PlayerProfile | null
  remote: PlayerProfile | null
  merged?: PlayerProfile
  action: 'pulled' | 'pushed' | 'merged' | 'skipped'
}

export type GameMode = 'single' | 'multiplayer'

export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned'

export interface GameSaveRecord {
  id: string
  uid: string
  saveKey: string
  gameState: SerializedGameState
  timestamp: Date
  gameId: string
  mode: GameMode
  p1?: string | null // Player 1 uid (null for single-player)
  p2?: string | null // Player 2 uid (null for single-player)
  activePlayer?: string | null // Current turn player uid (null for single-player)
}

/**
 * Invite code document stored in Firestore
 * Collection: invite_codes
 * Document ID: ${code}
 */
export type InviteCode = {
  code: string
  gameId: string
  createdBy: string
  createdAt: Date
  expiresAt: Date
  used: boolean
  usedBy?: string
  usedAt?: Date
}

/**
 * Shared multiplayer game document stored in Firestore
 * Collection: multiplayer_games
 * Document ID: ${gameId}
 */
export type MultiplayerGame = {
  gameId: string
  gameState: SerializedGameState
  mode: 'multiplayer'
  p1: string // Player 1 uid
  p2: string // Player 2 uid (empty string when waiting)
  activePlayer: string // Current turn player uid
  status: GameStatus // Game lifecycle status
  inviteCode?: string // Optional reference back to invite code
  startedAt?: Date // When p2 joined
  lastUpdated: Date
  createdAt: Date
}

export interface LocalGameSaveStore {
  init(): Promise<void>
  get(uid: string, saveKey: string): Promise<GameSaveRecord | null>
  list(uid: string): Promise<GameSaveRecord[]>
  set(save: GameSaveRecord): Promise<void>
  remove(uid: string, saveKey: string): Promise<void>
  clear(uid: string): Promise<void> // Clear all saves for user
}
