<template>
  <div class="cards">
    <div class="animated-card down card one"></div>
    <div class="animated-card down card two"></div>
    <div class="animated-card down card three"></div>
    <div class="animated-card down card four"></div>
    <div class="animated-card down card five"></div>
    <p
      class="tracking-wide animate-pulse [animation-duration:4s] text-gray-900 dark:text-white"
    >
      Loading...
    </p>
  </div>
</template>

<script setup lang="ts"></script>
<style scoped>
.cards {
  /* // Outer wrapper for all cards */
  position: relative; /* // Get control of the positioning */
  margin: 50px auto; /* // Centers it on page */
  height: 60px; /* // height of each card */
  aspect-ratio: var(--card-aspect);
  font-size: 30px; /* //size of number */
  line-height: 38px; /* //affects vert position of number */
  font-weight: bold; /* //font weight */

  .animated-card {
    /* // Common styles for all cards */
    position: absolute; /* //Position all cards on top of each other */
    width: 100%; /* //Expand to fill the parent's width */
    height: 100%; /* //Expand to fill the parent's height */
    animation-iteration-count: infinite;
    animation-direction: alternate-reverse;
    overflow: hidden;
    /* animation-fill-mode: forwards; */
    animation-duration: 2s; /* //<- Play with this */
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
