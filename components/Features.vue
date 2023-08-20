<template>
  <div class="py-24 bg-white dark:bg-gray-800 sm:py-32">
    <div class="px-6 mx-auto max-w-7xl lg:px-8">
      <div class="max-w-2xl mx-auto lg:text-center">
        <h2 class="text-base font-semibold leading-7 text-indigo-600 dark:text-yellow-300">Deploy faster</h2>
        <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">Everything you need to deploy your app</p>
        <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">Quis tellus eget adipiscing convallis sit sit eget aliquet quis. Suspendisse eget egestas a elementum pulvinar et feugiat blandit at. In mi viverra elit nunc.</p>
      </div>
      <div class="max-w-2xl mx-auto mt-16 sm:mt-20 lg:mt-24 lg:max-w-none">
        <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
          <div v-for="feature in features" :key="feature.name" class="flex flex-col">
            <dt class="flex items-center text-base font-semibold leading-7 text-gray-900 dark:text-white gap-x-3">
              <component :is="feature.icon" class="flex-none w-5 h-5 text-indigo-600 dark:text-yellow-300" aria-hidden="true" />
              {{ feature.name }}
            </dt>
            <dd class="flex flex-col flex-auto mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
              <p class="flex-auto">{{ feature.description }}</p>
              <p class="mt-6">
                <a :href="feature.href" class="text-sm font-semibold leading-6 text-indigo-600 dark:text-yellow-300">Learn more <span aria-hidden="true">→</span></a>
              </p>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="js">
import { InboxIcon, TrashIcon, UsersIcon } from '@heroicons/vue/24/outline'

const features = [
    {
        name: 'Classic games',
        description:
            'Non quo aperiam repellendus quas est est. Eos aut dolore aut ut sit nesciunt. Ex tempora quia. Sit nobis consequatur dolores incidunt.',
        href: '#',
        icon: InboxIcon,
    },
    {
        name: 'Creative designs',
        description:
            'Vero eum voluptatem aliquid nostrum voluptatem. Vitae esse natus. Earum nihil deserunt eos quasi cupiditate. A inventore et molestiae natus.',
        href: '#',
        icon: UsersIcon,
    },
    {
        name: 'Worldwide community',
        description:
            'Et quod quaerat dolorem quaerat architecto aliquam accusantium. Ex adipisci et doloremque autem quia quam. Quis eos molestiae at iure impedit.',
        href: '#',
        icon: TrashIcon,
    },
]
</script>
