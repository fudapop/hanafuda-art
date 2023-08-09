<template>
  <div class="grid gap-4 p-4 overflow-y-auto max-h-[80vh]">
    <div class="max-sm:grid max-sm:grid-cols-2 gap-x-2">
      <HeadlessRadioGroup v-model="config.maxRounds">
        <HeadlessRadioGroupLabel class="text-base font-semibold leading-6 text-gray-900"
          >Game Length
        </HeadlessRadioGroupLabel>

        <div class="mt-2 mb-4 grid grid-cols-1 gap-y-2 sm:grid-cols-3 sm:gap-x-4">
          <HeadlessRadioGroupOption
            as="template"
            v-for="n in config.OPTIONS.GAME_LENGTH"
            :key="n"
            :value="n"
            v-slot="{ active, checked }"
          >
            <div
              :class="[
                active ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-300',
                'relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none',
              ]"
            >
              <span class="flex flex-1">
                <span class="flex flex-col">
                  <HeadlessRadioGroupLabel
                    as="span"
                    class="block text-sm font-medium text-gray-900"
                    >{{ n }}
                    rounds
                  </HeadlessRadioGroupLabel>
                </span>
              </span>
              <CheckCircleIcon
                :class="[!checked ? 'invisible' : '', 'h-5 w-5 text-indigo-600']"
                aria-hidden="true"
              />
              <span
                :class="[
                  active ? 'border' : 'border-2',
                  checked ? 'border-indigo-600' : 'border-transparent',
                  'pointer-events-none absolute -inset-px rounded-lg',
                ]"
                aria-hidden="true"
              />
            </div>
          </HeadlessRadioGroupOption>
        </div>
      </HeadlessRadioGroup>

      <HeadlessRadioGroup v-model="config.difficulty">
        <HeadlessRadioGroupLabel class="text-base font-semibold leading-6 text-gray-900"
          >Difficulty Level
        </HeadlessRadioGroupLabel>

        <div class="mt-2 mb-4 grid grid-cols-1 gap-y-2 sm:grid-cols-3 sm:gap-x-4">
          <HeadlessRadioGroupOption
            as="template"
            v-for="level in config.OPTIONS.DIFFICULTY"
            :key="level"
            :value="level"
            v-slot="{ active, checked }"
          >
            <div
              :class="[
                active ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-300',
                'relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none',
              ]"
            >
              <span class="flex flex-1">
                <span class="flex flex-col">
                  <HeadlessRadioGroupLabel
                    as="span"
                    class="block text-sm font-medium text-gray-900 capitalize"
                    >{{ level }}
                  </HeadlessRadioGroupLabel>
                </span>
              </span>
              <CheckCircleIcon
                :class="[!checked ? 'invisible' : '', 'h-5 w-5 text-indigo-600']"
                aria-hidden="true"
              />
              <span
                :class="[
                  active ? 'border' : 'border-2',
                  checked ? 'border-indigo-600' : 'border-transparent',
                  'pointer-events-none absolute -inset-px rounded-lg',
                ]"
                aria-hidden="true"
              />
            </div>
          </HeadlessRadioGroupOption>
        </div>
      </HeadlessRadioGroup>
    </div>

    <HeadlessRadioGroup v-model="config.allowViewingsYaku">
      <HeadlessRadioGroupLabel class="text-base font-semibold leading-6 text-gray-900">
        <a
          title="Tsukimi-/Hanami-zake"
          class="underline decoration-dotted underline-offset-4 cursor-help"
        >
          Moon/Flower Viewing
        </a>
        <a
          href="https://fudawiki.org/en/hanafuda/games/koi-koi#taming-the-sake-cup"
          title="Read about this rule on fudawiki.org"
          target="_blank"
        >
          <QuestionMarkCircleIcon
            class="w-5 h-5 inline mb-1 text-gray-500 hover:text-indigo-500 cursor-pointer"
          />
          <span class="sr-only">Read about this rule on fudawiki.org</span>
        </a>
      </HeadlessRadioGroupLabel>

      <div class="mt-2 mb-4 grid grid-cols-1 gap-y-2 sm:grid-cols-3 sm:gap-x-4">
        <HeadlessRadioGroupOption
          as="template"
          v-for="option in config.OPTIONS.VIEWINGS"
          :key="option"
          :value="option"
          v-slot="{ active, checked }"
        >
          <div
            :class="[
              active ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-300',
              'relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none',
            ]"
          >
            <span class="flex flex-1">
              <span class="flex flex-col">
                <HeadlessRadioGroupLabel
                  as="span"
                  class="block text-sm font-medium text-gray-900 capitalize"
                  >{{ option }}
                </HeadlessRadioGroupLabel>
                <HeadlessRadioGroupDescription
                  as="span"
                  class="mt-1 flex items-center text-sm text-gray-500"
                >
                  {{ optionDescription(option) }}
                </HeadlessRadioGroupDescription>
              </span>
            </span>
            <CheckCircleIcon
              :class="[!checked ? 'invisible' : '', 'h-5 w-5 text-indigo-600']"
              aria-hidden="true"
            />
            <span
              :class="[
                active ? 'border' : 'border-2',
                checked ? 'border-indigo-600' : 'border-transparent',
                'pointer-events-none absolute -inset-px rounded-lg',
              ]"
              aria-hidden="true"
            />
          </div>
        </HeadlessRadioGroupOption>
      </div>
    </HeadlessRadioGroup>

    <div class="flex">
      <p class="text-base font-semibold leading-6 text-gray-900">Scoring Variations</p>
      <a
        href="https://fudawiki.org/en/hanafuda/games/koi-koi#scoring-variations"
        title="Read about scoring on fudawiki.org"
        target="_blank"
      >
        <QuestionMarkCircleIcon
          class="w-5 h-5 inline ml-1 mb-1 text-gray-500 hover:text-indigo-500 cursor-pointer"
        />
        <span class="sr-only">Read about scoring on fudawiki.org</span>
      </a>
    </div>
    <ToggleSwitch :callback="toggleSake">
      <template #label>Wild Card Sake Cup</template>
      <template #description
        >The
        <a
          title="Kiku ni sakazuki"
          class="cursor-help underline underline-offset-4 decoration-dotted"
          >sake cup</a
        >
        counts as both animal and plain types.</template
      >
    </ToggleSwitch>

    <ToggleSwitch :callback="toggleDouble">
      <template #label>Double Over Seven</template>
      <template #description
        >Double the score if the combined yaku value is greater than 7 points.</template
      >
    </ToggleSwitch>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon } from "@heroicons/vue/20/solid";
import { QuestionMarkCircleIcon } from "@heroicons/vue/24/outline";
import { useConfigStore, ViewingsOptions } from "~/stores/configStore";

const config = useConfigStore();

const toggleSake = (enabled: boolean) => {
  config.sakeIsWildCard = enabled;
};

const toggleDouble = (enabled: boolean) => {
  config.doubleScoreOverSeven = enabled;
};

const optionDescription = (option: ViewingsOptions) => {
  switch (option) {
    case "allow":
      return "Completion is scored normally.";
    case "limited":
      return "Requires another completed yaku to score points.";
    case "none":
      return "No points are scored for completion.";
  }
};

watchEffect(() => console.log(config.getCurrentSettings));
</script>
