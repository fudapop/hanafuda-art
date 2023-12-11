<template>
  <ul role="list" :style="ulStyle">
    <slot />
  </ul>
</template>

<script setup lang="ts">
const { cols, rows, flow, gap } = defineProps<{
  cols: number | "auto";
  rows: number | "auto";
  flow?: "column" | "row";
  gap?: number | string;
}>();
const ulStyle = {
  display: "grid",
  gridTemplateColumns: cols === "auto" ? cols : `repeat(${cols}, max-content)`,
  gridTemplateRows: rows === "auto" ? rows : `repeat(${rows}, max-content)`,
  gridAutoFlow: flow ?? "row",
  gap: gap ?? 0,
};
</script>

<style scoped></style>
