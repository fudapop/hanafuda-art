<template>
  <Modal
    :open="props.open"
    :padded="false"
  >
    <template #title>
      <template v-if="!submitted">
        <ChatBubbleLeftEllipsisIcon
          class="inline-flex w-6 h-6 mr-2 text-primary"
          aria-hidden="true"
        />
        <h1 class="text-2xl font-bold text-balance">{{ t('multiplayerFeedback.title') }}</h1>
      </template>
    </template>
    <template
      v-if="!submitted"
      #description
    />
    <template #actions>
      <form
        v-show="!submitted"
        @submit.prevent="handleSubmit"
        class="px-5 pb-5 mt-2 text-text sm:px-8 sm:pb-6"
      >
        <!-- Star rating section -->
        <fieldset class="py-5 border-t border-border/60">
          <legend class="px-2 text-sm font-semibold tracking-wide uppercase text-text-secondary">
            {{ t('multiplayerFeedback.overallExperience') }}
          </legend>
          <StarRating
            class="justify-center mt-1"
            ratingId="multiplayer-experience"
            v-model.number="rating"
          />
        </fieldset>

        <!-- Comments section -->
        <fieldset class="pt-5 border-t border-border/60">
          <legend class="px-2 text-sm font-semibold tracking-wide uppercase text-text-secondary">
            {{ t('multiplayerFeedback.comments.title') }}
          </legend>
          <OptionsRadioGroup
            :model-value="comments.tag"
            :value-options="tags"
            :update-callback="(option) => (comments.tag = option as CommentTag)"
            :label-template="(option) => t(`multiplayerFeedback.comments.types.${option as CommentTag}`)"
            class-name="mt-3 mb-3 grid grid-cols-3 gap-x-2 text-xs"
          >
            <span class="sr-only">{{ t('multiplayerFeedback.comments.type') }}</span>
          </OptionsRadioGroup>
          <p class="mb-2 text-sm leading-5 text-text-secondary h-[2.5rem]">
            {{ t(`multiplayerFeedback.comments.descriptions.${comments.tag}`) }}
          </p>
          <textarea
            id="mp-comment-box"
            rows="3"
            v-model="comments.message"
            class="w-full p-3 text-sm border rounded-xs text-text bg-background/60 border-border/80 placeholder:text-text-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none transition-colors"
            :disabled="submitted"
            :placeholder="t('multiplayerFeedback.comments.placeholder')"
          />
        </fieldset>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-5 mt-5 border-t border-border/60">
          <button
            type="button"
            class="sec-btn"
            @click="() => { handleDismiss(); $emit('close') }"
          >
            {{ t('common.actions.close') }}
          </button>
          <button
            type="submit"
            class="pri-btn"
            :disabled="!rating || submitting"
            :aria-disabled="!rating || submitting"
          >
            {{ t('common.actions.submit') }}
          </button>
        </div>
      </form>
      <div
        v-show="submitted"
        class="flex flex-col items-center gap-4 px-5 py-6 sm:px-8"
      >
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-hanafuda-green/10">
          <CheckIcon
            class="w-6 h-6 text-hanafuda-green"
            aria-hidden="true"
          />
        </div>
        <p class="text-center text-text">{{ t('multiplayerFeedback.submitted') }}</p>
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

const props = defineProps<{ open: boolean }>()
defineEmits(['close'])

const { t } = useI18n()
const { $clientPosthog } = useNuxtApp()
const { current: user } = useProfile()

const SURVEY_ID = '' // TODO: set after creating the PostHog survey
const RATING_QUESTION_ID = '' // TODO: set after creating the PostHog survey
const COMMENT_QUESTION_ID = '' // TODO: set after creating the PostHog survey
const isSurveyConfigured = Boolean(SURVEY_ID)

const tags = ['idea', 'error', 'other'] as const
type CommentTag = (typeof tags)[number]

const rating = ref(0)
const comments = reactive({
  tag: 'other' as CommentTag,
  message: '',
})
const submitted = useState('mp-feedback-submitted', () => false)
const submitting = ref(false)

const surveyEventProps = { $survey_id: SURVEY_ID }

watch(() => props.open, (isOpen) => {
  if (isOpen && !submitted.value && isSurveyConfigured) {
    $clientPosthog?.capture('survey shown', surveyEventProps)
  }
})

const handleDismiss = () => {
  if (!submitted.value && isSurveyConfigured) {
    $clientPosthog?.capture('survey dismissed', surveyEventProps)
  }
}

const saveToFirestore = async () => {
  const profile = toValue(user)
  if (!profile) return
  await setDoc(doc(getFirestore(), 'mp-feedback', `mpfb_${nanoid(15)}${Date.now()}`), {
    rating: rating.value,
    comments: { tag: comments.tag, message: comments.message },
    submitted_at: Timestamp.now(),
    submitted_by: profile.uid,
  })
}

const handleSubmit = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    await saveToFirestore()
    if (isSurveyConfigured) {
      $clientPosthog?.capture('survey sent', {
        ...surveyEventProps,
        $survey_questions: [
          { id: RATING_QUESTION_ID, question: 'How was your overall multiplayer experience?' },
          { id: COMMENT_QUESTION_ID, question: 'Any comments or feedback?' },
        ],
        [`$survey_response_${RATING_QUESTION_ID}`]: rating.value,
        [`$survey_response_${COMMENT_QUESTION_ID}`]: `[${comments.tag}] ${comments.message}`.trim(),
      })
    }
    submitted.value = true
  } catch (err) {
    console.error('Error saving multiplayer feedback:', err)
  } finally {
    submitting.value = false
  }
}
</script>
