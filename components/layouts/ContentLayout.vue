<template>
  <div class="min-h-screen">
    <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <GameBackground />
    </div>

    <Teleport to="body">
      <!-- UI TOGGLE BUTTONS -->
      <div class="fixed right-3 grid text-white min-w-[48px] top-20">
        <ColorModeToggle />
      </div>
    </Teleport>

    <slot />
  </div>
</template>
