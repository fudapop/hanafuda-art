<template>
    <div class="p-4 rounded-md bg-green-50">
        <div class="flex">
            <div class="flex-shrink-0">
                <CheckCircleIcon class="w-5 h-5 text-green-400" aria-hidden="true" />
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium text-green-800">
                Logging in...
                </p>
            </div>
            <div class="pl-3 ml-auto">
                <div class="-mx-1.5 -my-1.5">
                    <button type="button"
                        class="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50">
                        <span class="sr-only">Dismiss</span>
                        <XMarkIcon class="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
  
<script setup lang="ts">
import { CheckCircleIcon, XMarkIcon } from '@heroicons/vue/20/solid'
</script>