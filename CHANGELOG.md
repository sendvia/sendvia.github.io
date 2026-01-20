## v1.7.3
### Added
- Full-screen, glass-style noscript overlay for users with JavaScript disabled
- Animated fade-in + slide-up effect for the overlay box
- Inter font used for consistent typography

## v1.7.2
### Fixed
- Added null checks for all DOM elements to prevent runtime errors
- Fixed missing formatCountdown() function (was calling undefined function)
- Added QRCode library existence check before initialization
- Improved error handling in changelog fetch with proper catch blocks
- Added variable existence checks in beforeunload cleanup handler
- Fixed potential errors when optional UI elements are missing from page

### Changed
- Improved code robustness with defensive programming patterns
- Enhanced modal handlers with consistent null-checking approach

## v1.7.1
### Changed
- Updated countdown time format from MM:SS to human-readable format (e.g., 15m 31s)

## v1.7.0
### Added
- 15-minute code expiration timer with live countdown display for senders
- Color-coded countdown warnings (blue → yellow → red) based on time remaining
- Automatic code validation and cleanup for expired transfers
- Page loading animation with triple-ring spinner for slow connections
- Smooth fade-in/out animations for all modals (Changelog, Help, About)
- Section animations for file info, QR code, status messages, and progress bars
- Interactive button animations with ripple effects and hover states
- Connection status bounce animation when peers connect
- Drop zone pulse animation during drag operations

### Changed
- Enhanced mobile responsiveness for footer layout with stacked version info
- Improved About modal styling with better spacing and typography
- Updated expiration countdown CSS with animations and mobile optimization
- Privacy button now opens in new tab with proper security attributes

### Fixed
- Missing startExpirationCountdown() call in createOffer function
- Missing checkCodeExpiration() validation in createAnswer function
- Timer cleanup not being called in beforeunload event listener
- Incorrect privacy page URL path in footer button

## v1.6.1
### Fixed
- Improved spacing and layout in the Privacy Policy section on mobile devices.

## v1.6.0
### Changed
- Moved Privacy & Terms page to a clean, folder-based URL (/privacy-terms) without .html.
- Updated internal links and buttons to use the new route.

### Added
- Redirect from legacy privacy.html to the new /privacy-terms route.

## v1.5.0
### Added
- About section describing Sendvia’s purpose and usage.
- Privacy Policy & Terms of Service sections clarifying no data collection, storage, or cookies, and outlining acceptable use and liability limitations.

### Changed
- Updated footer layout and positioning.
- Footer navigation updated to include About and Privacy & Terms links.
- Refined spacing and layout in the Help Section for a cleaner, more intuitive UI.

## v1.4.0
### Added
- Receiver-side progress bar showing real-time transfer progress, speed, and estimated remaining time.
- Changelog section pills for clearer categorization: Added, Changed, Removed, and Fixed.

### Changed
- Refined spacing and layout in the Help Section for a cleaner, more intuitive UI.

### Removed
- Redundant pill text in the Help Section.
- Deprecated and unused UI buttons.

## v1.3.0
### Added
- Fully functional Help button with guides and images

## v1.2.0
### Added
- Multi-file transfers: send multiple files in one session
- Help button (initially inactive)

## v1.1.3
### Changed
- Minor UI spacing adjustments

## v1.1.2
### Changed
- Separated CSS and JavaScript into separate files

## v1.1.1
### Changed
- Color updates
- Minor UI fixes

## v1.1.0
### Added
- Live GitHub changelog
- Version footer
- QR code support
- Show/Hide QR option for mobile users

## v1.0.1
### Changed
- Minor UI spacing adjustments

## v1.0.0
- Initial release
