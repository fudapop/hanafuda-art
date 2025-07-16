# Hanafuda Koi-Koi Localization Guide

## Overview

This document outlines the comprehensive localization opportunities identified throughout the Hanafuda Koi-Koi game interface. The provided `locales/en.json` file serves as a foundation for creating translations into other languages.

## Localization Scope

### 1. **Core Game Interface**
- **Buttons & Navigation**: Play buttons, menu items, close/cancel actions
- **Game Status**: Round counters, player information, score displays
- **Game Actions**: Player decision prompts, game state messages
- **Results**: Win/lose messages, draw states, round completion

### 2. **Authentication & User Management**
- **Login Forms**: Email/password fields, validation messages
- **OAuth Integration**: Google/GitHub login options
- **Profile Management**: Username editing, coin display, player records
- **Error Messages**: Authentication failures, validation errors

### 3. **Game-Specific Terminology**
- **Yaku Names**: All 15 traditional Hanafuda scoring combinations
- **Yaku Descriptions**: Detailed explanations of each scoring pattern
- **Card Types**: Bright, Animal, Ribbon, Plain card categories
- **Game Rules**: Scoring variations, special rules explanations

### 4. **Settings & Configuration**
- **Gameplay Settings**: Game length, rule variations, scoring options
- **Interface Options**: Card size, labels, visual preferences
- **Audio Controls**: Background music, sound effects volume
- **System Settings**: Theme selection, fullscreen mode

### 5. **Modal Dialogs & Notifications**
- **Feedback System**: Rating categories, comment types, submission messages
- **Announcements**: What's new notifications, feature updates
- **Confirmation Dialogs**: Exit warnings, purchase confirmations
- **Toast Messages**: Success/error notifications, game events

### 6. **Legal & Footer Content**
- **Footer Links**: Terms of use, privacy policy, attributions
- **Legal Pages**: Terms and conditions, privacy statements
- **Version Information**: Changelog, version numbers

## Translation File Structure

The `locales/en.json` file is organized into logical sections:

```json
{
  "common": {           // Shared UI elements
    "buttons": {},      // Button text
    "labels": {},       // Common labels
    "states": {}        // Status indicators
  },
  "navigation": {},     // Menu and navigation
  "auth": {},          // Authentication flows
  "profile": {},       // User profile management
  "game": {},          // Core gameplay text
  "settings": {},      // Configuration options
  "designs": {},       // Card design selection
  "feedback": {},      // User feedback system
  "announcements": {}, // Notification system
  "collection": {},    // Card collection UI
  "signup": {},        // Registration prompts
  "footer": {},        // Footer links
  "errors": {},        // Error messages
  "music": {},         // Audio controls
  "cache": {},         // Loading/caching states
  "months": {},        // Calendar months
  "flowers": {},       // Hanafuda flower names
  "accessibility": {}  // Screen reader support
}
```

## Implementation Recommendations

### 1. **Nuxt i18n Module Setup**
```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'ja', file: 'ja.json', name: '日本語' },
      { code: 'es', file: 'es.json', name: 'Español' },
      // Add more languages as needed
    ],
    defaultLocale: 'en',
    langDir: 'locales/',
    strategy: 'prefix_except_default'
  }
})
```

### 2. **Component Integration**
Replace hardcoded strings with translation keys:

```vue
<!-- Before -->
<button>PLAY NOW</button>

<!-- After -->
<button>{{ $t('common.buttons.playNow') }}</button>
```

### 3. **Dynamic Content**
For content with variables, use interpolation:

```vue
<!-- Round counter -->
<p>{{ $t('game.statusBar.roundCounter', { current: ds.roundCounter, max: config.maxRounds }) }}</p>

<!-- Coin trading -->
<p>{{ $t('designs.tradeCoins', { cost: design.cost }) }}</p>
```

## Priority Localization Areas

### High Priority
1. **Core Game Interface** - Essential for gameplay
2. **Authentication** - Required for user onboarding
3. **Game Terminology** - Critical for understanding rules

### Medium Priority
1. **Settings & Configuration** - Important for user experience
2. **Feedback System** - Valuable for user engagement
3. **Error Messages** - Helpful for troubleshooting

### Low Priority
1. **Legal Content** - May require professional translation
2. **Accessibility Labels** - Important but limited user impact
3. **Cache/Loading Messages** - Brief visibility

## Cultural Considerations

### Japanese Localization (ja.json)
- **Yaku Names**: Use traditional Japanese terms (e.g., "五光" for gokou)
- **Honorifics**: Consider appropriate keigo (polite language) usage
- **Card Names**: Maintain traditional flower/month associations
- **Game Rules**: Reference traditional rule variations

### Spanish Localization (es.json)
- **Gender Agreement**: Ensure noun/adjective agreement
- **Formal vs. Informal**: Consider target audience (tú vs. usted)
- **Regional Variations**: Decide on Latin American vs. Iberian Spanish

### Other Languages
- **Right-to-Left Languages**: Consider layout implications for Arabic, Hebrew
- **Character Limits**: Account for text expansion/contraction in UI layouts
- **Number Formatting**: Adapt score displays to local conventions

## Technical Implementation

### 1. **String Extraction**
All user-facing strings have been identified and catalogued in the English translation file. This provides a complete foundation for translation work.

### 2. **Interpolation Variables**
Variable placeholders use `{variable}` syntax for consistency with Vue i18n standards.

### 3. **Nested Structure**
The hierarchical organization allows for logical grouping and easier maintenance.

### 4. **Accessibility**
Screen reader text and ARIA labels are included to ensure accessible internationalization.

## Next Steps

1. **Install Nuxt i18n Module**: Add `@nuxtjs/i18n` to your project
2. **Create Language Files**: Copy `en.json` and translate for target languages
3. **Update Components**: Replace hardcoded strings with `$t()` functions
4. **Test Thoroughly**: Verify UI layouts work with different text lengths
5. **Professional Review**: Consider professional translation for accuracy

## Maintenance

- **New Features**: Add translation keys when adding new UI text
- **Version Control**: Track translation completeness across releases
- **Community Contributions**: Consider allowing community translations
- **Quality Assurance**: Regular review of translations for accuracy and consistency

This localization framework will enable the Hanafuda Koi-Koi game to reach a global audience while preserving the cultural authenticity of the traditional Japanese card game.