<template>
  <div class="grid gap-4 p-4 overflow-y-auto max-h-[75vh]">
    <div class="max-sm:grid max-sm:grid-cols-2 gap-x-2">
      <!-- Set maximum for number of rounds per game -->
      <OptionsRadioGroup :model-value="config.maxRounds"
        :update-callback="(option) => (config.maxRounds = option as GameLengthOptions)"
        :value-options="config.OPTIONS.GAME_LENGTH" :label-template="(option) => `${option} rounds`">
        Game Length
      </OptionsRadioGroup>

      <!-- TODO: Set behaviour pattern of the AI opponent -->
      <OptionsRadioGroup :model-value="config.difficulty"
        :update-callback="(option) => (config.difficulty = option as DifficultyOptions)"
        :value-options="config.OPTIONS.DIFFICULTY">
        Difficulty Level
      </OptionsRadioGroup>
    </div>

    <!-- Set allowance of TSUKIMI-/HANAMI-ZAKE -->
    <OptionsRadioGroup :model-value="config.allowViewingsYaku"
      :update-callback="(option) => (config.allowViewingsYaku = option as ViewingsOptions)"
      :value-options="config.OPTIONS.VIEWINGS"
      :description-template="(option) => getOptionDescription(option as ViewingsOptions)">
      <a title="Tsukimi-/Hanami-zake" class="underline decoration-dotted underline-offset-4 cursor-help">
        Moon/Flower Viewing
      </a>
      <a href="https://fudawiki.org/en/hanafuda/games/koi-koi#taming-the-sake-cup"
        title="Read about this rule on fudawiki.org" target="_blank">
        <QuestionMarkCircleIcon
          class="inline w-5 h-5 mb-1 text-gray-500 cursor-pointer dark:text-gray-300 hover:text-indigo-500 dark:hover:text-yellow-100" />
        <span class="sr-only">Read about this rule on fudawiki.org</span>
      </a>
    </OptionsRadioGroup>

    <div class="flex">
      <p class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-200">
        Scoring Variations
      </p>
      <a href="https://fudawiki.org/en/hanafuda/games/koi-koi#scoring-variations"
        title="Read about scoring on fudawiki.org" target="_blank">
        <QuestionMarkCircleIcon
          class="inline w-5 h-5 mb-1 ml-1 text-gray-500 cursor-pointer dark:text-gray-300 hover:text-indigo-500 dark:hover:text-yellow-100" />
        <span class="sr-only">Read about scoring on fudawiki.org</span>
      </a>
    </div>
    <div class="mb-4 space-y-4">
      <!-- Set wild-card behavior for KIKU-NI-SAKAZUKI -->
      <ToggleSwitch :callback="toggleSake" :init-value="config.sakeIsWildCard">
        <template #label>Wild Card Sake Cup</template>
        <template #description>The
          <a title="Kiku ni sakazuki" class="underline cursor-help underline-offset-4 decoration-dotted">sake cup</a>
          counts as both animal and plain types.</template>
      </ToggleSwitch>

      <!-- Set additional scoring rule -->
      <ToggleSwitch :callback="toggleDouble" :init-value="config.doubleScoreOverSeven">
        <template #label>Double Over Seven</template>
        <template #description>Double the score if the combined yaku value is greater than 7 points.</template>
      </ToggleSwitch>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QuestionMarkCircleIcon } from "@heroicons/vue/24/outline";
import { useConfigStore, ViewingsOptions, GameLengthOptions, DifficultyOptions } from "~/stores/configStore";
import { doc, setDoc, getDoc } from "firebase/firestore";

const config = useConfigStore();
const user = useCurrentUser();
const profileDoc = computed(() => doc(useFirestore(), "users", `u_${user.value?.uid}`));

const toggleSake = (enabled: boolean) => {
  config.sakeIsWildCard = enabled;
};

const toggleDouble = (enabled: boolean) => {
  config.doubleScoreOverSeven = enabled;
};

const getOptionDescription = (option: ViewingsOptions) => {
  switch (option) {
    case "allow":
      return "Completion is scored normally.";
    case "limited":
      return "Requires another completed yaku to score points.";
    case "none":
      return "No points are scored for completion.";
  }
};

// Get user preferences from firestore
const profile = await getDoc(profileDoc.value);
const userSettings = profile.data()?.settings;
if (userSettings) {
  config.loadUserSettings(userSettings);
}

watchEffect(() => {
  console.log(config.getCurrentSettings)
  if (user.value) {
    setDoc(profileDoc.value, { settings: config.getCurrentSettings }, { merge: true });
  }
});


</script>
