<template>
  <Modal :open="open">
    <template #title> Thank you for playing! </template>
    <template #image>
      <div
        v-if="!submitted"
        class="flex items-center justify-center w-12 h-12 mx-auto bg-indigo-100 rounded-full"
      >
        <ChatBubbleLeftEllipsisIcon class="w-6 h-6 text-indigo-800" aria-hidden="true" />
      </div>
      <div
        v-else
        class="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full"
      >
        <CheckIcon class="w-6 h-6 text-green-600" aria-hidden="true" />
      </div>
    </template>
    <template v-if="submitted" #description>
      Your feedback has been submitted. Thank you!
    </template>
    <template #actions>
      <form
        v-show="!submitted"
        @submit="handleSubmit"
        class="text-gray-900 dark:text-white"
      >
        <fieldset
          class="px-4 pt-4 pb-8 mt-4 rounded-lg shadow-inner sm:pb-2 bg-gray-50 dark:bg-gray-700"
        >
          <div class="grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8">
            <p>Animation Smoothness</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="animation-rating"
              v-model.number="feedback['animation-rating']"
            />
          </div>
          <div
            class="mt-8 sm:mt-5 grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8"
          >
            <p>Ease of Controls</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="controls-rating"
              v-model.number="feedback['controls-rating']"
            />
          </div>
          <div
            class="mt-8 sm:mt-5 grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8"
          >
            <p>Image Quality</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="image-rating"
              v-model.number="feedback['image-rating']"
            />
          </div>
        </fieldset>
        <fieldset class="grid mt-5 gap-y-1">
          <label for="comment-box">Comments</label>
          <OptionsRadioGroup
            :model-value="comments.tag"
            :value-options="tags"
            :update-callback="(option) => comments.tag = (option as CommentTag)"
            :label-template="(option) => includeTagEmoji(option as CommentTag)"
            class-name="mt-2 mb-4 grid grid-cols-3 gap-y-2 gap-x-2"
          >
            <span class="sr-only">Comment Type</span>
          </OptionsRadioGroup>
          <textarea
            id="comment-box"
            rows="3"
            v-model="comments.message"
            class="w-full p-2 text-gray-900 rounded-lg shadow-inner bg-gray-50 dark:bg-gray-700 dark:text-white"
            placeholder="Your feedback is greatly appreciated! 🙏🏽"
          />
        </fieldset>
        <div class="flex float-right mt-4 w-max gap-x-4">
          <button type="button" class="sec-btn" @click="() => $emit('close')">
            Close
          </button>
          <button
            type="submit"
            class="pri-btn"
            @click="() => handleSubmit"
            :disabled="incomplete"
            :aria-disabled="incomplete"
          >
            Submit
          </button>
        </div>
      </form>
      <div v-show="submitted" class="float-right mt-4 w-max">
        <button type="button" class="pri-btn" @click="() => $emit('close')">Close</button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import {
  ChatBubbleLeftEllipsisIcon,
  CheckIcon,
} from "@heroicons/vue/24/outline";

const { open } = defineProps<{ open: boolean }>();

const tags = ["idea", "error", "other"] as const;
type CommentTag = typeof tags[number];

const includeTagEmoji = (option: CommentTag) => {
  let emoji = "";
  switch (option) {
    case "idea":
      emoji = "💡";
      break;

    case "error":
      emoji = "🪲";
      break;

    case "other":
    default:
      emoji = "💬";
  }
  return `${emoji} ${option}`;
};

interface Feedback {
  "animation-rating": number;
  "controls-rating": number;
  "image-rating": number;
  [x: string]: number;
}

const user = toValue(useProfile().current);
const submitted = computed({
  get: () => user?.flags?.hasSubmittedFeedback,
  set: (value) => {
    if (!user) return;
    if (!user.flags) user.flags = {};
    user.flags.hasSubmittedFeedback = value;
  },
});

const feedback: Feedback = reactive({
  "animation-rating": 0,
  "controls-rating": 0,
  "image-rating": 0,
});

const comments = reactive({
  tag: "other",
  message: "",
});

const incomplete = computed(() =>
  [
    feedback["animation-rating"],
    feedback["controls-rating"],
    feedback["image-rating"],
  ].some((fb) => !fb)
);

defineEmits(["close"]);

const handleSubmit = async (ev: Event) => {
  ev.preventDefault();
  console.log(feedback);
  try {
    await sendRatings();
    await sendComments();
    submitted.value = true;
  } catch (err) {
    console.log(err);
  }
};

async function sendRatings() {
  for (const key in feedback) {
    try {
      const submittedRatings = await apiCall("/feelbacks/create", {
        contentSetId: "7abc53d8-e03c-4689-8c66-ee6ca4e3b7d8",
        key,
        value: feedback[key],
      });
      console.log({ submission: submittedRatings });
      return submittedRatings;
    } catch (err) {
      console.error(err);
    }
  }
}

async function sendComments() {
  try {
    const submittedComments = await apiCall("/feelbacks/create", {
      contentSetId: "d955c173-33b9-4268-a96f-fe97b2d31b7a",
      key: "post-game-comments",
      value: {
        message: comments.message,
        tag: comments.tag,
      },
    });
    console.log({ submission: submittedComments });
    return submittedComments;
  } catch (err) {
    console.error(err);
  }
}

async function apiCall(path: string, ...params: any[]) {
  const endpoint = "https://api.feelback.dev/v0";
  const response = await fetch(endpoint + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(params),
  });

  return await response.json();
}
</script>
