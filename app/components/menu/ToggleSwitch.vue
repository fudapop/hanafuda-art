<template>
  <HeadlessSwitchGroup
    as="div"
    class="flex items-center ml-1"
  >
    <HeadlessSwitch
      v-model="enabled"
      :class="[
        enabled ? 'bg-primary' : 'bg-border',
        'relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-md border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-2',
      ]"
    >
      <span class="sr-only">Use setting</span>
      <span
        :class="[
          enabled ? 'translate-x-6' : 'translate-x-0',
          'pointer-events-none relative inline-block h-5 w-5 transform rounded-md bg-white shadow ring-0 transition duration-200 ease-in-out',
        ]"
      >
        <span
          :class="[
            enabled ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in',
            'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity',
          ]"
          aria-hidden="true"
        >
          <svg
            class="w-4 h-4 text-text-secondary"
            fill="none"
            viewBox="0 0 12 12"
          >
            <path
              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span
          :class="[
            enabled ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out',
            'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity',
          ]"
          aria-hidden="true"
        >
          <svg
            class="w-4 h-4 text-primary"
            fill="currentColor"
            viewBox="0 0 12 12"
          >
            <path
              d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z"
            />
          </svg>
        </span>
      </span>
    </HeadlessSwitch>

    <span class="flex flex-col flex-grow ml-4">
      <HeadlessSwitchLabel
        as="span"
        class="text-sm font-medium leading-6 text-text"
        passive
      >
        <slot name="label" />
      </HeadlessSwitchLabel>
      <HeadlessSwitchDescription
        as="span"
        class="text-sm text-text-secondary"
      >
        <slot name="description" />
      </HeadlessSwitchDescription>
    </span>
  </HeadlessSwitchGroup>
</template>

<script setup lang="ts">
const { callback, invert, initValue } = defineProps<{
  callback: (param: boolean) => void
  invert?: boolean
  initValue: boolean
}>()
const enabled = ref(initValue)
watchEffect(() => callback(invert ? !enabled.value : enabled.value))
</script>
