# OTPify Firefox Extension

A Firefox extension that securely generates and manages TOTP and RSA tokens with a modern, theme-aware UI.

## Features

- **Multiple Token Types**: Support for both TOTP (Time-based One-Time Password) and RSA SecurID tokens
- **Visual Progress Indicator**: Color-changing progress bar shows time until token expiration (green → yellow → red)
- **Theme Adaptation**: Automatically adapts to Firefox's light or dark theme
- **Secure Storage**: Token secrets are stored securely using Firefox's built-in security features
- **Token Preview**: See both current and next tokens at a glance

## How It Works

The OTPify extension generates One-Time Passwords (OTPs) directly in your browser:

1. **TOTP Generation**: Uses the OTPAuth library to generate time-based tokens compatible with Google Authenticator, Authy, and similar services
2. **RSA Token Simulation**: Simulates RSA SecurID tokens by using the RSA algorithm with a stored seed
3. **Local Processing**: All token generation happens locally in your browser - no network requests needed
4. **Secure Storage**: Token secrets are stored in Firefox's secure storage

## Screenshots

The extension popup displays your tokens with a clean, modern interface:

- Token cards show name, account, current token, and next token
- Progress bar changes color as tokens get closer to expiration
- Dark theme support matches your Firefox theme

## Development

This project uses:

- JavaScript with React for the UI components
- Firefox's WebExtension APIs for browser integration
- OTPAuth and RSA-SecurID libraries for token generation

## Installation

To install the development version:

1. Clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on..."
5. Select any file in the extension directory

## License

This project is licensed under the MIT License - see the LICENSE file for details.
