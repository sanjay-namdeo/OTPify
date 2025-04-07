// Define the browser API object - Firefox uses browser, Chrome uses chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

try {
  // Setup an alarm to refresh tokens every second
  browserAPI.alarms.create("refreshTokens", { periodInMinutes: 1/60 });
  
  // Listen for the alarm and send a message to the popup to refresh tokens
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "refreshTokens") {
      browserAPI.runtime.sendMessage({ action: "refreshTokens" })
        .catch(error => {
          // It's common for this to error if no popup is open to receive the message
          console.debug('Error sending refresh message:', error);
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
