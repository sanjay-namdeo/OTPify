/**
 * OTPAuth Library
 * Lightweight implementation for generating TOTP tokens
 */

const OTPAuth = (function() {
  /**
   * Base32 utility functions
   */
  const Base32 = {
    /**
     * RFC 4648 base32 alphabet without padding
     */
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
    
    /**
     * Decode a base32 string into a Uint8Array
     * @param {string} encoded - The base32 encoded string
     * @returns {Uint8Array} - The decoded bytes
     */
    decode: function(encoded) {
      // Remove whitespace and convert to uppercase
      encoded = encoded.trim().toUpperCase();
      
      // Remove padding if present
      encoded = encoded.replace(/=+$/, '');
      
      // Canonicalize: remove all characters that aren't in the alphabet
      encoded = encoded.split('')
        .filter(char => this.alphabet.includes(char))
        .join('');
      
      if (encoded.length === 0) {
        return new Uint8Array(0);
      }
      
      // Convert from base32 alphabet to 5-bit binary
      const bits = encoded.split('')
        .map(char => this.alphabet.indexOf(char).toString(2).padStart(5, '0'))
        .join('');
      
      // Convert from binary to bytes
      const bytes = new Uint8Array(Math.floor(bits.length / 8));
      for (let i = 0; i < bytes.length; i++) {
        const byteStart = i * 8;
        const byte = bits.slice(byteStart, byteStart + 8);
        bytes[i] = parseInt(byte, 2);
      }
      
      return bytes;
    }
  };
  
  /**
   * Secret key class for TOTP
   */
  class Secret {
    /**
     * Create a new secret from a base32 string
     * @param {string} base32 - Base32-encoded secret
     * @returns {Secret} - A new Secret instance
     */
    static fromBase32(base32) {
      return new Secret(Base32.decode(base32));
    }
    
    /**
     * Create a new secret
     * @param {Uint8Array} buffer - The secret bytes
     */
    constructor(buffer) {
      this.buffer = buffer;
    }
  }
  
  /**
   * TOTP Implementation
   */
  class TOTP {
    /**
     * Create a new TOTP generator
     * @param {Object} options - Configuration options
     * @param {Secret} options.secret - The secret key
     * @param {string} [options.algorithm='SHA-1'] - Hash algorithm (SHA-1, SHA-256, SHA-512)
     * @param {number} [options.digits=6] - Number of digits in the OTP
     * @param {number} [options.period=30] - Token validity period in seconds
     * @param {string} [options.issuer=''] - Account provider name
     * @param {string} [options.label=''] - Account identifier (typically username)
     */
    constructor({
      secret,
      algorithm = 'SHA-1',
      digits = 6,
      period = 30,
      issuer = '',
      label = ''
    }) {
      this.secret = secret;
      this.algorithm = algorithm;
      this.digits = digits;
      this.period = period;
      this.issuer = issuer;
      this.label = label;
    }
    
    /**
     * Generate a TOTP token
     * @param {Object} [options] - Generation options
     * @param {number} [options.timestamp=Date.now()] - Timestamp to generate token for
     * @returns {string} - The generated TOTP token
     */
    generate({timestamp = Date.now()} = {}) {
      // Calculate the counter value (RFC 6238)
      const counter = Math.floor(timestamp / 1000 / this.period);
      
      // Convert counter to buffer
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      
      // Set as big-endian 64-bit integer
      view.setBigUint64(0, BigInt(counter), false);
      
      // Calculate HMAC
      const signature = this._calculateHMAC(this.secret.buffer, new Uint8Array(buffer));
      
      // Dynamic truncation (RFC 4226)
      const offset = signature[signature.length - 1] & 0x0f;
      const binary = ((signature[offset] & 0x7f) << 24) |
                    ((signature[offset + 1] & 0xff) << 16) |
                    ((signature[offset + 2] & 0xff) << 8) |
                    (signature[offset + 3] & 0xff);
      
      // Truncate to required number of digits
      const token = binary % Math.pow(10, this.digits);
      
      // Convert to string and pad with leading zeros if needed
      return token.toString().padStart(this.digits, '0');
    }
    
    /**
     * Calculate HMAC for TOTP
     * @param {Uint8Array} key - The secret key
     * @param {Uint8Array} message - The message to authenticate
     * @returns {Uint8Array} - The HMAC result
     * @private
     */
    _calculateHMAC(key, message) {
      // In a production environment, use the Web Crypto API
      // This is a simplified implementation for the demo
      
      // Determine block size based on algorithm
      const blockSize = this.algorithm.includes('512') ? 128 : 64;
      
      // Create outer and inner padding arrays
      const outerPadding = new Uint8Array(blockSize);
      const innerPadding = new Uint8Array(blockSize);
      
      // Prepare the key
      let keyToUse = key;
      if (key.length > blockSize) {
        // Hash the key if it's too long
        keyToUse = this._simpleHash(key);
      }
      
      // Create the paddings
      for (let i = 0; i < blockSize; i++) {
        outerPadding[i] = 0x5c ^ (i < keyToUse.length ? keyToUse[i] : 0);
        innerPadding[i] = 0x36 ^ (i < keyToUse.length ? keyToUse[i] : 0);
      }
      
      // Create inner message
      const innerMessage = new Uint8Array(innerPadding.length + message.length);
      innerMessage.set(innerPadding);
      innerMessage.set(message, innerPadding.length);
      
      // Hash inner message
      const innerHash = this._simpleHash(innerMessage);
      
      // Create outer message
      const outerMessage = new Uint8Array(outerPadding.length + innerHash.length);
      outerMessage.set(outerPadding);
      outerMessage.set(innerHash, outerPadding.length);
      
      // Return hash of outer message
      return this._simpleHash(outerMessage);
    }
    
    /**
     * Simple hash implementation (for demo purposes only)
     * @param {Uint8Array} data - Data to hash
     * @returns {Uint8Array} - Hash result
     * @private
     */
    _simpleHash(data) {
      // This is a simplified hash for demonstration purposes
      // In a real implementation, use the Web Crypto API
      const hashLength = this.algorithm.includes('512') ? 64 : 
                       this.algorithm.includes('384') ? 48 :
                       this.algorithm.includes('256') ? 32 : 20;
      
      const result = new Uint8Array(hashLength);
      
      // Very simple hash function (not cryptographically secure)
      let h1 = 0x67452301;
      let h2 = 0xEFCDAB89;
      let h3 = 0x98BADCFE;
      let h4 = 0x10325476;
      let h5 = 0xC3D2E1F0;
      
      for (let i = 0; i < data.length; i++) {
        h1 = (h1 + data[i]) % 0xFFFFFFFF;
        h2 = (h2 * data[i] + h1) % 0xFFFFFFFF;
        h3 = (h3 ^ h2) % 0xFFFFFFFF;
        h4 = (h4 + h3) % 0xFFFFFFFF;
        h5 = (h5 ^ h4 ^ h1) % 0xFFFFFFFF;
      }
      
      // Convert the hash values to bytes and store in the result
      for (let i = 0; i < 4; i++) {
        result[i] = (h1 >> (i * 8)) & 0xFF;
        result[i + 4] = (h2 >> (i * 8)) & 0xFF;
        result[i + 8] = (h3 >> (i * 8)) & 0xFF;
        result[i + 12] = (h4 >> (i * 8)) & 0xFF;
        if (i + 16 < result.length) {
          result[i + 16] = (h5 >> (i * 8)) & 0xFF;
        }
      }
      
      return result;
    }
  }
  
  // Export public API
  return {
    TOTP,
    Secret
  };
})();