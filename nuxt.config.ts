// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	css: ["@/assets/css/card-styles.css"],
	devtools: { enabled: true },
	app: {
		head: {
			link: [
				{
					rel: "icon",
					href: "/sakura.png",
				},
			],
		},
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
		nodeEnv: process.env.NODE_ENV,
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
