/**
 * RSA SecurID Token Generator
 * This is an implementation of RSA SecurID token generation algorithm.
 * Note: This is a simplified implementation for educational purposes.
 */

class TokenGenerator {
  constructor(seed, algorithm = 'SHA-256') {
    if (!seed || seed.length < 16) {
      throw new Error('Invalid RSA seed. Must be at least 16 characters.');
    }
    this.seed = seed;
    this.algorithm = algorithm;
  }

  /**
   * Generates a token code based on the seed and current time
   * @returns {string} 6-digit token
   */
  getTokenCode() {
    return this._generateCode(0);
  }

  /**
   * Generates the next token code based on the seed and next time period
   * @returns {string} 6-digit token
   */
  getNextTokenCode() {
    return this._generateCode(1);
  }

  /**
   * Internal method to generate a token code
   * @param {number} offset - Time offset (0 for current period, 1 for next period)
   * @returns {string} 6-digit token
   * @private
   */
  _generateCode(offset = 0) {
    // Get current 60-second period (RSA typically uses 60-second windows)
    const now = Math.floor(Date.now() / 1000);
    const period = Math.floor(now / 60) + offset;
    
    // Create a unique input for this time period
    const input = `${this.seed}-${period}`;
    
    // Use the synchronous hash method for immediate results
    return this._generateHashSync(input);
  }

  /**
   * Synchronous hash generation
   * @param {string} input - The input string to hash
   * @returns {string} 6-digit token
   * @private
   */
  _generateHashSync(input) {
    // Simple string hash algorithm for fallback
    let hash = 0;
    
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Ensure positive value and take modulo 1000000 to get 6 digits
    hash = Math.abs(hash) % 1000000;
    
    // Pad with leading zeros if necessary
    return hash.toString().padStart(6, '0');
  }
}

// Export for browser environments
window.RSASecurID = { TokenGenerator };