## v1.8.1
### Added
- **Glass Mode toggle** - Replaced "Simple Mode" with "Glass Mode" button that enables fancy effects when clicked
- **Light/Dark mode toggle** - Added sun/moon icon button that only appears in simple mode (non-glass)
- **Cross-page theme sync** - Theme preferences sync between main page and privacy-terms page via localStorage
- **Privacy & Terms dark mode** - Full dark/light mode support added to privacy-terms page

### Changed
- **Default mode changed** - Website now loads in clean simple mode by default (no particles/glass effects)
- **Button positioning** - Glass Mode button moved to top-right corner, Light/Dark toggle to top-left corner
- **Vertical alignment** - Both control buttons now align vertically with Sendvia logo (Y-axis centered)
- **Loading screen colors** - Fixed loader colors to display properly in light simple mode
- **About section links** - Fixed "View source code" link color for better visibility in light mode
- **Removed 3D tilt effect** - Removed mouse-tracking 3D tilt animation from main container
- **Removed floating animation** - Removed floating animation from container to reduce motion

### Fixed
- **Text contrast issues** - Fixed multiple text color issues in light simple mode for better accessibility
- **Privacy-terms visibility** - Fixed theme toggle and Glass Mode button visibility on privacy-terms page
- **Link colors in About modal** - GitHub/source code links now display in proper dark blue in light mode

## v1.8.0
### Added
- Complete visual redesign with premium dark theme and animated gradient mesh background
- Glassmorphism (frosted glass) effects on main container, modals, and all cards
- Floating particle animation system in the background
- Neon glow effects on title, share codes, and interactive elements
- 3D depth effects with perspective transforms and floating animations
- Shimmer animations on container and modal backgrounds
- Button ripple effects for visual feedback on click
- Confetti celebration animation on successful file transfers
- 3D tilt effect on main container (desktop only) responding to mouse movement
- Purple neon accent colors throughout the interface
- Enhanced modal slide-in animations with 3D perspective transforms
- Improved scrollbar styling with purple accent color
- Glass-style cards for list items in content sections
- Pulsing animations on highlight boxes and status indicators

### Changed
- Migrated from light theme to premium dark theme with purple/pink/blue gradients
- Completely redesigned Privacy & Terms page with matching glassmorphism aesthetic
- Updated all modals (Changelog, Help, About) to use glassmorphism effects
- Increased modal size (780px vs 650px container) for better visibility
- Enhanced footer with pill-style version badge and improved button styling
- Improved text contrast and readability throughout the interface
- Redesigned share code box with double-layer neon glow and shimmer effect
- Updated drop zone with stronger neon borders and hover effects
- Enhanced tab navigation on Privacy & Terms page with glass styling
- Improved mobile responsiveness with optimized spacing and touch targets

### Fixed
- Fixed modal positioning by moving HTML structure outside the main container
- Improved color contrast for better accessibility
- Enhanced glass effect backdrop blur consistency across browsers
- Fixed shimmer animation positioning on glass surfaces
- Improved mobile animation performance by hiding particles on mobile devices

## v1.7.3
### Added
- Full-screen, glass-style overlay for users with JavaScript disabled
- Animated fade-in + slide-up effect for the overlay box
- Mobile-friendly design: responsive font sizes, padding, and max-width 640px
- Styled "Learn how to enable JavaScript" button with hover effect
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
- About section describing Sendvia's purpose and usage.
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
### Added
- Initial release
