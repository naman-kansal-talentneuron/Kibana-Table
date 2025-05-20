// Background script for the extension
chrome.runtime.onInstalled.addListener(function() {
  console.log("Kibana Table Exporter extension installed");
  
  // Initialize storage with empty data
  chrome.storage.local.set({kibanaData: null}, function() {
    console.log("Storage initialized");
  });
});

// Message passing between popup and content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "storeData") {
    chrome.storage.local.set({kibanaData: request.data}, function() {
      sendResponse({success: true});
    });
    return true; // Required for async response
  }
});
