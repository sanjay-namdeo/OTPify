/**
 * RSA SecurID Token Generator
 * This is an implementation of RSA SecurID token generation algorithm.
 * Note: This is a simplified implementation for educational purposes.
 */

class TokenGenerator {
  constructor(seed) {
    if (!seed || seed.length < 16) {
      throw new Error('Invalid RSA seed. Must be at least 16 characters.');
    }
    this.seed = seed;
    this.algorithm = 'SHA-256';
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
    
    // Generate hash using the Web Crypto API
    return this._generateHash(input);
  }

  /**
   * Generate a deterministic hash value from the input
   * @param {string} input - The input string to hash
   * @returns {string} 6-digit token
   * @private
   */
  async _generateHash(input) {
    try {
      // Use TextEncoder to convert string to byte array
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      
      // Generate hash using Web Crypto API
      const hashBuffer = await crypto.subtle.digest(this.algorithm, data);
      
      // Convert hash to a number and take modulo 1000000 to get 6 digits
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      let hashNum = 0;
      
      // Use first 4 bytes to create a number
      for (let i = 0; i < 4; i++) {
        hashNum = (hashNum << 8) + hashArray[i];
      }
      
      // Ensure positive value and take modulo 1000000 to get 6 digits
      hashNum = Math.abs(hashNum) % 1000000;
      
      // Pad with leading zeros if necessary
      return hashNum.toString().padStart(6, '0');
    } catch (error) {
      // Fallback to synchronous method if Web Crypto API is not available
      return this._generateHashSync(input);
    }
  }

  /**
   * Synchronous hash generation fallback
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

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { TokenGenerator };
} else {
  window.RSASecurID = { TokenGenerator };
}
