<template>
  <HeadlessRadioGroup
    v-model="currentDesign"
    as="div"
    class="relative w-full @container px-4"
  >
    <div class="sticky top-0 z-10 flex justify-between px-4 py-4 shadow-sm bg-surface">
      <HeadlessRadioGroupLabel class="text-lg font-semibold tracking-wide text-text">
        {{ t('deck.selectADeck') }}
        <p class="ml-2 text-sm font-medium text-text-secondary whitespace-nowrap">
          {{ t('common.states.current') }}: {{ getDesignInfo().title }}
        </p>
      </HeadlessRadioGroupLabel>
      <div
        class="flex items-center font-semibold tracking-wide text-text gap-x-2 whitespace-nowrap"
      >
        <img
          src="/images/coin.webp"
          alt="coin"
          class="w-5 h-5 drop-shadow-sm"
        />
        {{ coins }}
      </div>
    </div>
    <div class="grid justify-center w-full pt-4 pb-12 space-y-12">
      <HeadlessRadioGroupOption
        v-for="(design, index) in sortedDesigns"
        v-slot="{ checked }"
        :class="[
          design,
          'group rounded-sm focus-visible:ring-1 focus-visible:ring-offset-2 focus-visible:ring-primary',
        ]"
        :value="design"
        :disabled="!unlocked?.includes(design)"
        @pointerenter="cacheDesignOnHover(design, getDesignInfo(design).formatExt)"
      >
        <div
          :class="[
            'grid w-full rounded-[inherit] @lg:grid-cols-[200px,1fr] place-items-center grid-rows-[200px,1fr] @lg:grid-rows-1 relative',
            checked ? 'ring-2 ring-primary' : 'ring-0',
          ]"
        >
          <!-- CARD DISPLAY -->
          <Transition
            mode="out-in"
            enter-to-class="opacity-100"
            enter-from-class="opacity-0 -scale-x-[25%] motion-reduce:scale-x-100"
            enter-active-class="duration-500"
            leave-to-class="opacity-0"
            leave-from-class="opacity-100"
            leave-active-class="duration-400"
          >
            <div
              v-if="!checked"
              :class="['cursor-pointer relative card down isolate drop-shadow-md mx-auto']"
            >
              <!-- NEW DESIGN TAG -->
              <span
                v-if="isNew(design)"
                class="absolute top-0 left-0 px-2 py-1 text-xs font-semibold tracking-wide text-white bg-primary rounded-tl-md rounded-br-md"
              >
                New
              </span>
              <!-- UNLOCK BUTTON -->
              <button
                type="button"
                v-if="unlocked && !unlocked.includes(design)"
                @click="() => handleUnlock(design)"
                class="rounded-[inherit]"
              >
                <div
                  class="absolute inset-0 h-full transition-opacity bg-surface opacity-50 ring-1 ring-border rounded-[inherit] -z-10 group-hover:opacity-75"
                ></div>
                <LockClosedIcon
                  class="absolute inset-x-0 w-8 h-auto mx-auto text-text top-1/3 group-hover:opacity-0"
                />
                <LockOpenIcon
                  class="absolute inset-x-0 w-8 h-auto mx-auto translate-x-1 opacity-0 text-text top-1/3 group-hover:opacity-100"
                />
                <div
                  class="absolute inset-x-0 mx-auto text-sm font-semibold tracking-wide transition-all opacity-0 text-text w-max bottom-4 group-hover:opacity-100 group-hover:-translate-y-2"
                >
                  <img
                    src="/images/coin.webp"
                    alt="coin"
                    class="inline w-4 h-4 align-middle drop-shadow-sm"
                  />
                  {{ isNew(design) ? 0 : UNLOCK_COST }}
                </div>
              </button>
            </div>
            <AnimatedCards v-else />
          </Transition>

          <!-- DESCRIPTION SECTION -->
          <div :class="['relative w-full @md:w-[360px] space-y-4 px-4 pb-4 rounded-sm text-text']">
            <div class="flex items-start float-right mt-4 gap-x-2">
              <!-- SELECTION INDICATOR -->
              <span
                v-if="checked"
                aria-label="{{ t('common.states.selected') }}"
                class="w-6 h-6"
              >
                <span class="sr-only">{{ t('common.states.selected') }}</span>
                <CheckCircleIcon
                  aria-hidden
                  class="w-full h-full text-primary"
                />
              </span>
              <!-- LIKE BUTTON -->
              <button
                type="button"
                aria-label="{{ t('common.actions.like') }}"
                @click="() => handleLike(design)"
                :class="[
                  'flex items-center gap-2 px-2 text-sm rounded-md transition-colors pointer-events-auto',
                  'focus:outline-none focus-visible:outline-none',
                  'focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isLiked(design)
                    ? 'text-primary hover:text-primary/80'
                    : 'text-text-secondary hover:text-primary/80',
                ]"
              >
                <!-- <span
            class="absolute pt-1 m-auto text-sm opacity-50 text-text -left-3"
            >{{ likesCount.get(design) }}</span
            > -->
                <Icon
                  :name="isLiked(design) ? 'heroicons:heart-solid' : 'heroicons:heart'"
                  class="w-6 h-6"
                />
              </button>
            </div>

            <DesignDescription
              :design="design"
              :is-new="isNew(design)"
            />
          </div>
          <div
            v-if="index < DESIGNS.length - 1"
            class="absolute bottom-0 left-0 right-0"
          >
            <div class="relative">
              <div
                class="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div class="w-[90%] mx-auto mt-12 border-b border-border opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </HeadlessRadioGroupOption>
    </div>

    <Modal :open="!!newUnlock">
      <template #image>
        <div :class="[newUnlock?.design, 'flex items-center text-text justify-center']">
          <img
            src="/images/coin.webp"
            alt="coin"
            class="inline w-8 h-8 drop-shadow-sm"
          />
          <ArrowRightIcon class="inline w-5 h-5 mx-2" />
          <LockOpenIcon class="w-8 h-auto" />
        </div>
      </template>

      <template #description>
        <div class="p-4">
          <template v-if="newUnlock?.cost === 0">
            <strong class="block text-xl tracking-wide text-text">
              {{ t('deck.limitedTimeOffer') }}
            </strong>
            <br />
          </template>
          <span class="text-lg text-text">
            {{ t('deck.tradeCoins', { cost: newUnlock?.cost }) }}
          </span>
        </div>
      </template>

      <template #actions>
        <div class="grid grid-flow-row-dense gap-3 mt-6 sm:grid-cols-2">
          <button
            type="button"
            class="text-base pri-btn"
            @click="confirmUnlock"
          >
            {{ t('deck.yesUnlockIt') }}
          </button>
          <button
            type="button"
            class="text-base sec-btn sm:order-first"
            @click="cancelUnlock"
          >
            {{ t('deck.noKeepCoins') }}
          </button>
        </div>
      </template>
    </Modal>
  </HeadlessRadioGroup>
</template>

<script setup lang="ts">
import {
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/vue/20/solid'
import { useToast } from 'vue-toastification'
import DesignDescription from './DesignDescription.vue'

type CardDesign = (typeof DESIGNS)[number]

const { DESIGNS, currentDesign, getDesignInfo } = useCardDesign()
const { cacheDesignOnHover } = useCardCache()
const toast = useToast()
const { t } = useI18n()

const isNew = (design: CardDesign) => {
  const { releaseDate } = getDesignInfo(design)
  if (!releaseDate) return false
  const isRecent = new Date().getTime() - new Date(releaseDate).getTime() < 1000 * 60 * 60 * 24 * 14
  return isRecent
}

const sortedDesigns = computed(() => {
  const newDesigns: CardDesign[] = []
  const oldDesigns: CardDesign[] = []
  const lockedDesigns: CardDesign[] = []

  for (const design of DESIGNS) {
    const isUnlocked = unlocked.value?.includes(design) ?? false

    if (isNew(design)) {
      newDesigns.push(design)
    } else if (!isUnlocked) {
      lockedDesigns.push(design)
    } else {
      oldDesigns.push(design)
    }
  }

  return [...newDesigns, ...oldDesigns, ...lockedDesigns]
})

const UNLOCK_COST = 500
const currentUser = useProfile().current
const coins = computed({
  get: () => currentUser?.value?.record.coins ?? 0,
  set: (value) => {
    if (!currentUser) return
    if (!currentUser.value) return
    currentUser.value.record.coins = Number(value)
  },
})

const unlocked = computed(() => currentUser?.value?.designs.unlocked)
const newUnlock: Ref<{ design: CardDesign; cost: number } | null> = ref(null)

let initialDesign: CardDesign | undefined
let timeoutId: string | number | NodeJS.Timeout | undefined
let toastId: any

const handleUnlock = (design: CardDesign) => {
  if (!initialDesign) initialDesign = currentDesign.value
  currentDesign.value = design
  if (coins.value === undefined || !unlocked.value) return
  if (!isNew(design) && coins.value < UNLOCK_COST) {
    toast.dismiss(toastId)
    toastId = toast.info(t('deck.notices.youDontHaveEnoughCoins'), { timeout: 6000 })
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      currentDesign.value = initialDesign!
      initialDesign = undefined
    }, 5000)
    return
  }
  newUnlock.value = { design, cost: isNew(design) ? 0 : UNLOCK_COST }
}

const cancelUnlock = () => {
  newUnlock.value = null
  currentDesign.value = initialDesign!
}

const confirmUnlock = () => {
  if (coins.value === undefined || !unlocked.value) return
  if (!newUnlock.value) return
  coins.value -= newUnlock.value.cost
  unlocked.value.push(newUnlock.value.design)
  toast.success(t('deck.notices.youHaveUnlocked'), { timeout: 5000 })
  currentDesign.value = newUnlock.value.design
  newUnlock.value = null
  initialDesign = currentDesign.value
}

const userIsGuest = toValue(useAuth().userIsGuest)
const userLiked = toValue(computed(() => currentUser?.value?.designs.liked))

// const coll = collection(getFirestore(), 'users')
const likesCount = reactive<Map<CardDesign, number>>(new Map())
// const getLikesCount = async (design: CardDesign) => {
//   if (likesCount.has(design)) return likesCount.get(design)
//   const q = query(coll, where('designs.liked', 'array-contains', design))
//   const count = (await getCountFromServer(q)).data().count
//   likesCount.set(design, count)
//   return count
// }

const isLiked = (design: CardDesign) => userLiked?.includes(design)
const handleLike = (design: CardDesign) => {
  if (!userLiked) return
  if (isLiked(design)) {
    userLiked.splice(userLiked.indexOf(design), 1)
    likesCount.set(design, likesCount.get(design)! - 1)
  } else {
    userLiked.push(design)
    likesCount.set(design, likesCount.get(design)! + 1)
  }
}

onMounted(() => {
  if (!currentDesign.value || currentDesign.value === 'cherry-version') {
    const defaultDesign = unlocked.value?.find(isNew) || 'cherry-version'
    if (userIsGuest) {
      currentDesign.value = defaultDesign
    } else {
      currentDesign.value = unlocked.value?.find((d) => userLiked?.includes(d)) || defaultDesign
    }
  }
  // DESIGNS.forEach(async (design) => {
  //   likesCount.set(design, (await getLikesCount(design)) ?? 0)
  // })
})

onUnmounted(() => {
  if (initialDesign) {
    currentDesign.value = initialDesign
  }
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = undefined
    newUnlock.value = null
  }
})
</script>
