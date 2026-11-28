/**
 * @fileoverview Publish the opponent status bar height as the `--topbar-h` CSS variable.
 *
 * The phone board used to reserve `safe-area + 3.5rem`, which is the bar's
 * avatar and padding and leaves no gap for the bar's border. Measuring the
 * real bar keeps that padding correct when the safe area or the avatar changes.
 *
 * @example
 * const topBar = useTemplateRef('topBar')
 * const shell = useTemplateRef('shell')
 * useTopBarHeight(topBar, shell)
 */
import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useResizeObserver } from '@vueuse/core'

const TOP_BAR_HEIGHT_VAR = '--topbar-h'

type TopBarSizeEntry = {
  borderBoxSize?: ReadonlyArray<{ blockSize: number }>
  target: { getBoundingClientRect: () => { height: number } }
}

/**
 * Border-box block size of the top bar, in CSS pixels.
 *
 * @param entry - A resize observation of the bar
 * @returns The laid-out height, or null when the bar has no box yet
 */
export function readTopBarBlockSize(entry: TopBarSizeEntry): number | null {
  const box = entry.borderBoxSize?.[0]?.blockSize
  const height = box && box > 0 ? box : entry.target.getBoundingClientRect().height
  if (!Number.isFinite(height) || height <= 0) return null
  return height
}

/**
 * Observe `source` and set `--topbar-h` on `host`, a shared ancestor of the board.
 * The variable is removed when this composable's scope is disposed.
 *
 * @param source - The top status bar element
 * @param host - Ancestor that should carry `--topbar-h`. Defaults to the document element.
 */
export const useTopBarHeight = (
  source: MaybeRefOrGetter<HTMLElement | null | undefined>,
  host?: MaybeRefOrGetter<HTMLElement | null | undefined>,
) => {
  let latest: number | null = null
  let written: HTMLElement | null = null

  const resolveHost = () => {
    const value = host ? toValue(host) : null
    if (value instanceof HTMLElement) return value
    if (import.meta.client) return document.documentElement
    return null
  }

  const apply = () => {
    const el = resolveHost()
    if (!el || latest == null) return
    if (written && written !== el) written.style.removeProperty(TOP_BAR_HEIGHT_VAR)
    el.style.setProperty(TOP_BAR_HEIGHT_VAR, `${Math.ceil(latest)}px`)
    written = el
  }

  const { stop } = useResizeObserver(
    source,
    (entries) => {
      const entry = entries[0]
      if (!entry) return
      latest = readTopBarBlockSize(entry)
      apply()
    },
    { box: 'border-box' },
  )

  watch(() => (host ? toValue(host) : null), apply)

  onScopeDispose(() => {
    stop()
    written?.style.removeProperty(TOP_BAR_HEIGHT_VAR)
    written = null
  })
}
