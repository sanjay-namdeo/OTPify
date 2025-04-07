// Define the browser API object - Firefox uses browser, Chrome uses chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

try {
  // Setup an alarm to refresh tokens every second
  browserAPI.alarms.create("refreshTokens", { periodInMinutes: 1/60 });
  
  // Listen for the alarm and send a message to the popup to refresh tokens
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "refreshTokens") {
      // Check if popup exists before sending message
      browserAPI.runtime.getBackgroundPage(() => {
        // Note: We don't need to handle errors here because we're checking if popup exists
        try {
          // We use runtime.sendMessage but quietly ignore any connection errors
          // that occur when the popup is not open
          browserAPI.runtime.sendMessage({ action: "refreshTokens" }).catch(() => {
            // Silently ignore connection errors - this is normal when popup is closed
          });
        } catch (error) {
          // Silently ignore errors
        }
      });
    }
  });
  
  // Initialize the extension when installed or updated
  browserAPI.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      console.log('OTPify extension installed');
      // Initialize storage if needed
      try {
        await browserAPI.storage.local.set({ tokens: [] });
        console.log('Storage initialized successfully');
      } catch (error) {
        console.error('Error initializing storage:', error);
      }
    }
  });
  
  console.log('OTPify background script loaded');
} catch (error) {
  console.error('Error in background script:', error);
}
