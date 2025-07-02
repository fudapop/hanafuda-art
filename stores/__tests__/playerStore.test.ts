import { beforeEach, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '../playerStore'

describe('PlayerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggles which player is active', () => {
    const store = usePlayerStore()
    store.toggleActivePlayer()
    expect(store.activePlayer).toBe(store.players.p2)
    store.toggleActivePlayer()
    expect(store.dealer).toBe(store.players.p1)
    store.players.p1.isActive = false
    expect(() => store.activePlayer).toThrowError(Error)
  })

  it('toggles which player is the dealer', () => {
    const store = usePlayerStore()
    store.toggleDealer()
    expect(store.dealer).toBe(store.players.p2)
    store.players.p2.isDealer = false
    expect(() => store.dealer).toThrowError(Error)
  })

  // it("properly initializes counters", () => {
  //   expect(store).toHaveProperty("bonusMultiplier", 1);
  //   expect(store).toHaveProperty("players.p1.score", 0);
  //   expect(store).toHaveProperty("players.p2.score", 0);
  // });

  // it("accurately increments counters", () => {
  //   store.updateScore("p2", 5);
  //   expect(store.players.p2.score).toBe(5);
  //   store.incrementBonus();
  //   expect(store.bonusMultiplier).toBe(2);
  // });

  // it("tracks player scores and bonuses", () => {
  //   store.incrementBonus();
  //   store.updateScore("p1", 2);
  //   expect(store.players.p1.score).toBe(2);
  //   expect(store.bonusMultiplier).toBe(2)
  //   store.reset();
  //   expect(store.players.p1.score).toBe(0);
  //   expect(store.bonusMultiplier).toBe(1)
  // });
})
