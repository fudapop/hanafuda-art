# Changelog

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
