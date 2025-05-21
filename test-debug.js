// Sample test data
const sampleData = {
  "hits": {
    "hits": [
      {
        "_id": "sample1",
        "_index": "test-index",
        "_score": 1.0,
        "_source": {
          "field1": "Sample Value 1",
          "field2": 123,
          "nested": { "value": "test" }
        }
      },
      {
        "_id": "sample2",
        "_index": "test-index",
        "_score": 1.0,
        "_source": {
          "field1": "Sample Value 2",
          "field2": 456,
          "nested": { "value": "test2" }
        }
      },
      {
        "_id": "sample3",
        "_index": "test-index",
        "_score": 1.0,
        "_source": {
          "field1": "Sample Value 3",
          "field2": 789,
          "nested": { "value": "test3" }
        }
      }
    ],
    "total": {
      "value": 3
    }
  }
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const jsonInput = document.getElementById('jsonInput');
  const jsonOutput = document.getElementById('jsonOutput');
  const parseBtn = document.getElementById('parseBtn');
  const testBtn = document.getElementById('testBtn');
  const openTableBtn = document.getElementById('openTableBtn');
  
  // Event Listeners
  parseBtn.addEventListener('click', function() {
    try {
      const json = JSON.parse(jsonInput.value);
      jsonOutput.textContent = JSON.stringify(json, null, 2);
      
      // Store in localStorage for debugging
      localStorage.setItem('kibanaData', JSON.stringify(json));
      
      // Enable view button
      openTableBtn.disabled = false;
    } catch (e) {
      jsonOutput.textContent = `Error: ${e.message}`;
      openTableBtn.disabled = true;
    }
  });
  
  testBtn.addEventListener('click', function() {
    jsonInput.value = JSON.stringify(sampleData, null, 2);
    jsonOutput.textContent = jsonInput.value;
    
    // Store in localStorage for debugging
    localStorage.setItem('kibanaData', JSON.stringify(sampleData));
    
    // Enable view button
    openTableBtn.disabled = false;
  });
  
  openTableBtn.addEventListener('click', function() {
    // Open table.html in a new tab with debug flag
    window.open('table.html#debug', '_blank');
  });
  
  // Initialize
  openTableBtn.disabled = true;
});
