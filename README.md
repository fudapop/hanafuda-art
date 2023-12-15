# NewHanafuda.art

This project is a web-based card game that allows you to play the Japanese card game Koi-Koi against an AI opponent. This game features beautiful artwork created by various artists, and the primary goal of the project is to share these designs by making them playable online.

**[Play now at https://newhanafuda.art!](https://newhanafuda.art)**

## How to Play

### Overview
Koi-Koi is a simple card game that is typically played with hanafuda (literally "flower cards"). In this web-based version, the game is played with a standard 48-card deck. The objective of the game is to score points by collecting sets of cards, called "yaku". Points are awarded based on the number of yaku collected, and the player with the most points at the end of the game wins.

### Gameplay
To play, simply click on the "Play now" button on the homepage. You will be dealt a hand of cards, and the AI opponent will be dealt a hand as well. To collect sets of cards, you must match cards in your hand with cards on the table that share the same suit (flower). Once you have collected a yaku, you will be prompted to continue (and possibly collect more yaku) or end the round and score points.

The game ends when all cards have been played, or when one player reaches a predetermined number of points. Coins obtained in game can be used to unlock different hanafuda designs!

**[Try playing a round!](https://newhanafuda.art)**

### Rule Variations
Many different rules and game variants exist for Koi-Koi. This version offers some optional scoring rules with more to be added. More in-depth guides on rules and scoring can be found using the links below.


## Artwork
The artwork featured on this site was created by various artists, and can be found in the "public/cards" directory of the repository. The history of Hanafuda reaches back quite far, but new reimaginations of the classic designs continue to surface to this day!

<div style="display:flex;justify-content:space-around;align-items:center;">
  <img class="card1" src="https://firebasestorage.googleapis.com/v0/b/new-hanafuda.appspot.com/o/cards%2Fhanamaki%2Fmatsu-ni-tsuru.webp?alt=media&token=8a04c131-12d7-4b3c-8f1b-4076f3d67214" alt="Design from gamedesign.jp" />
  <span class="card2">
    <img class="card2-1" src="https://firebasestorage.googleapis.com/v0/b/new-hanafuda.appspot.com/o/cards%2Fcherry-version%2Fmatsu-ni-tsuru.webp?alt=media&token=411c5696-83dc-4f67-989d-c3e047112868" alt="Design by Parish Cherry" /> 
    <!-- <img class="card2-2" src="https://firebasestorage.googleapis.com/v0/b/new-hanafuda.appspot.com/o/cards%2Fvaporwave%2Fmatsu-ni-tsuru.webp?alt=media&token=771e15ff-5513-4da8-898e-918e65fe36a1" alt="Design by Heavenlysome" />  -->
  </span>
  <span class="card3" style="border-radius:1rem;overflow:hidden;height:175px;">
    <img src="https://firebasestorage.googleapis.com/v0/b/new-hanafuda.appspot.com/o/cards%2Fsabling-art%2Fmatsu-ni-tsuru.webp?alt=media&token=214a6b3a-3649-4bc9-8855-35f58b8743a6" alt="Design by Sabling" /> 
  </span>
</div>
<style>
  :root {
    --duration: 30s;
  }
  @media (prefers-reduced-motion: no-preference) {
    .card1 {
      animation: revolveRight var(--duration) ease-in-out infinite;
        /* fadeOut1 24s ease-in-out infinite 3s; */
    }
    .card2 {
      position: relative;
      .card2-1 {
        /* position: absolute; */
        /* animation: fadeOut2 var(--duration) ease-in-out infinite; */
      }
    }
    .card3 {
      animation: revolveLeft var(--duration) ease-in-out infinite;
    }
    @keyframes fadeOut1 {
      25%, 76%  {
        opacity: 1;
      }
      26%, 75% {
        opacity: 0;
      }
    }
    @keyframes fadeOut2 {
      24%, 75%  {
        opacity: 1;
      }
      25%, 74% {
        opacity: 0;
      }
    }
    @keyframes revolveLeft {
      0%, 100% {
        translate: 0 0;
      }
      25% {
        scale: 0.8;
        z-index: -1;
      }
      75% {
        scale: 1.2;
        z-index: 1;
      }
      50% {
        translate: -450px 0;
      }
    }
    @keyframes revolveRight {
      0%, 100% {
        translate: 0 0;
      }
      25% {
        scale: 1.2;
        z-index: 1;
      }
      75% {
        scale: 0.8;
        z-index: -1;
      }
      50% {
        translate: 450px 0;
      }
    }
  }
</style>

### Attributions
The currently available designs in the game are attributed to the following artists:

|Design|Artist|
|---|---|
|[Modern Hanafuda](www.modernhanafuda.net)|Sarah Thomas|
|Moon Rabbit Hanafuda|[Kelsey Cretcher](https://www.deviantart.com/kcretcher)|
|[Nishiki Fuda](https://nishikie.stores.jp/)|Estudio Artes|
|Pokemon Hanafuda|[Sabling](https://ko-fi.com/sabling/)|
|[Koinobori & Hanami Hanafuda](https://indianwolfstudios.com/shop/)|IndianWolf Studios|
|[Hanafuda](https://parishcherry.com/hanafuda)|Parish Cherry|
|[Hanamaki Hanafuda](https://japanplayingcardmuseum.com/edo-showa-dentou-hanafuda/)|Tsuruta|
|Vaporwave Hanafuda|Heavenlysome|


## Contribution
Whether you're an artist, developer, or fellow hanafuda enthusiast, contributions are certainly welcome! Check our **[CONTRIBUTING](CONTRIBUTING.md)** page to see how you can contribute to this project!


## Development
If you would like to run a local copy of Let's Play Koi-Koi for development or testing purposes, follow these steps:

1. Clone the repository to your local machine.
2. Install the necessary dependencies by running npm install in the root directory of the project.
3. Run the development server by running npm run dev.
4. Navigate to http://localhost:3000 in your web browser.

### Technologies
This project was built using the Nuxt.js, Vue.js, and TypeScript.


## Credits
This project was created by our contributors and is licensed under the MIT License. All artworks used in the game are attributed to and are property of the respective artists.

