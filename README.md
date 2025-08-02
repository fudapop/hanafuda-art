# New Hanafuda

A modern Hanafuda Koi-Koi game built with Nuxt 3, Vue 3, and Firebase.

## Features

- **Hanafuda Koi-Koi Game**: Traditional Japanese card game with beautiful animations
- **Multiplayer Support**: Play with friends online
- **User Profiles**: Track your game statistics and rankings
- **Design Submissions**: Submit your artwork to be featured in the game
- **Internationalization**: Available in English and Japanese

## Design Submissions

The application includes a design submission system where artists can:

- Upload their artwork (PNG, JPEG, WebP up to 10MB)
- Provide artist information and social media links
- Get their designs reviewed by the admin team
- Receive email notifications upon submission

### Submission Process

1. Visit `/submissions` page
2. Upload your design file using the drag-and-drop interface
3. Fill in your artist information and description
4. Optionally add social media links (Instagram, Twitter, website, portfolio)
5. Submit for review

All submissions are stored in Firebase Storage and metadata is saved in Firestore. Admins receive email notifications via Resend.

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Firebase Configuration
API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_firebase_private_key\n-----END PRIVATE KEY-----\n"

# Resend Configuration
RESEND_API_KEY=your_resend_api_key

# Supabase Configuration
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key

# ReCaptcha
RECAPTCHA_KEY=your_recaptcha_key
APPCHECK_DEBUG_TOKEN=your_appcheck_debug_token
```

## Firebase Setup

### Storage Rules

Deploy the storage rules for submissions:

```bash
firebase deploy --only storage
```

### Firestore Rules

Deploy the Firestore rules:

```bash
firebase deploy --only firestore:rules
```

## Tech Stack

- **Framework**: Nuxt 3
- **UI**: Vue 3 + Composition API
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore + Supabase
- **Storage**: Firebase Storage
- **Email**: Resend
- **Authentication**: Firebase Auth + VueFire
- **Package Manager**: pnpm

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Deployment

The application is configured for Firebase Hosting. Deploy with:

```bash
pnpm build
firebase deploy
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

