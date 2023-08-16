<template>
  <div>
    <div class="absolute inset-x-0 z-50 mx-auto pointer-events-none top-1/3">
      <Transition
        appear
        enter-active-class="duration-300"
        enter-to-class="opacity-100"
        enter-from-class="opacity-0"
        leave-active-class="duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <CardsLoader v-if="loading" />
      </Transition>
    </div>
    <NuxtPage />
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
  loading.value = true;
});

nuxtApp.hook("page:finish", async () => {
  await sleep(500);
  loading.value = false;
  window.dispatchEvent(new CustomEvent("ptupdate"));
});

onMounted(() => {
  const googleScripts = [/.*\/www\.gstatic\.com\/.*/, /.*\/apis\.google\.com\/.*/];
  const scripts = ref(document.head.querySelectorAll("script"));
  scripts.value.forEach((script) => {
    if (
      googleScripts.some((regex) => regex.test(script.src)) &&
      script.type !== "text/partytown-x"
    )
      script.type = "text/partytown";
  });
  window.dispatchEvent(new CustomEvent("ptupdate"));
});
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.8s;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  /* filter: blur(0.5rem); */
}

/* .page-enter-from {
  translate: 100% 0;
}
.page-leave-to {
  translate: -100% 0;
} */
</style>
