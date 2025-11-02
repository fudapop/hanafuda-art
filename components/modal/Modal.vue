<template>
  <HeadlessTransitionRoot
    as="template"
    :show="open"
  >
    <HeadlessDialog
      as="div"
      :ref="modalRef"
      class="relative z-40"
    >
      <HeadlessTransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 transition-opacity opacity-50 bg-hanafuda-brown" />
      </HeadlessTransitionChild>

      <div
        ref="modalScrollRef"
        class="fixed inset-0 z-10 overflow-y-auto"
      >
        <div
          class="flex items-end justify-center min-h-full pt-8 text-center sm:items-center sm:px-8"
          :class="isMobile ? 'portrait:h-max portrait:my-auto portrait:p-0' : ''"
        >
          <HeadlessTransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <HeadlessDialogPanel
              :class="[
                'relative pt-5 pb-4 overflow-hidden text-left transition-all transform rounded-md shadow-xl bg-surface dark:bg-hanafuda-cream sm:my-8 sm:max-w-lg lg:max-w-3xl',
                isMobile && 'fixed inset-x-0 h-max my-auto',
                padded ? 'px-4 sm:p-6 lg:p-8 w-[90%]' : 'w-full',
              ]"
            >
              <!-- rounded blur in the background -->
              <div
                class="absolute rounded-full inset-8 -z-10 bg-hanafuda-brown/20 dark:bg-black/10 blur-xl"
              ></div>
              <div :class="isMobile && 'h-max'">
                <slot name="image" />

                <div class="mt-3 text-center sm:mt-5">
                  <HeadlessDialogTitle
                    as="h3"
                    class="text-base font-semibold leading-6 text-text-secondary"
                  >
                    <slot name="title" />
                  </HeadlessDialogTitle>
                  <div class="mt-2">
                    <slot name="description" />
                  </div>
                </div>
              </div>
              <slot
                name="actions"
                :scroll-to-top="scrollToTop"
              />
            </HeadlessDialogPanel>
          </HeadlessTransitionChild>
        </div>
      </div>
    </HeadlessDialog>
  </HeadlessTransitionRoot>
</template>

<script setup lang="ts">
const {
  open,
  modalRef,
  padded = true,
} = defineProps<{
  open: boolean
  modalRef?: string
  padded?: boolean
}>()
const { isMobile } = useDevice()

const modalScrollRef = ref<HTMLDivElement | null>(null)
const scrollToTop = () => {
  if (modalScrollRef.value) {
    modalScrollRef.value.scrollTo({ top: 0, behavior: 'instant' })
  }
}
</script>
