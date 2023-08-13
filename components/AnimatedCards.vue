<template>
  <Transition
    mode="out-in"
    enter-to-class="opacity-100"
    enter-from-class="opacity-0 -scale-x-[25%]"
    enter-active-class="duration-500"
    leave-to-class="opacity-0"
    leave-from-class="opacity-100"
    leave-active-class="duration-400"
  >
    <div v-if="loaded" class="cards" :key="selectedDesign">
      <div class="drop-shadow-md animated-card card one">
        <CardImage card="matsu-ni-tsuru" :src="getCardUrl('matsu-ni-tsuru')!" />
      </div>
      <div class="drop-shadow-md animated-card card two">
        <CardImage card="sakura-ni-maku" :src="getCardUrl('sakura-ni-maku')!" />
      </div>
      <div class="drop-shadow-md animated-card card three">
        <CardImage card="susuki-ni-tsuki" :src="getCardUrl('susuki-ni-tsuki')!" />
      </div>
      <div class="drop-shadow-md animated-card card four">
        <CardImage
          card="yanagi-ni-ono-no-toufuu"
          :src="getCardUrl('yanagi-ni-ono-no-toufuu')!"
        />
      </div>
      <div class="drop-shadow-md animated-card card five">
        <CardImage card="kiri-ni-ho-oh" :src="getCardUrl('kiri-ni-ho-oh')!" />
      </div>
      <p v-if="title" class="tracking-wide">{{ title }}</p>
    </div>
    <CardsLoader v-else :no-text="true" />
  </Transition>
</template>

<script setup lang="ts">
const { getCardUrl, useDesign } = useCardDesign();

const selectedDesign = useDesign();
const loaded = ref(false);

const { title } = defineProps<{ title?: string }>();

const animateLoad = async () => {
  loaded.value = false;
  await sleep(2000);
  loaded.value = true;
};
onMounted(() => {
  animateLoad();
  watch(selectedDesign, () => {
    animateLoad();
  });
});
</script>
<style scoped>
.cards {
  /* // Outer wrapper for all cards */
  position: relative;
  /* // Get control of the positioning */
  margin: 50px auto;
  /* // Centers it on page */
  height: 100px;
  /* // height of each card */
  aspect-ratio: var(--card-aspect);
  font-size: 30px;
  /* //size of number */
  line-height: 38px;
  /* //affects vert position of number */
  font-weight: bold;
  /* //font weight */

  .animated-card {
    /* // Common styles for all cards */
    position: absolute;
    /* //Position all cards on top of each other */
    width: 100%;
    /* //Expand to fill the parent's width */
    height: 100%;
    /* //Expand to fill the parent's height */
    /* animation-iteration-count: infinite; */
    /* animation-direction: alternate-reverse; */
    overflow: hidden;
    animation-fill-mode: forwards;
    animation-duration: 2s;
    /* //<- Play with this */
  }

  p {
    /* // style and position the message below */
    font-size: 0.5em;
    position: absolute;
    bottom: -45px;
    left: -13px;
    margin: 0;
  }

  /* // Move and rotate each card */
  /* // Translate moves x and sometimes y */
  .one {
    animation-name: anim-one;

    @keyframes anim-one {
      from {
        transform: translate(0) rotate(0deg);
      }

      to {
        transform: translate(-30px, 5px) rotate(-45deg);
      }

      /* to {
        transform: translate(0) rotate(0deg);
      } */
    }
  }

  .two {
    animation-name: anim-two;

    @keyframes anim-two {
      from {
        transform: translate(0) rotate(0deg);
      }

      to {
        transform: translate(-15px) rotate(-25deg);
      }

      /* to {
        transform: translate(0) rotate(0deg);
      } */
    }
  }

  .three {
    animation-name: anim-three;

    @keyframes anim-three {
      from {
        transform: translate(0) rotate(0deg);
      }

      to {
        transform: rotate(-5deg);
      }

      /* to {
        transform: translate(0) rotate(0deg);
      } */
    }
  }

  .four {
    animation-name: anim-five;

    @keyframes anim-five {
      from {
        transform: translate(0) rotate(0deg);
      }

      to {
        transform: translate(15px, 5px) rotate(15deg);
      }

      /* to {
        transform: translate(0) rotate(0deg);
      } */
    }
  }

  .five {
    animation-name: anim-eight;

    @keyframes anim-eight {
      from {
        transform: translate(0) rotate(0deg);
      }

      to {
        transform: translate(28px, 14px) rotate(35deg);
      }

      /* to {
        transform: translate(0) rotate(0deg);
      } */
    }
  }
}
</style>
