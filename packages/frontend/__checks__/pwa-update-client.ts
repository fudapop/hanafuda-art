/**
 * Browser entry for the service-worker update test.
 * It starts the same monitor the Vue app uses. The Playwright test only
 * changes the game flag and waits. It does not post SKIP_WAITING or reload.
 */
import { startPwaUpdateMonitor, type PwaUpdateScene } from '../app/utils/pwaUpdate'

const scene: PwaUpdateScene = {
  gameInProgress: false,
  viewingResults: false,
  playAgainPending: false,
  lobbyOpen: false,
  interactionHold: false,
  textEntryFocused: false,
}

const notice = document.querySelector('#notice')
const monitor = startPwaUpdateMonitor({
  dev: false,
  // The production check is every 15 minutes. This page looks sooner so the
  // test can see a deploy; activation and reload still go through the monitor.
  checkIntervalMs: 300,
  minCheckGapMs: 0,
  getSnapshot: () => scene,
  onChange(view) {
    notice?.setAttribute('data-pwa-update-state', view.notice)
    if (notice) notice.textContent = view.notice
  },
})

window.__setPwaScene = (next: Partial<PwaUpdateScene>) => {
  Object.assign(scene, next)
  monitor.sync()
}

declare global {
  interface Window {
    __setPwaScene?: (next: Partial<PwaUpdateScene>) => void
  }
}
