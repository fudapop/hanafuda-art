# Hanafuda Localization Guide

## Overview

This guide documents the comprehensive localization opportunities identified throughout the New Hanafuda application. The application has significant potential for internationalization, with user-facing text spanning across authentication, game interface, settings, profiles, and feedback systems.

## Translation File Structure

The `en.json` file has been organized into the following logical sections:

### 1. **App-wide Elements** (`app`)
- Application title and branding
- Version information
- Core game title with Japanese characters

### 2. **Navigation** (`navigation`)
- Common navigation elements
- Modal and dialog controls
- Universal action buttons

### 3. **Buttons** (`buttons`)
- All interactive button text
- Game controls (Play, Stop, Koi-Koi)
- Authentication actions
- Settings and profile management

### 4. **Authentication** (`authentication`)
- Login and signup forms
- Password requirements and validation
- OAuth provider names
- Account linking functionality
- Guest user prompts

### 5. **Game Interface** (`game`)
- Game state messages (win/lose/draw)
- Round management
- Player status and scoring
- Lucky hand notifications
- Attribution and credits

### 6. **Settings** (`settings`)
- Gameplay configuration options
- Interface preferences
- Rule variations and descriptions
- Toggle switch labels and descriptions

### 7. **Profile Management** (`profile`)
- User profile information
- Player statistics and records
- Avatar and username management
- Profile requirements and prompts

### 8. **Feedback System** (`feedback`)
- Feedback form labels and descriptions
- Rating categories
- Comment types and placeholders
- Submission confirmations

### 9. **Modals and Dialogs** (`modal`)
- Modal titles and descriptions
- Confirmation dialogs
- Signup prompts with incentives
- Warning messages

### 10. **Notifications** (`notifications`)
- Success messages
- Error notifications
- Informational toasts
- Status updates

### 11. **Forms** (`forms`)
- Form field labels
- Validation messages
- Input requirements
- Error states

### 12. **Accessibility** (`accessibility`)
- Screen reader labels
- ARIA descriptions
- Hidden accessibility text
- Interactive element descriptions

## Key Localization Opportunities

### High Priority Areas

1. **Authentication Flow**
   - Login/signup forms with validation messages
   - OAuth provider integration
   - Password requirements
   - Account linking processes

2. **Game Interface**
   - Win/lose/draw state messages
   - Round progression indicators
   - Player action prompts
   - Scoring and bonus displays

3. **Settings and Configuration**
   - Game rule variations
   - Interface preferences
   - Gameplay options with descriptions

4. **User Profile**
   - Profile management interface
   - Player statistics display
   - Achievement and coin systems

### Medium Priority Areas

1. **Feedback System**
   - User experience rating categories
   - Comment classification
   - Submission workflows

2. **Navigation and Menus**
   - Tab categories and labels
   - Options menu organization
   - Mobile responsive layouts

3. **Status and Progress**
   - Round counters
   - Score displays
   - Game state indicators

### Cultural Considerations

1. **Japanese Elements**
   - The game title retains Japanese characters (花札) which should be preserved
   - Traditional game terminology like "Koi-Koi" should maintain authenticity
   - Lucky hand terms ("teshi", "kuttsuki") may need cultural context

2. **Gaming Terminology**
   - Card game vocabulary may have established translations
   - Scoring systems might need regional adaptations
   - Rule explanations may require cultural localization

## Implementation Recommendations

### 1. Nuxt i18n Configuration

Update your `nuxt.config.ts` to configure the i18n module:

```typescript
export default defineNuxtConfig({
  // ... existing config
  modules: [
    // ... other modules
    '@nuxtjs/i18n'
  ],
  i18n: {
    locales: [
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'ja', file: 'ja.json', name: '日本語' },
      { code: 'es', file: 'es.json', name: 'Español' },
      // Add more locales as needed
    ],
    lazy: true,
    langDir: 'locales/',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    }
  }
})
```

### 2. Component Implementation Examples

#### Basic Text Replacement
```vue
<!-- Before -->
<button>Play now</button>

<!-- After -->
<button>{{ $t('buttons.playNow') }}</button>
```

#### Complex Messages with Interpolation
```vue
<!-- Before -->
<p>Round {{ roundNumber }} / {{ maxRounds }}</p>

<!-- After -->
<p>{{ $t('status.round') }} {{ roundNumber }} {{ $t('status.of') }} {{ maxRounds }}</p>
```

#### Pluralization
```vue
<!-- Before -->
<span>{{ rounds }} rounds</span>

<!-- After -->
<span>{{ $tc('game.rounds', rounds, { count: rounds }) }}</span>
```

### 3. Dynamic Content Localization

For content that changes based on game state:

```vue
<template>
  <span v-if="gameResult === 'win'">{{ $t('game.youWin') }}</span>
  <span v-else-if="gameResult === 'lose'">{{ $t('game.youLose') }}</span>
  <span v-else>{{ $t('game.draw') }}</span>
</template>
```

### 4. Form Validation Messages

```typescript
// In your form validation composable
const getValidationMessage = (field: string, rule: string) => {
  return $t(`forms.validation.${field}${rule}`)
}
```

### 5. Toast Notifications

```typescript
// Replace direct toast messages
toast.success($t('notifications.success.signedIn'))
toast.error($t('notifications.error.failedToLink'))
```

## File Organization Strategy

### Recommended Structure
```
locales/
├── en.json          # Base English translations
├── ja.json          # Japanese translations
├── es.json          # Spanish translations
├── fr.json          # French translations
└── shared/          # Shared translation utilities
    ├── countries.json
    ├── currencies.json
    └── timezones.json
```

## Testing Strategy

1. **Visual Testing**
   - Test layout with longer text strings
   - Verify text truncation handling
   - Check responsive design with different languages

2. **Functional Testing**
   - Ensure all interactive elements work in each language
   - Verify form validation messages appear correctly
   - Test toast notifications and modal content

3. **Cultural Testing**
   - Validate game terminology with native speakers
   - Ensure cultural references are appropriate
   - Check number and date formatting

## Migration Roadmap

### Phase 1: Core Interface (Week 1-2)
- Authentication flows
- Main game interface
- Basic navigation

### Phase 2: Settings and Profile (Week 3)
- Settings panels
- Profile management
- User preferences

### Phase 3: Secondary Features (Week 4)
- Feedback system
- Help documentation
- Error messages and notifications

### Phase 4: Polish and Testing (Week 5)
- Cultural validation
- Layout testing with all languages
- Performance optimization

## Future Considerations

1. **Right-to-Left Languages**
   - Plan for RTL layout support
   - Consider Arabic, Hebrew implementations

2. **Dynamic Content**
   - User-generated content translation
   - Real-time game messages

3. **Accessibility**
   - Screen reader support in multiple languages
   - Language switching accessibility

4. **Performance**
   - Lazy loading of translation files
   - Bundle size optimization for mobile users

## Maintenance Guidelines

1. **Adding New Text**
   - Always add to the base `en.json` first
   - Use descriptive keys that indicate context
   - Group related translations logically

2. **Key Naming Conventions**
   - Use camelCase for keys
   - Group by feature/component
   - Include context when meaning might be ambiguous

3. **Translation Updates**
   - Maintain translation consistency across languages
   - Document context for translators
   - Use translation management tools for team collaboration

## Conclusion

The New Hanafuda application presents excellent internationalization opportunities across all major user interface areas. The comprehensive `en.json` file provides a solid foundation for expanding to multiple languages while maintaining the cultural authenticity of this traditional Japanese card game.

The structured approach to localization will enable seamless expansion to new markets while preserving the game's cultural heritage and ensuring an excellent user experience for players worldwide.