/**
 * RSA SecurID Token Generator Library
 * 
 * This library provides token generation capabilities similar to RSA SecurID hardware tokens.
 * 
 * Implementation is based on the RFC 6238 (TOTP) with specific modifications to match
 * RSA SecurID token behavior.
 */

const RSASecurID = {};

/**
 * Token Generator class for RSA SecurID compatibility
 */
RSASecurID.TokenGenerator = class {
  /**
   * Initialize a new token generator with the given seed and hash algorithm
   * @param {string} seed - The seed used for token generation (similar to a secret key)
   * @param {string} algorithm - The hash algorithm to use (SHA-1, SHA-256, SHA-512, etc.)
   */
  constructor(seed, algorithm = 'SHA-1') {
    this.seed = seed;
    this.algorithm = algorithm;
    this.digits = 6; // RSA SecurID tokens typically use 6 digits
    this.period = 60; // RSA SecurID tokens typically change every 60 seconds
  }

  /**
   * Get the current time period number
   * @returns {number} - The current time period number
   */
  getCurrentPeriod() {
    return Math.floor(Date.now() / 1000 / this.period);
  }

  /**
   * Get the next time period number
   * @returns {number} - The next time period number
   */
  getNextPeriod() {
    return this.getCurrentPeriod() + 1;
  }

  /**
   * Generate a token for a specific time period
   * @param {number} period - The time period number
   * @returns {string} - The generated token
   */
  generateTokenForPeriod(period) {
    try {
      // Convert period to buffer
      const counter = new ArrayBuffer(8);
      const view = new DataView(counter);
      
      // RSA SecurID uses big-endian encoding of the time period
      view.setBigUint64(0, BigInt(period), false);
      
      // Convert seed to ArrayBuffer
      const encoder = new TextEncoder();
      const seedBuffer = encoder.encode(this.seed);
      
      // Perform the HMAC operation (synchronous version)
      const hmacResult = this._hmacSync(seedBuffer, new Uint8Array(counter));
      
      // Convert the HMAC result to a token
      return this._truncate(hmacResult);
    } catch (error) {
      console.error('Error generating token:', error);
      return '------';
    }
  }

  /**
   * Get the current token code
   * @returns {string} - The current token code
   */
  getTokenCode() {
    return this.generateTokenForPeriod(this.getCurrentPeriod());
  }

  /**
   * Get the next token code
   * @returns {string} - The next token code
   */
  getNextTokenCode() {
    return this.generateTokenForPeriod(this.getNextPeriod());
  }

  /**
   * Get the number of seconds remaining in the current period
   * @returns {number} - Seconds remaining
   */
  getSecondsRemaining() {
    const now = Math.floor(Date.now() / 1000);
    return this.period - (now % this.period);
  }

  /**
   * Synchronous implementation of HMAC for various hash algorithms
   * @param {Uint8Array} key - The key for HMAC
   * @param {Uint8Array} message - The message to authenticate
   * @returns {Uint8Array} - The HMAC result
   * @private
   */
  _hmacSync(key, message) {
    // Implementation of HMAC for various hash algorithms
    // This is a synchronous version to prevent issues with async/await in token generation
    
    // Create array for the outer and inner padding
    const blockSize = this.algorithm.includes('512') ? 128 : 64;
    const outerPadding = new Uint8Array(blockSize);
    const innerPadding = new Uint8Array(blockSize);
    
    // If key is longer than block size, hash it
    let keyToUse = key;
    if (key.length > blockSize) {
      // Simple hash implementation for demo purposes
      // In a real implementation, use the appropriate hash function
      keyToUse = new Uint8Array(blockSize);
      for (let i = 0; i < Math.min(key.length, blockSize); i++) {
        keyToUse[i] = key[i];
      }
    }
    
    // Create the inner and outer paddings
    for (let i = 0; i < blockSize; i++) {
      outerPadding[i] = 0x5c ^ (i < keyToUse.length ? keyToUse[i] : 0);
      innerPadding[i] = 0x36 ^ (i < keyToUse.length ? keyToUse[i] : 0);
    }
    
    // Create the inner message: innerPadding || message
    const innerMessage = new Uint8Array(innerPadding.length + message.length);
    innerMessage.set(innerPadding);
    innerMessage.set(message, innerPadding.length);
    
    // Create a simple hash of the inner message
    // This is a placeholder for actual hash functions
    const innerHash = this._simpleHash(innerMessage);
    
    // Create the outer message: outerPadding || innerHash
    const outerMessage = new Uint8Array(outerPadding.length + innerHash.length);
    outerMessage.set(outerPadding);
    outerMessage.set(innerHash, outerPadding.length);
    
    // Return the hash of the outer message
    return this._simpleHash(outerMessage);
  }
  
  /**
   * Simple hash function for demonstration
   * @param {Uint8Array} data - Data to hash
   * @returns {Uint8Array} - Hash result
   * @private
   */
  _simpleHash(data) {
    // This is a simplified hash for demonstration purposes
    // In a real implementation, use the cryptographically secure hash function
    const hashLength = this.algorithm.includes('512') ? 64 : 
                       this.algorithm.includes('384') ? 48 :
                       this.algorithm.includes('256') ? 32 : 20;
    
    const result = new Uint8Array(hashLength);
    
    // Very simple hash function (not cryptographically secure)
    // Just for demonstration purposes
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
      result[i + 16] = (h5 >> (i * 8)) & 0xFF;
    }
    
    return result;
  }

  /**
   * Truncate the HMAC result to the token format
   * @param {Uint8Array} hmacResult - The HMAC result
   * @returns {string} - The truncated token
   * @private
   */
  _truncate(hmacResult) {
    // Get the offset from the last byte
    const offset = hmacResult[hmacResult.length - 1] & 0x0F;
    
    // Convert 4 bytes from the offset to a number
    let binary = ((hmacResult[offset] & 0x7F) << 24) |
                ((hmacResult[offset + 1] & 0xFF) << 16) |
                ((hmacResult[offset + 2] & 0xFF) << 8) |
                (hmacResult[offset + 3] & 0xFF);
    
    // Limit to specified digits (e.g., 6 digits for RSA SecurID)
    const token = binary % Math.pow(10, this.digits);
    
    // Pad with leading zeros if necessary and return
    return token.toString().padStart(this.digits, '0');
  }
};