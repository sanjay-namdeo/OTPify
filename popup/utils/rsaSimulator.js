/**
 * A simple RSA SecurID token simulator
 * Note: This is not a real RSA implementation but a simplified simulator for demonstration purposes
 */

class RSASimulator {
  constructor(seed) {
    this.seed = seed;
    this.algorithm = 'sha256';
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
   * Internal method to generate a deterministic but "random-looking" code
   * based on seed and time offset
   * @param {number} offset - Time offset (0 for current period, 1 for next period)
   * @returns {string} 6-digit token
   */
  _generateCode(offset = 0) {
    // Get current 60-second period (RSA typically uses 60-second windows)
    const now = Math.floor(Date.now() / 1000);
    const period = Math.floor(now / 60) + offset;
    
    // Create a deterministic but "random-looking" value by combining seed and period
    let hash = 0;
    const input = `${this.seed}-${period}`;
    
    // Simple string hash algorithm
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

// Export as global if needed for browser
if (typeof window !== 'undefined') {
  window.RSASecurID = {
    TokenGenerator: RSASimulator
  };
}

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TokenGenerator: RSASimulator
  };
}
