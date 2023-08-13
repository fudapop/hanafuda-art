<template>
  <HeadlessTransitionRoot as="template" appear :show="true">
    <HeadlessTransitionChild
      enter="duration-300 ease-out"
      enter-from="opacity-0 motion-safe:-translate-x-1"
      enter-to="opacity-100"
      leave="duration-200 ease-in"
      leave-from="opacity-100"
      leave-to="opacity-0 motion-safe:translate-x-1"
    >
      <slot />
    </HeadlessTransitionChild>
  </HeadlessTransitionRoot>
</template>
