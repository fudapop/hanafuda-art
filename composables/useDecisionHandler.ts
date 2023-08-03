import { storeToRefs } from "pinia";
import { useGameDataStore } from "~/stores/gameDataStore";

export const useDecisionHandler = () => {
  type KoikoiDecision = "stop" | "koikoi" | "pending" | null;

  const useDecision = (): Ref<KoikoiDecision> => useState("decision", () => null);
  const decision = useDecision();
  const getDecision = computed(() => decision.value);

  const decisionIsPending = computed(() => decision.value === "pending");

  const koikoiIsCalled = computed(() => decision.value === "koikoi");
  const callKoikoi = () => {
    decision.value = "koikoi";
  };

  const stopIsCalled = computed(() => decision.value === "stop");
  const callStop = () => {
    decision.value = "stop";
  };

  const makeDecision = async (): Promise<KoikoiDecision> => {
    decision.value = "pending";
    while (decisionIsPending.value) {
      console.log("Player is deciding...");
      await sleep(500);
    }
    if (decision.value) console.info(decision.value.toUpperCase(), "was called.");
    return decision.value;
  };

  const {roundOver} = storeToRefs(useGameDataStore());
  watch(roundOver, () => {
    if (roundOver.value === false) decision.value = null;
  })

  return {
    // Setters
    callKoikoi,
    callStop,
    // Getters (reactive)
    koikoiIsCalled,
    stopIsCalled,
    decisionIsPending,
    getDecision,
    // Functions
    makeDecision,
  };
};
