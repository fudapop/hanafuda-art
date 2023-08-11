<template>
  <div>
    <NuxtLayout class="relative h-full">
    <div class="absolute inset-x-0 z-50 mx-auto pointer-events-none top-1/3">
      <Transition appear enter-active-class="duration-300" enter-to-class="opacity-100" enter-from-class="opacity-0" leave-active-class="duration-300" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <CardsLoader v-if="loading" />
      </Transition>
    </div>
    <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { vHide } from "~/utils/directives/vHide";
import { vClickDisabled } from "~/utils/directives/vClickDisabled";

const loading = ref(false);
const nuxtApp = useNuxtApp();
const vueApp = nuxtApp.vueApp;

vueApp.directive("hide", vHide);
vueApp.directive("click-disabled", vClickDisabled);

nuxtApp.hook("page:start", () => {
  loading.value = true
});

nuxtApp.hook("page:transition:finish", () => {
  loading.value = false
});
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 1s;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(0.5rem);
}
</style>