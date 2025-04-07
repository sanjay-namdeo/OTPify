// Define the browser API object - Firefox uses browser, Chrome uses chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

/**
 * Helper function to get the storage
 */
const getStorage = () => {
  return browserAPI?.storage?.sync || browserAPI?.storage?.local;
};

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
  try {
    // First check if the popup is open before attempting to send messages
    const views = browserAPI.extension.getViews({ type: 'popup' });
    if (!views || views.length === 0) {
      // Popup isn't open, no need to send a message
      return;
    }
    
    // Popup is open, attempt to send the message
    const isFirefox = typeof browser !== 'undefined';
    
    if (isFirefox) {
      // Firefox implementation with Promise - silently handle connection errors
      browser.runtime.sendMessage(message)
        .catch(error => {
          // Only log unexpected errors (not connection errors which are expected)
          if (error && error.message && 
              !error.message.includes('receiving end does not exist') && 
              !error.message.includes('Could not establish connection')) {
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
  } catch (error) {
    // Only log unexpected errors
    if (error && error.message && 
        !error.message.includes('receiving end does not exist') && 
        !error.message.includes('Could not establish connection')) {
      console.log('Error in sendMessageToPopupSafely:', error);
    }
  }
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
    try {
      // Refresh tokens
      if (alarm.name === "refreshTokens") {
        // Try to send message to popup if it's open
        sendMessageToPopupSafely({ action: "refreshTokens" });
        
        // Also dispatch a custom event which the popup can listen for
        // This is a more reliable way to update tokens across different browser implementations
        try {
          const views = browserAPI.extension.getViews({ type: 'popup' });
          if (views && views.length > 0) {
            views[0].dispatchEvent(new CustomEvent('refreshTokens'));
          }
        } catch (error) {
          console.log('Error dispatching refresh event:', error);
        }
      }
      
      // Auto-lock
      if (alarm.name === "autoLock") {
        // Only lock if authenticated
        if (isAuthenticated) {
          // Calculate time since last activity
          const checkLastActivity = async () => {
            try {
              const storage = getStorage();
              const { lastActivity } = await storage.get('lastActivity');
              
              if (lastActivity) {
                const now = Date.now();
                const timeSinceLastActivity = now - lastActivity;
                
                // Auto-lock after inactivity period (convert minutes to ms)
                if (timeSinceLastActivity > autoLockMinutes * 60 * 1000) {
                  // Clear the master password key and session
                  masterPasswordKey = null;
                  isAuthenticated = false;
                  
                  // Notify the popup
                  sendMessageToPopupSafely({ action: "autoLock" });
                }
              }
            } catch (error) {
              console.error('Error checking last activity:', error);
            }
          };
          
          checkLastActivity();
        }
      }
    } catch (error) {
      console.error('Error in alarm listener:', error);
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
  
  // State for master password session
  let masterPasswordKey = null;
  let isAuthenticated = false;
  let autoLockMinutes = 5; // Default auto-lock time (5 minutes)

  // Listen for messages from popup or other parts of the extension
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Ping to check if background script is running
    if (message && message.action === 'ping') {
      sendResponse({ status: 'success', message: 'Background script is running' });
      return true;
    }
    
    // Update last activity timestamp (for auto-lock feature)
    if (message && message.action === 'activity') {
      try {
        const storage = getStorage();
        storage.set({ lastActivity: Date.now() });
        sendResponse({ status: 'success' });
      } catch (error) {
        console.error('Error updating activity timestamp:', error);
        sendResponse({ status: 'error', message: error.message });
      }
      return true;
    }
    
    // Reset auto-lock timer
    if (message && message.action === 'resetAutoLock') {
      try {
        browserAPI.alarms.clear("autoLock");
        browserAPI.alarms.create("autoLock", { periodInMinutes: autoLockMinutes });
        sendResponse({ status: 'success' });
      } catch (error) {
        console.error('Error resetting auto-lock timer:', error);
        sendResponse({ status: 'error', message: error.message });
      }
      return true;
    }
    
    // Update auto-lock time
    if (message && message.action === 'updateAutoLockTime') {
      try {
        if (message.minutes && typeof message.minutes === 'number') {
          autoLockMinutes = message.minutes;
          browserAPI.alarms.clear("autoLock");
          browserAPI.alarms.create("autoLock", { periodInMinutes: autoLockMinutes });
          sendResponse({ status: 'success' });
        } else {
          sendResponse({ status: 'error', message: 'Invalid minutes value' });
        }
      } catch (error) {
        console.error('Error updating auto-lock time:', error);
        sendResponse({ status: 'error', message: error.message });
      }
      return true;
    }
    
    // Set up master password for the first time
    if (message && message.action === 'setupMasterPassword') {
      (async () => {
        try {
          if (!message.password) {
            sendResponse({ status: 'error', message: 'No password provided' });
            return;
          }
          
          const salt = CryptoUtils.generateSalt();
          const passwordHash = await CryptoUtils.createPasswordHash(message.password, salt);
          
          // Store salt and password hash
          await getStorage().set({ salt, passwordHash });
          
          // Generate encryption key
          masterPasswordKey = await CryptoUtils.deriveKey(message.password, salt);
          isAuthenticated = true;
          
          // Initialize with empty tokens array
          const encryptedTokens = await CryptoUtils.encryptData([], masterPasswordKey);
          await getStorage().set({ encryptedTokens });
          
          // Reset auto-lock timer
          browserAPI.alarms.clear("autoLock");
          browserAPI.alarms.create("autoLock", { periodInMinutes: autoLockMinutes });
          
          sendResponse({ status: 'success' });
        } catch (error) {
          console.error('Error setting up master password:', error);
          sendResponse({ status: 'error', message: error.message });
        }
      })();
      return true;
    }
    
    // Verify master password
    if (message && message.action === 'verifyMasterPassword') {
      (async () => {
        try {
          if (!message.password) {
            sendResponse({ status: 'error', message: 'No password provided' });
            return;
          }
          
          // Get salt and stored hash
          const storage = getStorage();
          const { salt, passwordHash } = await storage.get(['salt', 'passwordHash']);
          
          if (!salt || !passwordHash) {
            sendResponse({ status: 'error', message: 'Password not set up' });
            return;
          }
          
          // Generate hash from provided password
          const calculatedHash = await CryptoUtils.createPasswordHash(message.password, salt);
          
          // Compare with stored hash
          if (calculatedHash === passwordHash) {
            // Generate encryption key
            masterPasswordKey = await CryptoUtils.deriveKey(message.password, salt);
            isAuthenticated = true;
            
            // Reset auto-lock timer
            browserAPI.alarms.clear("autoLock");
            browserAPI.alarms.create("autoLock", { periodInMinutes: autoLockMinutes });
            
            sendResponse({ status: 'success' });
          } else {
            sendResponse({ status: 'error', message: 'Incorrect password' });
          }
        } catch (error) {
          console.error('Error verifying master password:', error);
          sendResponse({ status: 'error', message: error.message });
        }
      })();
      return true;
    }
    
    // Check if user is authenticated
    if (message && message.action === 'checkSession') {
      sendResponse({ 
        status: 'success', 
        hasSession: isAuthenticated && masterPasswordKey !== null 
      });
      return true;
    }
    
    // Logout - clear the master password key
    if (message && message.action === 'logout') {
      masterPasswordKey = null;
      isAuthenticated = false;
      sendResponse({ status: 'success' });
      return true;
    }
    
    // Get tokens - decrypt from storage
    if (message && message.action === 'getTokens') {
      (async () => {
        try {
          if (!isAuthenticated || !masterPasswordKey) {
            sendResponse({ status: 'error', message: 'Not authenticated' });
            return;
          }
          
          const storage = getStorage();
          const { encryptedTokens } = await storage.get('encryptedTokens');
          
          if (!encryptedTokens) {
            sendResponse({ status: 'success', tokens: [] });
            return;
          }
          
          const tokens = await CryptoUtils.decryptData(encryptedTokens, masterPasswordKey);
          sendResponse({ status: 'success', tokens });
        } catch (error) {
          console.error('Error getting tokens:', error);
          sendResponse({ status: 'error', message: error.message });
        }
      })();
      return true;
    }
    
    // Save tokens - encrypt and store
    if (message && message.action === 'saveTokens') {
      (async () => {
        try {
          if (!isAuthenticated || !masterPasswordKey) {
            sendResponse({ status: 'error', message: 'Not authenticated' });
            return;
          }
          
          if (!message.tokens || !Array.isArray(message.tokens)) {
            sendResponse({ status: 'error', message: 'Invalid tokens data' });
            return;
          }
          
          const encryptedTokens = await CryptoUtils.encryptData(message.tokens, masterPasswordKey);
          await getStorage().set({ encryptedTokens });
          
          sendResponse({ status: 'success' });
        } catch (error) {
          console.error('Error saving tokens:', error);
          sendResponse({ status: 'error', message: error.message });
        }
      })();
      return true;
    }
    
    // Export tokens for backup
    if (message && message.action === 'exportTokens') {
      (async () => {
        try {
          if (!isAuthenticated || !masterPasswordKey) {
            sendResponse({ status: 'error', message: 'Not authenticated' });
            return;
          }
          
          if (!message.password) {
            sendResponse({ status: 'error', message: 'No export password provided' });
            return;
          }
          
          // Get tokens from storage
          const storage = getStorage();
          const { encryptedTokens } = await storage.get('encryptedTokens');
          
          if (!encryptedTokens) {
            sendResponse({ status: 'error', message: 'No tokens to export' });
            return;
          }
          
          // Decrypt tokens using master password
          const tokens = await CryptoUtils.decryptData(encryptedTokens, masterPasswordKey);
          
          // Create a temporary key for the export password
          const exportSalt = CryptoUtils.generateSalt();
          const exportKey = await CryptoUtils.deriveKey(message.password, exportSalt);
          
          // Encrypt tokens with the export password
          const exportData = await CryptoUtils.encryptData(tokens, exportKey);
          
          // Create the export package
          const exportPackage = {
            salt: exportSalt,
            data: exportData,
            version: '1.0',
            timestamp: Date.now()
          };
          
          // Convert to JSON string and encode as base64
          const exportString = btoa(JSON.stringify(exportPackage));
          
          sendResponse({ 
            status: 'success', 
            exportData: exportString 
          });
        } catch (error) {
          console.error('Error exporting tokens:', error);
          sendResponse({ status: 'error', message: error.message });
        }
      })();
      return true;
    }
    
    // Import tokens from backup
    if (message && message.action === 'importTokens') {
      (async () => {
        try {
          if (!isAuthenticated || !masterPasswordKey) {
            sendResponse({ status: 'error', message: 'Not authenticated' });
            return;
          }
          
          if (!message.importData) {
            sendResponse({ status: 'error', message: 'No import data provided' });
            return;
          }
          
          if (!message.password) {
            sendResponse({ status: 'error', message: 'No import password provided' });
            return;
          }
          
          // Decode base64 and parse JSON
          let importPackage;
          try {
            const jsonString = atob(message.importData);
            importPackage = JSON.parse(jsonString);
          } catch (error) {
            sendResponse({ status: 'error', message: 'Invalid import data format' });
            return;
          }
          
          if (!importPackage.salt || !importPackage.data) {
            sendResponse({ status: 'error', message: 'Corrupted import data' });
            return;
          }
          
          // Create a key from the import password
          const importKey = await CryptoUtils.deriveKey(message.password, importPackage.salt);
          
          // Decrypt the imported tokens
          let importedTokens;
          try {
            importedTokens = await CryptoUtils.decryptData(importPackage.data, importKey);
          } catch (error) {
            sendResponse({ status: 'error', message: 'Incorrect password or corrupted data' });
            return;
          }
          
          if (!Array.isArray(importedTokens)) {
            sendResponse({ status: 'error', message: 'Invalid token data in import' });
            return;
          }
          
          // Get existing tokens
          const storage = getStorage();
          const { encryptedTokens } = await storage.get('encryptedTokens');
          let existingTokens = [];
          
          if (encryptedTokens) {
            existingTokens = await CryptoUtils.decryptData(encryptedTokens, masterPasswordKey);
          }
          
          // Merge tokens, avoiding duplicates by checking for same secret
          const existingSecrets = new Set(existingTokens.map(token => token.secret));
          const newTokens = importedTokens.filter(token => !existingSecrets.has(token.secret));
          const mergedTokens = [...existingTokens, ...newTokens];
          
          // Save merged tokens
          const newEncryptedTokens = await CryptoUtils.encryptData(mergedTokens, masterPasswordKey);
          await storage.set({ encryptedTokens: newEncryptedTokens });
          
          sendResponse({ 
            status: 'success', 
            message: `Imported ${newTokens.length} new tokens successfully.` 
          });
        } catch (error) {
          console.error('Error importing tokens:', error);
          sendResponse({ status: 'error', message: error.message });
        }
      })();
      return true;
    }
    
    return true; // Keep the messaging channel open for async responses
  });
  
  console.log('OTPify background script loaded with security enhancements');
} catch (error) {
  console.error('Error in background script:', error);
}
