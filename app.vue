<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { vHide } from "~/utils/directives/vHide";
import { vClickDisabled } from "~/utils/directives/vClickDisabled";

const app = useNuxtApp().vueApp;

app.directive("hide", vHide);
app.directive("click-disabled", vClickDisabled);
</script>
