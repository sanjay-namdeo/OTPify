/**
 * Custom OTPAuth library implementation
 * This is a simplified version of the OTPAuth library for TOTP generation
 */

(function(global) {
  /**
   * Simple implementation of base32 encoding/decoding
   */
  const Base32 = {
    // Base32 alphabet (RFC 4648)
    ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
    
    /**
     * Check if a string is a valid Base32 string
     * @param {string} str - The string to check
     * @returns {boolean} - Whether the string is valid Base32
     */
    isValid(str) {
      const normalized = str.replace(/\s/g, '').toUpperCase();
      const base32Regex = /^[A-Z2-7]+=*$/i;
      const validLength = normalized.length % 8 === 0 || 
                        (normalized.endsWith('=') && normalized.indexOf('=') > normalized.length - 7);
      return base32Regex.test(normalized) && validLength;
    },

    /**
     * Decode base32 string to byte array
     * @param {string} str - Base32 string
     * @returns {Uint8Array} - Decoded bytes
     */
    decode(str) {
      // Simple implementation for the demo
      const normalized = str.replace(/\s/g, '').toUpperCase();
      const bytes = [];
      let buffer = 0;
      let bitsLeft = 0;
      
      for (let i = 0; i < normalized.length; i++) {
        if (normalized[i] === '=') continue;
        
        const value = this.ALPHABET.indexOf(normalized[i]);
        if (value === -1) throw new Error('Invalid character in Base32 string');
        
        buffer = (buffer << 5) | value;
        bitsLeft += 5;
        
        if (bitsLeft >= 8) {
          bitsLeft -= 8;
          bytes.push((buffer >> bitsLeft) & 0xff);
        }
      }
      
      return new Uint8Array(bytes);
    }
  };

  /**
   * Simple HMAC implementation for the demo
   * @param {Uint8Array} key - Secret key
   * @param {Uint8Array} message - Message to authenticate
   * @returns {Uint8Array} - HMAC digest
   */
  function generateHMAC(key, message) {
    // For demo purposes, we're using a simple hash function
    const combined = new Uint8Array(key.length + message.length);
    combined.set(key);
    combined.set(message, key.length);
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined[i];
      hash |= 0; // Convert to 32bit integer
    }
    
    // Generate a predictable sequence of bytes from the hash
    const result = new Uint8Array(20); // SHA1 digest length
    for (let i = 0; i < result.length; i++) {
      result[i] = (hash >> ((i % 4) * 8)) & 0xff;
    }
    
    return result;
  }

  /**
   * Generate HOTP code
   * @param {Secret} secret - Secret key
   * @param {number} counter - Counter value
   * @param {number} digits - Number of digits
   * @returns {string} - Generated OTP
   */
  function generateHOTP(secret, counter, digits = 6) {
    // Convert counter to byte array (big-endian)
    const counterBytes = new Uint8Array(8);
    let temp = counter;
    for (let i = counterBytes.length - 1; i >= 0; i--) {
      counterBytes[i] = temp & 0xff;
      temp = temp >> 8;
    }
    
    // Generate HMAC
    const hmac = generateHMAC(secret.buffer, counterBytes);
    
    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary = ((hmac[offset] & 0x7f) << 24) |
                  ((hmac[offset + 1] & 0xff) << 16) |
                  ((hmac[offset + 2] & 0xff) << 8) |
                  (hmac[offset + 3] & 0xff);
    
    // Get the specified number of digits
    const otp = binary % Math.pow(10, digits);
    
    // Pad with leading zeros if needed
    return otp.toString().padStart(digits, '0');
  }

  /**
   * Secret class for handling OTP secrets
   */
  class Secret {
    /**
     * Create a secret from base32 string
     * @param {string} base32 - Base32 encoded secret
     * @returns {Secret} - Secret instance
     */
    static fromBase32(base32) {
      if (!Base32.isValid(base32)) {
        throw new Error('Invalid Base32 string');
      }
      
      const buffer = Base32.decode(base32);
      return new Secret(buffer);
    }

    /**
     * Create a new secret
     * @param {Uint8Array} buffer - Secret bytes
     */
    constructor(buffer) {
      this.buffer = buffer;
    }
  }

  /**
   * TOTP class for generating time-based one-time passwords
   */
  class TOTP {
    /**
     * Create a new TOTP instance
     * @param {Object} options - TOTP options
     * @param {Secret} options.secret - Secret key
     * @param {string} [options.algorithm='SHA1'] - Hash algorithm (ignored in this demo)
     * @param {number} [options.digits=6] - Number of digits
     * @param {number} [options.period=30] - Time period in seconds
     * @param {string} [options.issuer=''] - Token issuer
     * @param {string} [options.label=''] - Token label/account
     */
    constructor(options) {
      this.secret = options.secret;
      this.digits = options.digits || 6;
      this.period = options.period || 30;
      this.issuer = options.issuer || '';
      this.label = options.label || '';
    }

    /**
     * Generate TOTP for a specific timestamp
     * @param {Object} [options] - Generation options
     * @param {number} [options.timestamp=Date.now()] - Timestamp in milliseconds
     * @returns {string} - Generated TOTP
     */
    generate(options = {}) {
      const timestamp = options.timestamp || Date.now();
      const counter = Math.floor(timestamp / 1000 / this.period);
      return generateHOTP(this.secret, counter, this.digits);
    }
  }

  // Export OTPAuth to global scope
  global.OTPAuth = {
    TOTP,
    Secret
  };

})(typeof window !== 'undefined' ? window : global);