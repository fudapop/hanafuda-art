/**
 * Manages global props and state variables for a running game
 */

import { defineStore } from "pinia";
import { YakuName } from "~/scripts/yaku";

export type PlayerKey = "p1" | "p2";

export type Player = {
  readonly id: PlayerKey;
  isActive: boolean;
  isDealer: boolean;
  score: number;
};

export type RoundResult = {
  round: number;
  winner: PlayerKey | null;
  score: number;
  yaku: YakuName[];
};

interface GlobalStoreState {
  players: Record<PlayerKey, Player>;
  record: RoundResult[];
  round: number;
  turn: number;
  phase: "select" | "draw";
  bonusMultiplier: number;
}

export const useGlobalStore = defineStore("global", {
  state: (): GlobalStoreState => ({
    players: {
      p1: {
        id: "p1",
        isActive: true,
        isDealer: true,
        score: 0,
      },
      p2: {
        id: "p2",
        isActive: false,
        isDealer: false,
        score: 0,
      },
    },
    record: [],
    round: (() => {
      consoleLogColor("ROUND 1", "gray");
      return 1;
    })(),
    turn: (() => {
      consoleLogColor("TURN 1", "gray");
      return 1;
    })(),
    phase: "select",
    bonusMultiplier: 1,
  }),
  getters: {
    playerList: (state) => [...Object.values(state.players)],
    activePlayer(): Player {
      const player = this.playerList.find((p) => p.isActive);
      if (!player) throw Error("No active player specified");
      return player;
    },
    inactivePlayer(): Player {
      const player = this.playerList.find((p) => !p.isActive);
      if (!player) throw Error("Multiple active players detected");
      return player;
    },
    dealer(): Player {
      const player = this.playerList.find((p) => p.isDealer);
      if (!player) throw Error("No dealer specified");
      return player;
    },
    lastRoundResult: (state) => state.record.at(-1),
  },
  actions: {
    toggleActivePlayer() {
      this.playerList.forEach((p) => (p.isActive = !p.isActive));
      if (this.activePlayer.id === this.dealer?.id) this.incrementTurn();
    },
    toggleDealer() {
      this.playerList.forEach((p) => (p.isDealer = !p.isDealer));
    },
    incrementBonus() {
      this.bonusMultiplier++;
    },
    incrementRound() {
      this.round++;
      consoleLogColor(`ROUND ${this.round}`, "gray");
    },
    incrementTurn() {
      this.turn++;
      consoleLogColor(`TURN ${this.turn}`, "gray");
    },
    updateScore(player: PlayerKey, amount: number) {
      this.players[player].score = amount;
    },
    recordRound(data: {
      player: PlayerKey;
      score: number;
      completed: YakuName[];
    }): RoundResult {
      const result = {
        round: this.round,
        winner: data.player,
        score: data.score * this.bonusMultiplier,
        yaku: data.completed,
      };
      this.record[this.round - 1] = result;
      return result;
    },
    endRound() {
      this.bonusMultiplier = 1;
      this.phase = "select";
      // console.debug("\tRecord", this.record);
    },
    nextRound() {
      // TODO: if (!this.round === MAX_ROUNDS)
      const nextDealer = this.lastRoundResult?.winner ?? this.dealer;
      if (nextDealer !== this.dealer.id) this.toggleDealer();
      if (nextDealer !== this.activePlayer.id) this.toggleActivePlayer();
      this.turn = 1;
      this.incrementRound();
    },
    checkCurrentPhase(phase: "select" | "draw") {
      return phase === this.phase;
    },
    nextPhase() {
      this.phase =
        this.phase === "draw" ? (this.phase = "select") : (this.phase = "draw");
        // console.debug("SWITCHED PHASE >>>", this.phase);
      return this.phase;
    },
  },
});
