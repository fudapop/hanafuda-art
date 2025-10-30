# Changelog

## [Unreleased]

### New Features
- **Local-First Profile System**: Implemented foundational local-first architecture for player profiles. The game now primarily operates on local data with enhanced profile sync infrastructure, improved conflict resolution with source tracking, and more robust guest-to-authenticated account transitions. This groundwork enables better data integrity and sets the stage for future offline-first capabilities.
- **Player Statistics Tracking**: Added comprehensive stats tracking system that records and displays player performance metrics. Track your wins, losses, win rate, favorite yaku combinations, and game history over time. Stats are automatically saved and synced across devices for authenticated players.

## [2.6.1] - 2025-09-25

### Bug Fixes
- **Game State Management**: Fixed an issue where forfeiting a game and starting a new one would leave game stores in an inconsistent state, causing UI elements like the logout button to become disabled and game state to be corrupted. All game stores now properly reset to their initial state when starting a new game.

## [2.6.0] - 2025-09-21

### New Features
- **On-Screen Event Log**: Added a resizable, collapsible event log panel that tracks all game actions in real-time. Players can now monitor their moves, card draws, matches, and yaku completions with timestamps and visual card indicators. The panel can be repositioned, collapsed, or hidden entirely based on player preference, with settings automatically saved between sessions.

## [2.5.1] - 2025-09-03

### Bug Fixes & Improvements
- **Game State Management**: Fixed an issue where games could be saved during the opponent's turn, ensuring save functionality is only available during the player's turn.
- **Auto-play Resume**: Fixed auto-opponent functionality to properly start when resuming a game after a page refresh.
- **Game Persistence**: Clarified documentation regarding game save persistence behavior.

### UI & Visual Improvements  
- **Modal Enhancement**: Enhanced modal backgrounds and button visuals for improved user experience.

## [2.5.0] - 2025-08-31

### New Features
- **Save & Resume Game**: Complete game state persistence system allowing players to save their progress and resume later. Features anti-save scumming measures with a single save slot system that automatically clears saves when resumed.
- **Russian Language Support**: Added Russian (ru) as a new language option with comprehensive translations for all game content, menus, and user interface elements.

### Performance & Technical Improvements
- **Static Asset Optimization**: Improved loading performance by serving static assets from a dedicated storage bucket, reducing load times and bandwidth usage.

### UI & Experience Improvements
- **Start Screen Enhancement**: Replaced static "Play Now" image with a styled, translatable button to improve internationalization support and accessibility.
- **Responsive Card Sizing**: Card size settings apply globally while preserving specific layouts for UI components, ensuring consistent user experience across different screen sizes.

## [2.4.2] - 2025-08-27

### Analytics & Privacy
- **PostHog Integration**: Replaced Firebase Analytics with PostHog for better privacy-focused analytics and user insights.

### Audio System Enhancements
- **Media Controls Integration**: Background music now displays track metadata in device media controls (iOS/Android/desktop).
- **Audio Performance**: Added fallback audio formats for better browser compatibility and additional card sound effects.

## [2.4.1] - 2025-08-20

### Bug Fixes
- **Card Design**: The selected card design now persists correctly across sessions.
- **Localization**: Added missing toast message translations and fixed locale-based routing.

## [2.4.0] - 2025-08-20

### Internationalization & Content
- **Polish Language Support**: Added Polish (pl) as a new language option.
- **Localized Content Pages**: Implemented translations for static content pages.
- **Page Metadata Translations**: Added i18n support for page metadata.
- **Footer Translations**: Added missing translations for page footers.
- **Content Structure**: Updated the content directory structure to better support translations.

### UI & Experience
- **Page Transitions**: Removed global page transitions and smooth scrolling for a more native feel.

## [2.3.3] - 2025-08-16

### Audio System Improvements

- **Audio System Refinement**: Introduced separate volume and disable controls for Background Music (BGM) and Sound Effects (SFX).
- **Resource Optimization**: Replaced mute functionality with a "disable" option for audio tracks, preventing them from playing in the background when off.
- **Improved Audio Resume**: Fixed an issue where background music would not resume after being re-enabled from a disabled state.

## [2.3.2] - 2025-07-27

### New Features
- **New Card Design**: Added the "Shou Suisaiga" card design by Discord user Vulume.

## [2.3.1] - 2025-07-23

### Bug Fixes
- **Translations**: Added missing translations for card types.
- **UI**: Improved spacing in the results modal message.
- **UI**: Updated start screen buttons to minimize crowding.
- **Leaderboard**: Fixed table scrolling on mobile devices.

## [2.3.0] - 2025-07-22

### New Features
- **Player Rankings**: A new page has been added to display player rankings.

### Bug Fixes
- **Attributions**: Corrected a typo in a contributor's name on the attributions page.

## [2.2.0] - 2025-07-20

### New Features
- **Internationalization**: Full English and Japanese localization support with seamless language switching.
- **Tsuki-fuda Enhancement**: Cards are now displayed in the artistic arrangement intended by the original designer.
- **Translation System**: Comprehensive translation coverage for viewing options, yaku descriptions, and collection components.

### UI & Experience Improvements
- **Mobile Responsiveness**: Enhanced mobile experience with improved modal positioning, status bar scaling, and hand overflow handling.
- **Interface Polish**: Updated fullscreen icons, refined modal layouts, and improved collection component presentation.

### Bug Fixes
- **Avatar System**: Fixed avatar selection and random assignment issues.
- **Game Controls**: Resolved button visibility issues during end-game states.
- **Layout Fixes**: Corrected various positioning and overflow issues across different screen sizes.

### Performance & Technical
- **Image Optimization**: Continued WebP conversion for improved loading performance.
- **Code Quality**: Refactored avatar state management and updated dependencies.

## [2.1.1] - 2025-07-19

### Improvements
- **Performance**: Optimized card and background images by converting them to WebP and moving assets to a static bucket for faster loading.
- **Responsive UI**: The status bar now scales more effectively on different screen sizes.
- **Avatar Management**: Refactored avatar state management for better consistency.

### Bug Fixes
- **Avatar Selection**: Restored the full range of avatar options.

### Miscellaneous
- **Tooling**: Added a utility script for uploading assets.

## [2.1.0] - 2025-07-17

### UI & Layout Improvements
- **Simplified Layout**: The main game layout has been streamlined for a cleaner and more intuitive presentation.
- **Improved Scrollbars**: Scrollbar styles have been updated for better consistency and a more modern look.
- **Adjusted Padding**: Padding has been fine-tuned across various components to enhance visual balance.
- **Wider Collection Modal**: The modal for viewing card collections is now wider, making it easier to see your cards.
- **Artist Credit**: A dedicated component has been added to properly credit the artists of the card designs.

### Gameplay Improvements
- **Yaku List Access**: Players can now open the Yaku list during the "koi-koi" call decision to review potential hands.

### Bug Fixes
- **"Show Board" Button**: Fixed an issue where the "Show Board" button in the game was not functioning correctly.

## [2.0.0] - 2025-07-10

### Announcements & Social
- **What's New announcement system** with impression tracking (views/likes)
- **Like/unlike functionality** for announcements with local storage

### Audio Experience
- **Adaptive background music** that responds to gameplay state
- **Cross-fade audio transitions** between menu and gameplay music

### Visual Design & Customization
- **Otwarte Karty card design** - beginner-friendly and beautiful
- **Better design organization** with New → Unlocked → Locked structure
- **Adjustable card sizes** to fit different screens and preferences
- **Enhanced visual design** with improved backgrounds and UI consistency
- **Visual hierarchy** in card designs for easier recognition

### Gameplay Improvements
- **Collection viewing** with magnifying glass button and double-click support
- **DeckShowcase component** with auto-reveal functionality
- **Card visibility** and prominence during gameplay
- **Collection viewing experience** with expanded display options

### Interface & Accessibility
- **Menu and modal layouts** for better usability and accessibility
- **Accessibility** across all device types

---
