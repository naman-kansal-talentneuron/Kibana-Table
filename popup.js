// Popup script
let extractedData = null;

document.addEventListener('DOMContentLoaded', function() {
  const extractButton = document.getElementById('extractButton');
  const previewButton = document.getElementById('previewButton');
  const exportCSVButton = document.getElementById('exportCSVButton');
  const exportExcelButton = document.getElementById('exportExcelButton');
  const statusDiv = document.getElementById('status');

  // Check if we have previously extracted data
  chrome.storage.local.get(['kibanaData'], function(result) {
    if (result.kibanaData) {
      extractedData = result.kibanaData;
      enableButtons();
      showStatus('Data already extracted! You can preview or export.', 'success');
    }
  });

  extractButton.addEventListener('click', function() {
    statusDiv.className = '';
    statusDiv.textContent = 'Extracting data...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extract"}, function(response) {
        if (response && response.success) {
          extractedData = response.data;
          
          // Store the data for future use
          chrome.storage.local.set({kibanaData: extractedData}, function() {
            enableButtons();
            showStatus('Data extracted successfully!', 'success');
          });
        } else {
          showStatus('Failed to extract data. Make sure you\'re on a Kibana dashboard page.', 'error');
        }
      });
    });
  });

  previewButton.addEventListener('click', function() {
    chrome.tabs.create({url: 'table.html'});
  });

  exportCSVButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "export", 
        format: "csv",
        data: extractedData
      });
    });
    showStatus('Exporting to CSV...', 'success');
  });

  exportExcelButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "export", 
        format: "excel",
        data: extractedData
      });
    });
    showStatus('Exporting to Excel...', 'success');
  });

  function enableButtons() {
    previewButton.disabled = false;
    exportCSVButton.disabled = false;
    exportExcelButton.disabled = false;
  }
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
  }
});
