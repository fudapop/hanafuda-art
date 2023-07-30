<template>
  <header class="absolute inset-x-0 top-0 z-50">
    <nav
      class="flex items-center justify-between p-6 mx-auto max-w-7xl lg:px-8"
      aria-label="Global"
    >
      <div class="flex lg:flex-1">
        <a href="#" class="-m-1.5 p-1.5">
          <span class="sr-only">Your Company</span>
          <img
            class="w-auto h-8"
            src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
            alt=""
          />
        </a>
      </div>
      <div class="flex lg:hidden">
        <button
          type="button"
          class="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
          @click="mobileMenuOpen = true"
        >
          <span class="sr-only">Open main menu</span>
          <Bars3Icon class="w-6 h-6" aria-hidden="true" />
        </button>
      </div>
      <div class="hidden lg:flex lg:gap-x-12">
        <a
          v-for="item in navigation"
          :key="item.name"
          :href="item.href"
          class="text-sm font-semibold leading-6 text-gray-900"
          >{{ item.name }}</a
        >
      </div>
      <div class="hidden lg:flex lg:flex-1 lg:justify-end">
        <LoginButton />
      </div>
    </nav>
    <ClientOnly>
      <!-- Some headless components, such as Portal, Popover, or Dialog are client-only components. -->
      <!-- They will lead to errors when rendered on the server. You need to wrap them with ClientOnly. -->
      <!-- See https://github.com/tailwindlabs/headlessui/issues/1496. -->
      <HeadlessDialog
        as="div"
        class="lg:hidden"
        @close="mobileMenuOpen = false"
        :open="mobileMenuOpen"
      >
        <div class="fixed inset-0 z-50" />
        <HeadlessDialogPanel
          class="fixed inset-y-0 right-0 z-50 w-full px-6 py-6 overflow-y-auto bg-white sm:max-w-sm sm:ring-1 sm:ring-gray-900/10"
        >
          <div class="flex items-center justify-between">
            <a href="#" class="-m-1.5 p-1.5">
              <span class="sr-only">Your Company</span>
              <img
                class="w-auto h-8"
                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                alt=""
              />
            </a>
            <button
              type="button"
              class="-m-2.5 rounded-md p-2.5 text-gray-700"
              @click="mobileMenuOpen = false"
            >
              <span class="sr-only">Close menu</span>
              <XMarkIcon class="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
          <div class="flow-root mt-6">
            <div class="-my-6 divide-y divide-gray-500/10">
              <div class="py-6 space-y-2">
                <a
                  v-for="item in navigation"
                  :key="item.name"
                  :href="item.href"
                  class="block px-3 py-2 -mx-3 text-base font-semibold leading-7 text-gray-900 rounded-lg hover:bg-gray-50"
                  >{{ item.name }}</a
                >
              </div>
              <div class="py-6">
                <LoginButton />
              </div>
            </div>
          </div>
        </HeadlessDialogPanel>
      </HeadlessDialog>
    </ClientOnly>
  </header>
</template>

<script setup lang="ts">
import { Bars3Icon, XMarkIcon } from "@heroicons/vue/24/outline";

const navigation = [
  { name: "Product", href: "#" },
  { name: "Features", href: "#" },
  { name: "Marketplace", href: "#" },
  { name: "Company", href: "#" },
];

const mobileMenuOpen = ref(false);
</script>

<style scoped></style>
