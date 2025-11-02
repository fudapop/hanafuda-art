<template>
  <Modal
    :open="open"
    :padded="false"
  >
    <template #title>
      <ChatBubbleLeftEllipsisIcon
        class="inline-flex w-6 h-6 mr-2 text-primary"
        aria-hidden="true"
      />
      <h1 class="text-2xl font-bold text-balance">{{ t('feedback.thankYouForPlaying') }}</h1>
    </template>
    <template
      v-if="submitted"
      #image
    >
      <div
        class="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-hanafuda-green/10"
      >
        <CheckIcon
          class="w-6 h-6 text-hanafuda-green"
          aria-hidden="true"
        />
      </div>
    </template>
    <template
      v-if="submitted"
      #description
    >
      <p class="text-center text-text">{{ t('feedback.feedbackSubmitted') }}</p>
    </template>
    <template
      v-else
      #description
    >
      <p class="text-center text-text">{{ t('feedback.howWasExperience') }}</p>
    </template>
    <template #actions>
      <form
        v-show="!submitted"
        @submit="handleSubmit"
        class="px-6 mt-4 text-text"
      >
        <fieldset
          class="pt-4 pb-8 border-t border-b rounded-sm border-t-border border-b-border sm:pb-2"
        >
          <div class="grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8">
            <p>{{ t('feedback.categories.animationSmoothness') }}</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="animation"
              v-model.number="ratings['animation']"
            />
          </div>
          <div class="mt-10 sm:mt-5 grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8">
            <p>{{ t('feedback.categories.easeOfControls') }}</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="controls"
              v-model.number="ratings['controls']"
            />
          </div>
          <div class="mt-10 sm:mt-5 grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8">
            <p>{{ t('feedback.categories.imageQuality') }}</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="image"
              v-model.number="ratings['image']"
            />
          </div>
          <div class="mt-10 sm:mt-5 grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8">
            <p>{{ t('feedback.categories.soundQuality') }}</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="audio"
              v-model.number="ratings['audio']"
            />
          </div>
        </fieldset>
        <fieldset class="grid mt-5 gap-y-1">
          <label for="comment-box">{{ t('feedback.comments.title') }}</label>
          <OptionsRadioGroup
            :model-value="comments.tag"
            :value-options="tags"
            :update-callback="(option) => (comments.tag = option as CommentTag)"
            :label-template="(option) => t(`feedback.comments.types.${option as CommentTag}`)"
            class-name="mt-2 mb-4 grid grid-cols-3 gap-y-1 gap-x-1 text-xs"
          >
            <span class="sr-only">{{ t('feedback.comments.type') }}</span>
          </OptionsRadioGroup>
          <p>{{ t(`feedback.comments.descriptions.${comments.tag}`) }}</p>
          <textarea
            id="comment-box"
            rows="3"
            v-model="comments.message"
            class="w-full p-2 border rounded-sm text-text bg-background border-border placeholder:text-text-secondary placeholder:opacity-50"
            :disabled="submitted"
            :placeholder="t('feedback.comments.placeholder')"
          />
        </fieldset>
        <div class="flex float-right mt-4 w-max gap-x-4">
          <button
            type="button"
            class="sec-btn"
            @click="() => $emit('close')"
          >
            {{ t('common.actions.close') }}
          </button>
          <button
            type="submit"
            class="pri-btn"
            @click="() => handleSubmit"
            :disabled="incomplete"
            :aria-disabled="incomplete"
          >
            {{ t('common.actions.submit') }}
          </button>
        </div>
      </form>
      <div
        v-show="submitted"
        class="float-right mt-4 w-max"
      >
        <button
          type="button"
          class="pri-btn"
          @click="() => $emit('close')"
        >
          {{ t('common.actions.close') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ChatBubbleLeftEllipsisIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore'
import { nanoid } from 'nanoid'

const { open } = defineProps<{ open: boolean }>()
const { t } = useI18n()

const tags = ['idea', 'error', 'other'] as const
type CommentTag = (typeof tags)[number]

interface Feedback {
  animation: number
  controls: number
  image: number
  audio: number
  [x: string]: number
}

const user = toValue(useProfile().current)

const ratings: Feedback = reactive({
  animation: 0,
  controls: 0,
  image: 0,
  audio: 0,
})

const comments = reactive({
  tag: 'other',
  message: '',
})

const commentBoxDescription = computed(() => {
  switch (comments.tag) {
    case 'idea':
      return 'How can we improve the game, or what would you like to see next?'
    case 'error':
      return 'Did you encounter any bugs?  Please describe the issue.'
    default:
      return 'Your feedback is greatly appreciated!  🙏🏽'
  }
})

const submitted = computed({
  get: () => user?.flags?.hasSubmittedFeedback,
  set: (value) => {
    if (!user) return
    if (!user.flags) user.flags = { isNewPlayer: true, hasSubmittedFeedback: false }
    user.flags.hasSubmittedFeedback = value ?? false
  },
})

const incomplete = computed(() =>
  [ratings['animation'], ratings['controls'], ratings['image'], ratings['audio']].some((fb) => !fb),
)

defineEmits(['close'])

const saveFeedback = async () => {
  if (!user) return
  setDoc(doc(getFirestore(), 'feedback', `fb_${nanoid(15)}${Date.now()}`), {
    ratings: ratings,
    comments,
    submitted_at: Timestamp.now(),
    submitted_by: `${user.uid}`,
  })
}

const handleSubmit = async (ev: Event) => {
  ev.preventDefault()
  try {
    saveFeedback()
    submitted.value = true
  } catch (err) {
    console.error('Error saving feedback:', err)
  }
}
</script>
