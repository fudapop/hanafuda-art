<template>
  <div class="my-4 space-y-2 cursor-default group">
    <div class="flex items-center justify-between pr-4">
      <h3 class="text-lg font-semibold tracking-wide text-gray-900 dark:text-white">
        {{ info.title }}
        <span v-if="isNew">✨</span>
      </h3>
      <button
        :class="[
          'cursor-pointer text-xl text-text-secondary',
          isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ]"
        @click="() => (open = true)"
      >
        <Icon
          name="mdi:magnify"
          class="text-lg mt-2"
        />
        <span class="sr-only">View Cards</span>
      </button>
    </div>
    <p>
      {{ info.description }}
    </p>
    <a
      v-if="info.url"
      :href="info.url"
      target="_blank"
      class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4"
    >
      {{ info.urlDescription }} &rarr;
    </a>
    <p v-if="info.contributor">
      Contributed by
      <a
        :href="info.contributorUrl"
        target="_blank"
        class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4"
      >
        {{ info.contributor }}
      </a>
    </p>

    <Teleport to="body">
      <Modal
        ref="modalRef"
        :open="open"
        :padded="false"
      >
        <template #image>
          <CardSheet :design="design" />
        </template>
        <template #description>
          <div class="px-4">
            <p class="text-balance text-text">
              {{ info.description }}
            </p>
            <p
              v-if="info.url"
              class="mt-4 text-balance"
            >
              <a
                :href="info.url"
                target="_blank"
                class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4"
              >
                {{ info.urlDescription }} &rarr;
              </a>
            </p>
            <p
              v-if="info.contributor"
              class="mt-4 text-text"
            >
              Contributed by
              <a
                :href="info.contributorUrl"
                target="_blank"
                class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4"
              >
                {{ info.contributor }}
              </a>
            </p>
          </div>
        </template>
        <template #actions>
          <div class="w-max mx-auto my-8">
            <button
              class="sec-btn cursor-pointer"
              @click="open = false"
            >
              {{ t('common.actions.close') }}
            </button>
          </div>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { getDesignInfo } = useCardDesign()
const { isMobile } = useDevice()
const { t } = useI18n()
const { design, isNew = false } = defineProps<{ design: CardDesign; isNew?: boolean }>()

const modalRef = ref(null)
const open = ref(false)
const info = computed(() => getDesignInfo(design))
</script>
