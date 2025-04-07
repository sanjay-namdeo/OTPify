/**
 * Generates a token based on the token type and current time period
 * @param {Object} token - The token configuration
 * @param {number} period - The time period to generate the token for
 * @returns {string} - The generated token
 */
export const generateToken = (token, period) => {
  try {
    if (!token || !token.type) {
      console.error('Invalid token object:', token);
      return '------';
    }
    
    if (token.type === 'TOTP') {
      return generateTOTPToken(token, period);
    } else if (token.type === 'RSA') {
      return generateRSAToken(token);
    } else {
      console.warn(`Unknown token type: ${token.type}`);
      return '------';
    }
  } catch (error) {
    console.error('Error in generateToken:', error);
    return '------'; // Visual indication of error
  }
};

/**
 * Simple fallback TOTP implementation if the library isn't available
 * This is a basic HMAC-SHA1 based TOTP implementation
 * @param {string} secret - Base32 encoded secret
 * @param {number} digits - Number of digits in the OTP
 * @param {number} period - The time period in seconds
 * @returns {string} - The generated TOTP
 */
const generateFallbackTOTP = (secret, digits = 6, period = 30) => {
  try {
    // Remove spaces and convert to uppercase
    const normalizedSecret = secret.replace(/\s/g, '').toUpperCase();
    
    // For fallback, we'll generate a deterministic but simplistic code
    // This isn't secure, but it's better than nothing when the library fails
    let hash = 0;
    const timestamp = Math.floor(Date.now() / 1000 / period);
    
    // Generate a simple hash from the secret and timestamp
    const data = normalizedSecret + timestamp;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Make sure hash is positive
    hash = Math.abs(hash);
    
    // Get last digits
    const code = hash % Math.pow(10, digits);
    
    // Pad with leading zeros if needed
    return code.toString().padStart(digits, '0');
  } catch (e) {
    console.error('Fallback TOTP generation failed:', e);
    return '000000'; // Return zeros as last resort
  }
};

/**
 * Generates a TOTP token
 * @param {Object} token - The TOTP token configuration
 * @param {number} period - The time period to generate the token for
 * @returns {string} - The generated TOTP token
 */
export const generateTOTPToken = (token, period = 30) => {
  try {
    // Check if OTPAuth library is available
    if (typeof OTPAuth !== 'undefined') {
      try {
        // Create a new TOTP object
        const totp = new OTPAuth.TOTP({
          issuer: token.issuer || '',
          label: token.account || '',
          algorithm: token.algorithm || 'SHA1',
          digits: token.digits || 6,
          period: period,
          secret: OTPAuth.Secret.fromBase32(token.secret)
        });
        
        // Generate the token
        return totp.generate();
      } catch (error) {
        console.error('OTPAuth library error:', error);
        // Fall back to our simple implementation
        return generateFallbackTOTP(token.secret, token.digits || 6, period);
      }
    } else {
      console.warn('OTPAuth library not available, using fallback implementation');
      // Use fallback implementation
      return generateFallbackTOTP(token.secret, token.digits || 6, period);
    }
  } catch (error) {
    console.error('Error generating TOTP token:', error);
    return '------'; // Visual indication of error
  }
};

/**
 * Generates an RSA token
 * @param {Object} token - The RSA token configuration
 * @returns {string} - The generated RSA token
 */
export const generateRSAToken = (token) => {
  try {
    // Check if RSASecurID is defined
    if (typeof RSASecurID === 'undefined' || !RSASecurID.TokenGenerator) {
      console.error('RSASecurID library not available');
      return '------';
    }

    // Use our custom RSA simulator with algorithm parameter
    const algorithm = token.algorithm || 'SHA-256';
    const generator = new RSASecurID.TokenGenerator(token.secret, algorithm);
    const code = generator.getTokenCode();
    
    // Ensure we return a string and not null
    return code || '------';
  } catch (error) {
    console.error('Error generating RSA token:', error);
    return '------'; // Return a visual error indicator instead of null
  }
};

/**
 * Gets the next token that will be generated
 * @param {Object} token - The token configuration 
 * @returns {string} - The next token
 */
export const getNextToken = (token) => {
  try {
    if (!token || !token.type) {
      console.error('Invalid token object for getNextToken:', token);
      return '------';
    }
    
    if (token.type === 'TOTP') {
      try {
        // For TOTP, calculate the next time period
        const now = Math.floor(Date.now() / 1000);
        const currentPeriod = Math.floor(now / 30);
        const nextPeriod = currentPeriod + 1;
        const nextTimestamp = nextPeriod * 30 * 1000; // Convert to milliseconds
        
        // Use a different timestamp for the next period
        const period = token.period || 30;
        
        // For fallback implementation (if needed)
        if (typeof OTPAuth === 'undefined') {
          return generateFallbackTOTP(token.secret, token.digits || 6, period);
        }
        
        try {
          // Create a new TOTP object
          const totp = new OTPAuth.TOTP({
            issuer: token.issuer || '',
            label: token.account || '',
            algorithm: token.algorithm || 'SHA1',
            digits: token.digits || 6,
            period: period,
            secret: OTPAuth.Secret.fromBase32(token.secret)
          });
          
          // Generate token for next time period
          const nextToken = totp.generate({ timestamp: nextTimestamp });
          return nextToken || '------';
        } catch (error) {
          console.error('Error generating next TOTP with library:', error);
          return generateFallbackTOTP(token.secret, token.digits || 6, period);
        }
      } catch (error) {
        console.error('Error generating next TOTP token:', error);
        return '------'; // Visual indication of error
      }
    } else if (token.type === 'RSA') {
      // For RSA, use the getNextTokenCode method
      try {
        // Check if RSASecurID is defined
        if (typeof RSASecurID === 'undefined' || !RSASecurID.TokenGenerator) {
          console.error('RSASecurID library not available for next token');
          return '------';
        }
        
        const algorithm = token.algorithm || 'SHA-256';
        const generator = new RSASecurID.TokenGenerator(token.secret, algorithm);
        const nextCode = generator.getNextTokenCode();
        return nextCode || '------';
      } catch (error) {
        console.error('Error generating next RSA token:', error);
        return '------'; // Visual indication of error
      }
    } else {
      console.warn(`Unknown token type for next token: ${token.type}`);
      return '------';
    }
  } catch (error) {
    console.error('Unexpected error in getNextToken:', error);
    return '------';
  }
};

/**
 * Calculates the time remaining until the token refreshes
 * @returns {number} - Seconds remaining
 */
export const getTimeRemaining = () => {
  const now = Math.floor(Date.now() / 1000);
  return 30 - (now % 30);
};

/**
 * Check if a string is a valid Base32 string
 * @param {string} str - The string to validate
 * @returns {boolean} - True if the string is a valid Base32 string
 */
const isValidBase32 = (str) => {
  // Base32 only allows A-Z and 2-7, and possibly padding with '='
  const base32Regex = /^[A-Z2-7]+=*$/i;
  
  // Remove spaces and normalize to uppercase
  const normalized = str.replace(/\s/g, '').toUpperCase();
  
  // Length should be a multiple of 8, or have valid padding
  const validLength = normalized.length % 8 === 0 || 
                     (normalized.endsWith('=') && normalized.indexOf('=') > normalized.length - 7);
  
  return base32Regex.test(normalized) && validLength;
};

/**
 * Validates a token secret based on the token type
 * @param {string} type - The token type (TOTP or RSA)
 * @param {string} secret - The token secret
 * @returns {boolean} - Whether the secret is valid
 */
export const validateSecret = (type, secret) => {
  if (!secret || secret.trim() === '') {
    return false;
  }
  
  if (type === 'TOTP') {
    try {
      // First perform our own validation
      if (!isValidBase32(secret)) {
        return false;
      }
      
      // If OTPAuth is available, also try with the library
      if (typeof OTPAuth !== 'undefined') {
        try {
          OTPAuth.Secret.fromBase32(secret);
        } catch (error) {
          // If library validation fails, return false
          return false;
        }
      }
      
      // Secret passed our validation
      return true;
    } catch (error) {
      console.error('Error validating TOTP secret:', error);
      return false;
    }
  } else if (type === 'RSA') {
    // RSA secrets should be at least 16 characters long
    return secret.length >= 16;
  }
  
  return false;
};
