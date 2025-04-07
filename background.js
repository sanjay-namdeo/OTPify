// Setup an alarm to refresh tokens every second
browser.alarms.create("refreshTokens", { periodInMinutes: 1/60 });

// Listen for the alarm and send a message to the popup to refresh tokens
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refreshTokens") {
    browser.runtime.sendMessage({ action: "refreshTokens" });
  }
});

// Initialize the extension when installed or updated
browser.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    console.log('OTPify extension installed');
    // Initialize storage if needed
    await browser.storage.local.set({ tokens: [] });
  }
});
