// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	css: ["@/assets/css/card-styles.css"],
	devtools: { enabled: true },
	app: {
		head: {
			bodyAttrs: {
				class: "dark:bg-gray-800",
			},
			htmlAttrs: {
				lang: "en",
			},
			link: [
				{
					rel: "icon",
					href: "/sakura.png",
				},
			],
			script: [
				{
					id: "Cookiebot",
					src: "https://consent.cookiebot.com/uc.js",
					"data-cbid": "ac02cfdd-be85-4af4-8f58-9b6604169432",
					type: "text/javascript",
					async: true,
				},
			],
		},
		pageTransition: { name: "page", mode: "out-in" },
	},
	image: {
		cloudinary: {
			baseURL: "https://res.cloudinary.com/dap2o5kiu/image/upload",
		},
	},
	modules: [
		"@pinia/nuxt",
		"@nuxtjs/tailwindcss",
		"nuxt-icon",
		"nuxt-headlessui",
		"@nuxt/image",
		"nuxt-vitest",
		"nuxt-vuefire",
	],
	postcss: {
		plugins: {
			"tailwindcss/nesting": {},
			tailwindcss: {},
			autoprefixer: {},
		},
	},
	runtimeConfig: {
		public: {
			nodeEnv: process.env.NODE_ENV,
		},
	},
	ssr: false,
	tailwindcss: {
		viewer: false,
	},
	vuefire: {
		auth: true,
		appCheck: {
			debug: process.env.APPCHECK_DEBUG_TOKEN,
			isTokenAutoRefreshEnabled: true,
			provider: "ReCaptchaV3",
			key: process.env.RECAPTCHA_KEY!,
		},
		config: {
			apiKey: process.env.API_KEY,
			authDomain: "new-hanafuda.firebaseapp.com",
			projectId: "new-hanafuda",
			storageBucket: "new-hanafuda.appspot.com",
			messagingSenderId: "938327095699",
			appId: "1:938327095699:web:b79f95821825d93b295066",
			measurementId: "G-RDPJ7SKMBT",
		},
	},
});
