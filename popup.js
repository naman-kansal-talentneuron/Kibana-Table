// Popup script for the extension

// Variables to track state
let kibanaDetected = false;
let dataExtracted = false;
let extractedData = null;

// When popup opens, check if we're on a Kibana page
document.addEventListener('DOMContentLoaded', function() {
  // Set up event listeners
  document.getElementById('extractButton').addEventListener('click', extractData);
  document.getElementById('viewTableButton').addEventListener('click', viewTable);
  document.getElementById('clearButton').addEventListener('click', clearData);
  
  // Check if we're on a Kibana page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    
    // Check if we're on a Kibana page
    if (currentUrl.includes('kibana') || 
        currentUrl.includes('elasticsearch') || 
        currentUrl.includes('elastic')) {
      
      kibanaDetected = true;
      updateStatus('active', 'Ready to extract data');
      enableButton('extractButton');
      
      // Check if we already have extracted data
      chrome.storage.local.get(['kibanaData', 'extractionTime'], function(result) {
        if (result.kibanaData) {
          extractedData = result.kibanaData;
          dataExtracted = true;
          
          enableButton('viewTableButton');
          enableButton('clearButton');
          updateStatus('active', 'Data available');
          showDataPreview(result.kibanaData, result.extractionTime);
        }
      });
    } else {
      updateStatus('inactive', 'Not on a Kibana page');
      showNotification('warning', 'Please navigate to a Kibana page to use this extension.');
    }
  });
});

// Extract data from the current page
function extractData() {
  updateStatus('pending', 'Extracting data...');
  enableButton('extractButton', false);
  
  document.getElementById('extractButton').innerHTML = `
    <span class="spinner-border" role="status" aria-hidden="true"></span>
    Extracting...
  `;
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const tabId = tabs[0].id;
    
    chrome.tabs.sendMessage(tabId, {action: 'extract'}, function(response) {
      // Reset button state
      document.getElementById('extractButton').innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
        </svg>
        Extract Data from Kibana
      `;
      enableButton('extractButton', true);
      
      // Handle response
      if (chrome.runtime.lastError) {
        updateStatus('inactive', 'Extraction failed');
        showNotification('danger', 'Could not connect to the page. Make sure you are on a Kibana page and refresh if needed.');
        return;
      }
      
      if (response && response.success) {
        // Store the data
        const extractionTime = new Date().toISOString();
        extractedData = response.data;
        
        chrome.storage.local.set({
          kibanaData: response.data,
          extractionTime: extractionTime
        }, function() {
          dataExtracted = true;
          updateStatus('active', 'Data extracted successfully');
          showNotification('success', 'Data extracted successfully!');
          enableButton('viewTableButton');
          enableButton('clearButton');
          showDataPreview(response.data, extractionTime);
        });
      } else {
        updateStatus('inactive', 'Extraction failed');
        showNotification('danger', response?.error || 'Could not extract data from Kibana.');
      }
    });
  });
}

// Open the table view
function viewTable() {
  chrome.tabs.create({url: 'table.html'});
}

// Clear stored data
function clearData() {
  chrome.storage.local.remove(['kibanaData', 'extractionTime'], function() {
    extractedData = null;
    dataExtracted = false;
    
    updateStatus('active', 'Ready to extract');
    hideDataPreview();
    enableButton('viewTableButton', false);
    enableButton('clearButton', false);
    showNotification('info', 'Data cleared successfully.');
  });
}

// Helper: Update status indicator
function updateStatus(status, message) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  statusText.textContent = message;
  
  // Remove existing classes
  statusDot.classList.remove('status-active', 'status-inactive', 'status-pending');
  
  // Add appropriate class
  statusDot.classList.add(`status-${status}`);
}

// Helper: Enable/disable a button
function enableButton(buttonId, enable = true) {
  document.getElementById(buttonId).disabled = !enable;
}

// Helper: Show data preview
function showDataPreview(data, timestamp) {
  const previewDiv = document.getElementById('dataPreview');
  const jsonPreview = document.getElementById('jsonPreview');
  const timeDiv = document.getElementById('extractionTime');
  
  // Show container
  previewDiv.style.display = 'block';
  
  // Add truncated/formatted data
  const truncatedData = truncateData(data);
  jsonPreview.textContent = JSON.stringify(truncatedData, null, 2);
  
  // Show extraction time
  if (timestamp) {
    const date = new Date(timestamp);
    timeDiv.textContent = `Extracted: ${date.toLocaleString()}`;
  }
}

// Helper: Hide data preview
function hideDataPreview() {
  document.getElementById('dataPreview').style.display = 'none';
}

// Helper: Show a notification
function showNotification(type, message) {
  const container = document.getElementById('notifications');
  const id = 'notification-' + Date.now();
  
  const notification = document.createElement('div');
  notification.id = id;
  notification.className = `notification alert alert-${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const element = document.getElementById(id);
    if (element) {
      element.style.opacity = '0';
      setTimeout(() => element.remove(), 300);
    }
  }, 5000);
}

// Helper: Truncate data for preview
function truncateData(data, maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth) return "...";
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const result = Array.isArray(data) ? [] : {};
  
  const keys = Object.keys(data);
  const maxKeys = 5;
  
  for (let i = 0; i < Math.min(keys.length, maxKeys); i++) {
    const key = keys[i];
    result[key] = truncateData(data[key], maxDepth, currentDepth + 1);
  }
  
  if (keys.length > maxKeys) {
    result["..."] = `(${keys.length - maxKeys} more items)`;
  }
  
  return result;
}
