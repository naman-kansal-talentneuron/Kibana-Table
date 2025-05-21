// Popup script for the extension

// Variables to track state
let dataExtracted = false;
let extractedData = null;
let currentTheme = 'dark'; // Default theme is dark mode

// When popup opens
document.addEventListener('DOMContentLoaded', function() {
  // Set up event listeners
  document.getElementById('parseButton').addEventListener('click', parseJsonInput);
  document.getElementById('viewTableButton').addEventListener('click', viewTable);
  document.getElementById('clearButton').addEventListener('click', clearData);
  document.getElementById('themeToggle').addEventListener('change', handleThemeToggle);
  
  // Initialize theme from saved preference
  initializeTheme();
  
  // Check if we already have extracted data
  chrome.storage.local.get(['kibanaData', 'extractionTime'], function(result) {
    if (result.kibanaData) {
      extractedData = result.kibanaData;
      dataExtracted = true;
      
      enableButton('viewTableButton');
      enableButton('clearButton');
      showDataPreview(result.kibanaData, result.extractionTime);
    }
  });
});

// Parse JSON input from textarea
function parseJsonInput() {
  const jsonInput = document.getElementById('jsonInput').value.trim();
  
  if (!jsonInput) {
    showNotification('warning', 'Please paste JSON data first.');
    return;
  }
  
  try {
    // Try to parse the JSON
    const jsonData = JSON.parse(jsonInput);
    const extractionTime = new Date().toISOString();
    
    // Store the data
    chrome.storage.local.set({
      kibanaData: jsonData,
      extractionTime: extractionTime
    }, function() {
      extractedData = jsonData;
      dataExtracted = true;
      
      showNotification('success', 'JSON parsed successfully!');
      enableButton('viewTableButton');
      enableButton('clearButton');      showDataPreview(jsonData, extractionTime);
    });
  } catch (error) {
    showNotification('danger', 'Invalid JSON format: ' + error.message);
  }
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
    
    document.getElementById('jsonInput').value = '';
    hideDataPreview();
    enableButton('viewTableButton', false);
    enableButton('clearButton', false);
    showNotification('info', 'Data cleared successfully.');
  });
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

// Initialize theme from saved preference
function initializeTheme() {
  // Try to get saved preference or default to dark mode
  chrome.storage.local.get(['theme'], function(result) {
    const savedTheme = result.theme || 'dark';
    applyTheme(savedTheme);
    
    // Update toggle switch state
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.checked = savedTheme === 'dark';
    }
  });
}

// Handler for theme toggle
function handleThemeToggle(e) {
  const isDarkMode = e.target.checked;
  const newTheme = isDarkMode ? 'dark' : 'light';
  
  // Save preference and apply theme
  saveThemePreference(newTheme);
  applyTheme(newTheme);
}

// Save theme preference to Chrome storage
function saveThemePreference(theme) {
  currentTheme = theme;
  chrome.storage.local.set({ theme: theme });
}

// Apply theme to document
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  currentTheme = theme;
}
