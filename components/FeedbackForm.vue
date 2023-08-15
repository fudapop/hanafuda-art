<template>
  <Modal :open="open">
    <template #title> Thank you for playing! </template>
    <template #image>
      <!-- <img
        v-if="!submitted"
        src="/images/sakura.webp"
        alt="cherry blossom"
        class="w-12 h-12 motion-safe:animate-spin motion-safe:[animation-duration:10s] mx-auto"
      /> -->
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
      <form v-if="!submitted" @submit="handleSubmit">
        <fieldset class="bg-gray-50 shadow-inner rounded-lg px-4 pb-6 mt-4">
          <div class="mt-5 flex gap-4 w-full justify-between">
            <p>Animation Smoothness</p>
            <StarRating
              ratingId="animation-rating"
              v-model.number="feedback['animation-rating']"
            />
          </div>
          <div class="mt-5 flex gap-4 w-full justify-between">
            <p>Ease of Controls</p>
            <StarRating
              ratingId="controls-rating"
              v-model.number="feedback['controls-rating']"
            />
          </div>
          <div class="mt-5 flex gap-4 w-full justify-between">
            <p>Image Quality</p>
            <StarRating
              ratingId="image-rating"
              v-model.number="feedback['image-rating']"
            />
          </div>
        </fieldset>
        <fieldset class="mt-5 grid gap-y-1">
          <label for="comment-box">Comments</label>
          <OptionsRadioGroup
            :model-value="comments.tag"
            :value-options="tags"
            :update-callback="(option) => comments.tag = (option as CommentTag)"
            :label-template="(option) => includeTagEmoji(option as CommentTag)"
          >
            <span class="sr-only">Comment Type</span>
          </OptionsRadioGroup>
          <textarea
            autofocus
            id="comment-box"
            rows="3"
            v-model="comments.message"
            class="bg-gray-50 shadow-inner rounded-lg p-2"
            placeholder="Your feedback is greatly appreciated! 🙏🏽"
          />
        </fieldset>
        <div class="mt-4 w-max float-right flex gap-x-4">
          <Button type="button" button-class="secondary" :action="() => $emit('close')"
            >Close</Button
          >
          <Button type="submit" button-class="primary" :disabled="incomplete"
            >Submit</Button
          >
        </div>
      </form>
      <div v-else class="mt-4 w-max float-right">
        <Button button-class="primary" :action="() => $emit('close')" autofocus
          >Close</Button
        >
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import {
  HandThumbUpIcon,
  HandThumbDownIcon,
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

const submitted = useStorage("hanafuda-feedback", false, localStorage, {
  mergeDefaults: true,
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
    body: JSON.stringify(params), // <-- parameters are sent as JSON array
  });

  return await response.json();
}
</script>
