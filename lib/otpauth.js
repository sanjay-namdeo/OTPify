/**
 * Custom OTPAuth library implementation
 * This is a minimal implementation of the OTPAuth library for TOTP generation
 */

(function(global) {
    'use strict';
    
    /**
     * Base32 encoder/decoder
     */
    const Base32 = {
        // RFC 4648 base32 alphabet
        alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
        
        /**
         * Decode base32 string
         * @param {string} input - Base32 string
         * @returns {Uint8Array} - Decoded bytes
         */
        decode: function(input) {
            // Remove spaces and normalize to uppercase
            input = input.replace(/\s/g, '').toUpperCase();
            
            // Remove padding
            input = input.replace(/=+$/, '');
            
            // Prepare output
            const length = Math.floor(input.length * 5 / 8);
            const output = new Uint8Array(length);
            
            // Process characters
            let bits = 0;
            let value = 0;
            let index = 0;
            
            for (let i = 0; i < input.length; i++) {
                const char = input.charAt(i);
                const charIndex = this.alphabet.indexOf(char);
                
                if (charIndex === -1) {
                    throw new Error('Invalid character in base32 string: ' + char);
                }
                
                // Add 5 bits to the buffer
                value = (value << 5) | charIndex;
                bits += 5;
                
                // If we have at least 8 bits, output a byte
                if (bits >= 8) {
                    bits -= 8;
                    output[index++] = (value >> bits) & 0xff;
                }
            }
            
            return output;
        }
    };
    
    /**
     * Generate HMAC-based one-time password
     * @param {Uint8Array} key - Secret key
     * @param {Uint8Array} counter - Counter value
     * @param {string} algorithm - Hash algorithm (SHA1, SHA256, SHA512)
     * @param {number} digits - Number of digits
     * @returns {string} - Generated OTP
     */
    async function generateHOTP(key, counter, algorithm, digits) {
        // Convert algorithm name to the format expected by SubtleCrypto
        const algoMap = {
            'SHA1': 'SHA-1',
            'SHA256': 'SHA-256',
            'SHA512': 'SHA-512'
        };
        const cryptoAlgo = algoMap[algorithm] || 'SHA-1';
        
        // Convert counter to buffer
        const counterBuf = new ArrayBuffer(8);
        const counterView = new DataView(counterBuf);
        counterView.setBigUint64(0, BigInt(counter), false); // Big-endian
        
        // Create HMAC key
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: { name: cryptoAlgo } },
            false,
            ['sign']
        );
        
        // Generate HMAC
        const hmac = await crypto.subtle.sign('HMAC', cryptoKey, counterBuf);
        const hmacArray = new Uint8Array(hmac);
        
        // Dynamic truncation
        const offset = hmacArray[hmacArray.length - 1] & 0xf;
        const binCode = 
            ((hmacArray[offset] & 0x7f) << 24) |
            ((hmacArray[offset + 1] & 0xff) << 16) |
            ((hmacArray[offset + 2] & 0xff) << 8) |
            (hmacArray[offset + 3] & 0xff);
        
        // Generate OTP
        const otp = binCode % Math.pow(10, digits);
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
            try {
                const buffer = Base32.decode(base32);
                return new Secret(buffer);
            } catch (error) {
                throw new Error('Invalid base32 secret: ' + error.message);
            }
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
         * @param {string} [options.algorithm='SHA1'] - Hash algorithm
         * @param {number} [options.digits=6] - Number of digits
         * @param {number} [options.period=30] - Time period in seconds
         */
        constructor(options) {
            this.secret = options.secret;
            this.algorithm = options.algorithm || 'SHA1';
            this.digits = options.digits || 6;
            this.period = options.period || 30;
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
            return generateHOTP(this.secret.buffer, counter, this.algorithm, this.digits);
        }
    }
    
    // Export library
    const OTPAuth = {
        Secret: Secret,
        TOTP: TOTP
    };
    
    // Make available in global scope
    global.OTPAuth = OTPAuth;

})(typeof window !== 'undefined' ? window : this);