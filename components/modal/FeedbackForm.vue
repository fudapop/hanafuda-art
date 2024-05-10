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
      <p class="text-center text-gray-900 dark:text-white">
        Your feedback has been submitted. Thank you!
      </p>
    </template>
    <template v-else #description>
      <p class="text-center text-gray-900 dark:text-white">How was your experience?</p>
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
              ratingId="animation"
              v-model.number="ratings['animation']"
            />
          </div>
          <div
            class="mt-10 sm:mt-5 grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8"
          >
            <p>Ease of Controls</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="controls"
              v-model.number="ratings['controls']"
            />
          </div>
          <div
            class="mt-10 sm:mt-5 grid grid-rows-2 min-w-[300px] sm:grid-cols-2 w-full h-8"
          >
            <p>Image Quality</p>
            <StarRating
              class="max-sm:mt-4 max-sm:-translate-x-2"
              ratingId="image"
              v-model.number="ratings['image']"
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
            class-name="mt-2 mb-4 grid grid-cols-3 gap-y-1 gap-x-1 text-xs"
          >
            <span class="sr-only">Comment Type</span>
          </OptionsRadioGroup>
          <textarea
            id="comment-box"
            rows="3"
            v-model="comments.message"
            class="w-full p-2 text-gray-900 rounded-lg shadow-inner bg-gray-50 dark:bg-gray-700 dark:text-white"
            placeholder="Please enter any comments here. Your feedback is greatly appreciated! 🙏🏽"
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
import { ChatBubbleLeftEllipsisIcon, CheckIcon } from "@heroicons/vue/24/outline";
import {
	doc,
	setDoc,
	getFirestore,
  Timestamp,
} from "firebase/firestore";
import { nanoid } from "nanoid";

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
  "animation": number;
  "controls": number;
  "image": number;
  [x: string]: number;
}

const user = toValue(useProfile().current);

const ratings: Feedback = reactive({
  "animation": 0,
  "controls": 0,
  "image": 0,
});

const comments = reactive({
  tag: "other",
  message: "",
});

const submitted = computed({
  get: () => user?.flags?.hasSubmittedFeedback,
  set: (value) => {
    if (!user) return;
    if (!user.flags) user.flags = {};
    user.flags.hasSubmittedFeedback = value;
  },
});

const incomplete = computed(() =>
[
  ratings["animation"],
  ratings["controls"],
  ratings["image"],
].some((fb) => !fb)
);

defineEmits(["close"]);

const saveFeedback = async () => {
    if (!user) return;
    setDoc(
      doc(getFirestore(), "feedback", `fb_${nanoid(15)}${Date.now()}`),
      {
        ratings: ratings,
        comments,
        submitted_at: Timestamp.now(),
        submitted_by: user.isGuest
          ? `g_${user?.uid}`
          : doc(getFirestore(), "users", `u_${user.uid}`)
      }
    );
  };

const handleSubmit = async (ev: Event) => {
  ev.preventDefault();
  try {
    saveFeedback();
    submitted.value = true;
  } catch (err) {
    console.log(err);
  }
};
</script>
