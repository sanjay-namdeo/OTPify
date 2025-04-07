# OTPify Firefox Extension

A Firefox extension that securely generates and manages TOTP and RSA tokens with a modern, theme-aware UI and master password protection.

## Features

- **Multiple Token Types**: Support for both TOTP (Time-based One-Time Password) and RSA SecurID tokens
- **Master Password Protection**: All token data is encrypted with a user-defined master password
- **End-to-End Encryption**: AES-256-GCM encryption with PBKDF2 key derivation keeps your tokens secure
- **Visual Progress Indicator**: Color-changing progress bar shows time until token expiration (green → yellow → red)
- **Streamlined Token Display**: Current token prominently shown on the left with the next token on the right in a smaller font
- **Auto-Lock Security**: Automatically locks after 5 minutes of inactivity for enhanced security
- **Theme Adaptation**: Automatically adapts to Firefox's light or dark theme
- **Token Preview**: See both current and next tokens at a glance

## How It Works

The OTPify extension generates One-Time Passwords (OTPs) directly in your browser with enhanced security:

1. **TOTP Generation**: Uses the OTPAuth library to generate time-based tokens compatible with Google Authenticator, Authy, and similar services
2. **RSA Token Generation**: Uses the RSA SecurID library for accurate token generation
3. **Encryption**: All sensitive data is encrypted using AES-256-GCM with a key derived from your master password
4. **Local Processing**: All token generation and encryption happens locally in your browser - no network requests needed
5. **Secure Storage**: Encrypted token data is stored in Firefox's secure storage

## Security Features

OTPify uses industry-standard encryption techniques to protect your token data:

- **Key Derivation**: PBKDF2 with 100,000 iterations and SHA-256 for deriving encryption keys from your master password
- **Encryption**: AES-256-GCM for secure encryption of all token data
- **Salt Generation**: Unique random salt for each user to prevent rainbow table attacks
- **Auto-Lock**: Automatically locks after a period of inactivity
- **No Master Password Storage**: Your master password is never stored, only a verification hash is kept

## Screenshots

The extension popup displays your tokens with a clean, modern interface:

- Token cards show name, account, current token, and next token in a compact layout
- Progress bar changes color as tokens get closer to expiration
- Dark theme support matches your Firefox theme
- Master password protection with setup and unlock screens

## Development

This project uses:

- JavaScript with React for the UI components
- Firefox's WebExtension APIs for browser integration
- Web Crypto API for secure encryption and key derivation
- OTPAuth library for TOTP generation
- RSA SecurID library for RSA token generation

## Installation

To install the development version:

1. Clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on..."
5. Select any file in the extension directory

## Demo Page

The project includes a demo page that showcases the extension's UI and functionality without requiring Firefox installation. To view the demo:

1. Open the demo/index.html file in any browser
2. The demo shows sample token cards with animated progress bars
3. Toggle between light and dark themes with the button at the top
4. Try out the master password and token management interfaces

## License

This project is licensed under the MIT License - see the LICENSE file for details.
