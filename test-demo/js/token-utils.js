/**
 * Utility functions for token generation in the demo
 */
const TokenUtils = {
  /**
   * Generates a token based on the token type and settings
   * @param {Object} token - The token configuration
   * @returns {string} - The generated token
   */
  generateToken(token) {
    if (token.type === 'TOTP') {
      return this.generateTOTPToken(token);
    } else if (token.type === 'RSA') {
      return this.generateRSAToken(token);
    }
    return '------';
  },
  
  /**
   * Generates a TOTP token
   * @param {Object} token - The TOTP token configuration
   * @returns {string} - The generated TOTP token
   */
  generateTOTPToken(token) {
    try {
      // Use our demo TOTP implementation
      const totp = new OTPAuth.TOTP({
        issuer: token.issuer || '',
        label: token.account || '',
        digits: token.digits || 6,
        period: token.period || 30,
        secret: OTPAuth.Secret.fromBase32(token.secret || 'JBSWY3DPEHPK3PXP') // Demo secret
      });
      
      return totp.generate();
    } catch (error) {
      console.error('Error generating TOTP token:', error);
      return '------';
    }
  },
  
  /**
   * Generates an RSA token
   * @param {Object} token - The RSA token configuration
   * @returns {string} - The generated RSA token
   */
  generateRSAToken(token) {
    try {
      const generator = new RSASecurID.TokenGenerator(token.secret || 'demo-seed-12345678901234567890', 'SHA-256');
      return generator.getTokenCode();
    } catch (error) {
      console.error('Error generating RSA token:', error);
      return '------';
    }
  },
  
  /**
   * Gets the next token that will be generated
   * @param {Object} token - The token configuration
   * @returns {string} - The next token
   */
  getNextToken(token) {
    if (token.type === 'TOTP') {
      try {
        const period = token.period || 30;
        const now = Math.floor(Date.now() / 1000);
        const currentPeriod = Math.floor(now / period);
        const nextPeriod = currentPeriod + 1;
        const nextTimestamp = nextPeriod * period * 1000; // Convert to milliseconds
        
        const totp = new OTPAuth.TOTP({
          issuer: token.issuer || '',
          label: token.account || '',
          digits: token.digits || 6,
          period: period,
          secret: OTPAuth.Secret.fromBase32(token.secret || 'JBSWY3DPEHPK3PXP') // Demo secret
        });
        
        return totp.generate({ timestamp: nextTimestamp });
      } catch (error) {
        console.error('Error generating next TOTP token:', error);
        return '------';
      }
    } else if (token.type === 'RSA') {
      try {
        const generator = new RSASecurID.TokenGenerator(token.secret || 'demo-seed-12345678901234567890', 'SHA-256');
        return generator.getNextTokenCode();
      } catch (error) {
        console.error('Error generating next RSA token:', error);
        return '------';
      }
    }
    return '------';
  },
  
  /**
   * Calculates the time remaining for a token
   * @param {Object} token - The token configuration
   * @returns {number} - Seconds remaining
   */
  getTimeRemaining(token) {
    const period = token.period || (token.type === 'TOTP' ? 30 : 60);
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
  },
  
  /**
   * Get the progress percentage for the remaining time
   * @param {Object} token - The token configuration
   * @returns {number} - Progress percentage (0-100)
   */
  getProgressPercentage(token) {
    const period = token.period || (token.type === 'TOTP' ? 30 : 60);
    const remaining = this.getTimeRemaining(token);
    return (remaining / period) * 100;
  },
  
  /**
   * Get the appropriate color for the progress bar based on time remaining
   * @param {Object} token - The token configuration
   * @returns {string} - CSS color value
   */
  getProgressColor(token) {
    const period = token.period || (token.type === 'TOTP' ? 30 : 60);
    const remaining = this.getTimeRemaining(token);
    const percentage = (remaining / period);
    
    if (percentage > 0.66) {
      return '#4CAF50'; // Green
    } else if (percentage > 0.33) {
      return '#FFC107'; // Yellow
    } else {
      return '#F44336'; // Red
    }
  }
};