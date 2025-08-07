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

All submissions are stored in Supabase Storage and metadata is saved in the Supabase database. Admins receive email notifications via Resend.

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Supabase Configuration
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_service_role_key

# Resend Configuration
RESEND_API_KEY=your_resend_api_key

# Firebase Configuration (existing game features)
API_KEY=your_firebase_api_key

# ReCaptcha
RECAPTCHA_KEY=your_recaptcha_key
APPCHECK_DEBUG_TOKEN=your_appcheck_debug_token
```

## Database Setup

### Run Supabase Migrations

Run the migrations to create the submissions table and storage bucket:

```bash
npx supabase migration up
```

Or apply them manually in your Supabase dashboard:

1. Create the submissions table (see `supabase/migrations/20250806000001_create_submissions_table.sql`)
2. Set up the storage bucket and policies (see `supabase/migrations/20250806000002_create_submissions_bucket.sql`)

### Storage Bucket

The submissions feature uses a Supabase storage bucket called `submissions` with:
- 10MB file size limit
- Allowed file types: PNG, JPEG, WebP
- Public read access
- Upload restrictions via RLS policies

## Edge Function Setup

### Deploy the Supabase Edge Function

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Set the required secrets for the Edge Function:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   ```

4. Deploy the Edge Function:
   ```bash
   supabase functions deploy submit-design
   ```

### Edge Function Environment Variables

The Edge Function automatically has access to:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations

You need to manually set:
- `RESEND_API_KEY` - Your Resend API key for sending emails

## Tech Stack

- **Framework**: Nuxt 3
- **UI**: Vue 3 + Composition API
- **Styling**: Tailwind CSS
- **Database**: Supabase + Firebase Firestore (legacy features)
- **Storage**: Supabase Storage
- **Email**: Resend
- **Edge Functions**: Supabase Edge Functions (Deno)
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

### Testing the Edge Function Locally

To test the Edge Function locally:

```bash
supabase functions serve submit-design --env-file .env.local
```

## Deployment

The application is configured for Firebase Hosting. Deploy with:

```bash
pnpm build
firebase deploy
```

Don't forget to deploy the Supabase Edge Function as described above.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

