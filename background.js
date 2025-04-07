// Define the browser API object - Firefox uses browser, Chrome uses chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

/**
 * Check if a tab (popup) is connected and can receive messages
 * @param {function} callback - Function to call with the result (true/false)
 */
const isPopupOpen = (callback) => {
  try {
    browserAPI.extension.getViews({ type: 'popup' }).length > 0 ? 
      callback(true) : callback(false);
  } catch (error) {
    console.log('Error checking popup state:', error);
    callback(false);
  }
};

/**
 * Send a message safely to the popup if it's open
 * @param {Object} message - The message to send
 */
const sendMessageToPopupSafely = (message) => {
  // Check popup status with a more reliable method
  browserAPI.runtime.getBackgroundPage(function(backgroundPage) {
    try {
      // Check if any popup views exist
      const views = browserAPI.extension.getViews({ type: 'popup' });
      if (views && views.length > 0) {
        // Detect Firefox (uses promises) vs Chrome (uses callbacks)
        const isFirefox = typeof browser !== 'undefined';
        
        if (isFirefox) {
          // Firefox implementation with Promise - silently handle connection errors
          browser.runtime.sendMessage(message)
            .then(response => {
              // Message sent successfully
            })
            .catch(error => {
              // Ignore expected connection errors
              if (error && error.message && 
                 !error.message.includes('receiving end does not exist') && 
                 !error.message.includes('Could not establish connection')) {
                // Only log unexpected errors
                console.log('Error sending message:', error);
              }
            });
        } else {
          // Chrome implementation with callback
          chrome.runtime.sendMessage(message, response => {
            // Ignore expected connection errors
            if (chrome.runtime.lastError) {
              const errorMsg = chrome.runtime.lastError.message || '';
              if (!errorMsg.includes('receiving end does not exist') && 
                  !errorMsg.includes('Could not establish connection')) {
                console.log('Error sending message:', chrome.runtime.lastError);
              }
            }
          });
        }
      }
    } catch (error) {
      // Only log unexpected errors
      if (error && error.message && 
         !error.message.includes('receiving end does not exist') && 
         !error.message.includes('Could not establish connection')) {
        console.log('Error in sendMessageToPopupSafely:', error);
      }
    }
  });
};

/**
 * Crypto utility functions for secure background operations
 */
const CryptoUtils = {
  /**
   * Derive a key from a password for encryption/decryption operations
   * @param {string} password - The master password
   * @param {string} salt - The salt for key derivation
   * @returns {Promise<CryptoKey>} - The derived key
   */
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(salt);
    
    // Import the password as a key
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive a key for AES-GCM
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },
  
  /**
   * Create a hash of the master password for verification
   * @param {string} password - The master password
   * @param {string} salt - The salt for key derivation
   * @returns {Promise<string>} - The password hash as a hex string
   */
  async createPasswordHash(password, salt) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Import the password as a key
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive bits for verification
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      256
    );
    
    // Convert to a string for storage
    return Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },
  
  /**
   * Encrypt data with the derived key
   * @param {Object} data - The data to encrypt
   * @param {CryptoKey} key - The encryption key
   * @returns {Promise<Object>} - The encrypted data and IV
   */
  async encryptData(data, key) {
    const encoder = new TextEncoder();
    const dataToEncrypt = encoder.encode(JSON.stringify(data));
    
    // Generate initialization vector
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      dataToEncrypt
    );
    
    // Convert encrypted data to a base64 string for storage
    const encryptedArray = new Uint8Array(encryptedData);
    const ivString = Array.from(iv).map(b => String.fromCharCode(b)).join('');
    const encryptedString = Array.from(encryptedArray).map(b => String.fromCharCode(b)).join('');
    
    return {
      iv: btoa(ivString),
      encryptedData: btoa(encryptedString)
    };
  },
  
  /**
   * Decrypt data with the derived key
   * @param {Object} encryptedObj - The encrypted data and IV
   * @param {CryptoKey} key - The decryption key
   * @returns {Promise<Object>} - The decrypted data
   */
  async decryptData(encryptedObj, key) {
    try {
      // Convert base64 strings back to arrays
      const iv = Uint8Array.from(atob(encryptedObj.iv).split('').map(c => c.charCodeAt(0)));
      const encryptedData = Uint8Array.from(atob(encryptedObj.encryptedData).split('').map(c => c.charCodeAt(0)));
      
      // Decrypt the data
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encryptedData
      );
      
      // Convert the decrypted data to a string and parse
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedData));
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Invalid master password or corrupted data');
    }
  },
  
  /**
   * Generate a random salt for key derivation
   * @returns {string} - A random salt as a hex string
   */
  generateSalt() {
    const saltArray = window.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(saltArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
};

try {
  // Setup an alarm to refresh tokens every second
  browserAPI.alarms.create("refreshTokens", { periodInMinutes: 1/60 });
  
  // Setup an automatic security lock alarm (lock after 5 minutes of inactivity)
  browserAPI.alarms.create("autoLock", { periodInMinutes: 5 });
  
  // Listen for alarms
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    // Refresh tokens
    if (alarm.name === "refreshTokens") {
      sendMessageToPopupSafely({ action: "refreshTokens" });
    }
    
    // Auto-lock
    if (alarm.name === "autoLock") {
      sendMessageToPopupSafely({ action: "autoLock" });
    }
  });
  
  // Initialize the extension when installed or updated
  browserAPI.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      console.log('OTPify extension installed');
      // Initialize storage with empty encrypted state
      try {
        // Prepare storage for encrypted data model
        await browserAPI.storage.sync.set({ 
          salt: null,
          passwordHash: null,
          encryptedTokens: null,
          lastActivity: Date.now()
        });
        
        await browserAPI.storage.local.set({
          salt: null,
          passwordHash: null,
          encryptedTokens: null,
          lastActivity: Date.now()
        });
        
        console.log('Storage initialized successfully for encrypted data model');
      } catch (error) {
        console.error('Error initializing storage:', error);
      }
    }
  });
  
  // Listen for messages from popup or other parts of the extension
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Ping to check if background script is running
    if (message && message.action === 'ping') {
      sendResponse({ status: 'success', message: 'Background script is running' });
    }
    
    // Update last activity timestamp (for auto-lock feature)
    if (message && message.action === 'activity') {
      try {
        const storage = browserAPI?.storage?.sync || browserAPI?.storage?.local;
        storage.set({ lastActivity: Date.now() });
      } catch (error) {
        console.error('Error updating activity timestamp:', error);
      }
    }
    
    // Reset auto-lock timer
    if (message && message.action === 'resetAutoLock') {
      try {
        browserAPI.alarms.clear("autoLock");
        browserAPI.alarms.create("autoLock", { periodInMinutes: 5 });
      } catch (error) {
        console.error('Error resetting auto-lock timer:', error);
      }
    }
    
    return true; // Keep the messaging channel open for async responses
  });
  
  console.log('OTPify background script loaded with security enhancements');
} catch (error) {
  console.error('Error in background script:', error);
}
