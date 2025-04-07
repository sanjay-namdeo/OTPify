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
  isPopupOpen((isOpen) => {
    if (isOpen) {
      try {
        browserAPI.runtime.sendMessage(message).catch((error) => {
          // Only log actual errors, not connection errors
          if (error && error.message && !error.message.includes('receiving end does not exist')) {
            console.log('Error sending message:', error);
          }
        });
      } catch (error) {
        // For synchronous errors
        console.log('Error sending message synchronously:', error);
      }
    }
  });
};

try {
  // Setup an alarm to refresh tokens every second
  browserAPI.alarms.create("refreshTokens", { periodInMinutes: 1/60 });
  
  // Listen for the alarm and send a message to the popup to refresh tokens
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "refreshTokens") {
      sendMessageToPopupSafely({ action: "refreshTokens" });
    }
  });
  
  // Initialize the extension when installed or updated
  browserAPI.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      console.log('OTPify extension installed');
      // Initialize storage if needed
      try {
        // Use both sync and local storage for compatibility
        await browserAPI.storage.sync.set({ tokens: [] });
        await browserAPI.storage.local.set({ tokens: [] });
        console.log('Storage initialized successfully');
      } catch (error) {
        console.error('Error initializing storage:', error);
      }
    }
  });
  
  // Listen for messages from popup or other parts of the extension
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle any messages from the popup if needed
    if (message && message.action === 'ping') {
      sendResponse({ status: 'success', message: 'Background script is running' });
    }
    return true; // Keep the messaging channel open for async responses
  });
  
  console.log('OTPify background script loaded');
} catch (error) {
  console.error('Error in background script:', error);
}
