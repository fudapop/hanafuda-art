<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import "vant/lib/index.css";
import { Loading } from "vant";
import { vHide } from "~/utils/directives/vHide";

const app = useNuxtApp().vueApp;

app.use(Loading);

app.directive("hide", vHide);
</script>
