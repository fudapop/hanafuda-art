import type { PlayerProfile, SyncResult, SyncOptions } from '~/types/profile'
import { mergePlayerStats } from '~/utils/stats'

/**
 * Conflict resolution result with source tracking
 */
export interface ConflictResolution {
  resolved: PlayerProfile
  source: 'local' | 'remote' | 'merged'
}

/**
 * Resolve conflicts between local and remote profiles
 * Pure function - no side effects, easily testable
 *
 * Note: 'merge-fields' strategy is async due to stats merging with hash regeneration
 */
export async function resolveConflict(
  local: PlayerProfile,
  remote: PlayerProfile,
  strategy: SyncOptions['conflictStrategy'] = 'last-write-wins',
): Promise<ConflictResolution> {
  switch (strategy) {
    case 'merge-fields':
      // Merge fields individually, adding stats together to prevent loss
      const mergedStats = await mergePlayerStats(local.stats, remote.stats)

      return {
        resolved: {
          ...remote,
          ...local,
          // Merge coins (take max to prevent loss)
          record: {
            coins: Math.max(local.record.coins, remote.record.coins),
            win: Math.max(local.record.win, remote.record.win),
            loss: Math.max(local.record.loss, remote.record.loss),
            draw: Math.max(local.record.draw, remote.record.draw),
          },
          // Merge designs (union of both)
          designs: {
            unlocked: Array.from(new Set([...local.designs.unlocked, ...remote.designs.unlocked])),
            liked: Array.from(new Set([...local.designs.liked, ...remote.designs.liked])),
          },
          // Take newer timestamp
          lastUpdated:
            local.lastUpdated > remote.lastUpdated ? local.lastUpdated : remote.lastUpdated,
          // Merge stats using dedicated helper (adds values, regenerates hash)
          stats: mergedStats,
        },
        source: 'merged',
      }

    case 'last-write-wins':
    default:
      const isLocalNewer = local.lastUpdated > remote.lastUpdated
      return {
        resolved: isLocalNewer ? local : remote,
        source: isLocalNewer ? 'local' : 'remote',
      }
  }
}

/**
 * Check if a profile should be synced
 * Guest profiles are never synced
 */
export function shouldSync(profile: PlayerProfile | null): boolean {
  return !!profile && !profile.isGuest
}

/**
 * Create a standardized sync result object
 * Helper for consistent result formatting
 */
export function createSyncResult(params: {
  success: boolean
  error?: string
  local?: PlayerProfile | null
  remote?: PlayerProfile | null
  merged?: PlayerProfile
  action: 'pulled' | 'pushed' | 'merged' | 'skipped'
}): SyncResult {
  return {
    success: params.success,
    error: params.error,
    local: params.local ?? null,
    remote: params.remote ?? null,
    merged: params.merged,
    action: params.action,
  }
}

/**
 * Determine if remote profile should override local based on conflict resolution
 * Returns true if remote should be used
 */
export async function shouldUseRemote(
  local: PlayerProfile,
  remote: PlayerProfile,
  strategy: SyncOptions['conflictStrategy'] = 'last-write-wins',
): Promise<boolean> {
  const { source } = await resolveConflict(local, remote, strategy)
  return source === 'remote'
}
