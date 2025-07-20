# Changelog

All notable changes to Hanafuda Koi-Koi will be documented in this file.

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

*Note: This changelog is used to populate the announcement modal that appears on the start screen.*
