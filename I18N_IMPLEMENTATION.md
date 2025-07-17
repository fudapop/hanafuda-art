# Hanafuda Koi-Koi i18n Implementation

## Overview

This document explains the internationalization (i18n) implementation for the Hanafuda Koi-Koi game using the `@nuxtjs/i18n` module.

## Configuration

### Nuxt Configuration

The i18n module has been configured in `nuxt.config.ts` with the following settings:

```typescript
i18n: {
  locales: [
    {
      code: 'en',
      file: 'en.json',
      name: 'English',
      dir: 'ltr'
    }
  ],
  defaultLocale: 'en',
  langDir: 'locales/',
  strategy: 'prefix_and_default',
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: 'i18n_redirected',
    redirectOn: 'root',
    alwaysRedirect: false,
    fallbackLocale: 'en'
  },
  bundle: {
    optimizeTranslationDirective: false,
  },
}
```

### Routing Strategy

- **Strategy**: `prefix_and_default`
- **Default Locale**: English (`en`)
- **Routes**: 
  - `/` (English - no prefix)
  - `/en/` (English - with prefix)
  - Future locales will use prefixes like `/ja/`, `/es/`, etc.

## Translation File Structure

The `locales/en.json` file has been reorganized for better clarity and maintainability:

### Key Improvements Made

1. **Better Organization**: Related items are grouped together logically
2. **Consistent Naming**: camelCase used throughout for better JavaScript integration
3. **Clear Hierarchies**: Nested structures make relationships clear
4. **Separated Concerns**: UI elements, content, and functionality are clearly separated

### Main Sections

```json
{
  "common": {
    "actions": {}, // Button texts and action labels
    "labels": {},  // General UI labels
    "states": {}   // Status indicators
  },
  "auth": {
    "fields": {},        // Form fields
    "options": {},       // Login options
    "links": {},         // Navigation links
    "providers": {},     // OAuth providers
    "passwordReset": {}, // Password reset flow
    "passwordRequirements": {}, // Password validation
    "notices": {},       // General notices
    "messages": {}       // Success/error messages
  },
  "game": {
    "ui": {},        // Game interface elements
    "actions": {},   // Game actions and status
    "results": {},   // Game results
    "cardTypes": {}, // Card type names
    "yaku": {},      // Scoring combinations
    "warnings": {}   // Exit warnings
  },
  "settings": {
    "gameplay": {},  // Game rule settings
    "interface": {}, // UI settings
    "audio": {},     // Audio controls
    "notices": {}    // Settings notices
  },
  // ... other sections
}
```

## Usage in Components

### Basic Translation

```vue
<template>
  <button>{{ $t('common.actions.playNow') }}</button>
  <h1>{{ $t('game.title') }}</h1>
</template>
```

### Translations with Variables

```vue
<template>
  <p>{{ $t('game.ui.statusBar.roundCounter', { current: 1, max: 6 }) }}</p>
  <p>{{ $t('designs.tradeCoins', { cost: 500 }) }}</p>
</template>
```

### Pluralization

```vue
<template>
  <span v-if="coinCount === 1">{{ $t('common.labels.coin') }}</span>
  <span v-else>{{ $t('common.labels.coins') }}</span>
</template>
```

### Composable Usage

```vue
<script setup>
const { t } = useI18n()

const message = computed(() => t('auth.messages.youreSignedIn'))
</script>
```

## Key Changes from Original Structure

### 1. Renamed Keys for Consistency

| Original | New | Reason |
|----------|-----|--------|
| `common.buttons` | `common.actions` | More descriptive |
| `ame-shikou` | `ameShikou` | camelCase consistency |
| `bush_clover` | `bushClover` | camelCase consistency |

### 2. Better Grouping

- **Auth section** now has clear subsections for fields, options, providers, etc.
- **Settings section** separated into gameplay, interface, and audio
- **Feedback section** organized by categories and comment types
- **Game section** has clear UI vs. gameplay separation

### 3. Added Missing Structure

- Added `datetime.months` instead of top-level `months`
- Added `hanafuda.flowers` for game-specific terminology
- Improved `accessibility` structure with navigation and actions

### 4. Improved Descriptions

- Yaku descriptions cleaned up with consistent formatting
- Removed extra spaces and improved parentheses usage
- Made error categorization more logical

## Adding New Languages

To add a new language (e.g., Japanese):

1. **Update `nuxt.config.ts`**:
```typescript
locales: [
  {
    code: 'en',
    file: 'en.json',
    name: 'English',
    dir: 'ltr'
  },
  {
    code: 'ja',
    file: 'ja.json',
    name: '日本語',
    dir: 'ltr'
  }
]
```

2. **Create `locales/ja.json`** by copying and translating `en.json`

3. **Update components** to use translation keys instead of hardcoded strings

## Migration Guide

### For Existing Components

Replace hardcoded strings with translation keys:

```vue
<!-- Before -->
<button>PLAY NOW</button>
<p>Round 1 / 6</p>

<!-- After -->
<button>{{ $t('common.actions.playNow') }}</button>
<p>{{ $t('game.ui.statusBar.roundCounter', { current: 1, max: 6 }) }}</p>
```

### Key Mapping Changes

If you were using the old structure, update your translation keys:

```vue
<!-- Old keys -->
{{ $t('common.buttons.playNow') }}
{{ $t('game.statusBar.roundCounter') }}
{{ $t('auth.emailAddress') }}

<!-- New keys -->
{{ $t('common.actions.playNow') }}
{{ $t('game.ui.statusBar.roundCounter') }}
{{ $t('auth.fields.emailAddress') }}
```

## Benefits of This Structure

1. **Scalability**: Easy to add new languages and manage translations
2. **Maintainability**: Clear organization makes updates simple
3. **Consistency**: Standardized naming conventions throughout
4. **Developer Experience**: Logical grouping makes finding translations intuitive
5. **Type Safety**: Better structure supports TypeScript integration
6. **Performance**: Optimized for Vue i18n with lazy loading support

## Next Steps

1. **Replace hardcoded strings** in components with translation keys
2. **Add new languages** as needed (Japanese, Spanish, etc.)
3. **Implement language switcher** UI component
4. **Add translation validation** to prevent missing keys
5. **Consider RTL support** for Arabic, Hebrew, etc.

## Testing

Test the i18n setup by:

1. Running the development server: `pnpm dev`
2. Checking that routes work: `/` and `/en/`
3. Verifying translations load correctly in components
4. Testing browser language detection

This implementation provides a solid foundation for multilingual support while maintaining the game's cultural authenticity.