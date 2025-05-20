// Content script that runs in the context of web pages

// Add message listener
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "extract") {
    extractKibanaData()
      .then(data => {
        if (data) {
          sendResponse({success: true, data: data});
        } else {
          sendResponse({success: false});
        }
      })
      .catch(error => {
        console.error("Error extracting Kibana data:", error);
        sendResponse({success: false, error: error.message});
      });
    return true; // Keep the message channel open for the async response
  } else if (request.action === "export") {
    if (request.format === "csv") {
      exportToCSV(request.data);
    } else if (request.format === "excel") {
      exportToExcel(request.data);
    }
    return true;
  }
});

// Function to extract JSON data from Kibana
function extractKibanaData() {
  return new Promise((resolve) => {
    // First try to find pre or code elements containing JSON
    const preElements = document.querySelectorAll('pre');
    for (const pre of preElements) {
      try {
        const possibleJson = pre.textContent;
        const jsonData = JSON.parse(possibleJson);
        if (jsonData && jsonData.aggregations) {
          return resolve(jsonData);
        }
      } catch (e) {
        // Not valid JSON, continue checking
      }
    }

    // Try to find in Monaco editor (Kibana console)
    const editorElements = document.querySelectorAll('.monaco-editor');
    if (editorElements.length > 0) {
      // Extract from text visible in editor
      const lines = Array.from(document.querySelectorAll('.view-line'))
        .map(line => line.textContent.trim())
        .join('');
      
      try {
        // Try to parse any JSON-looking string with braces
        const jsonString = extractJsonString(lines);
        if (jsonString) {
          const jsonData = JSON.parse(jsonString);
          if (jsonData) {
            return resolve(jsonData);
          }
        }
      } catch (e) {
        console.error("Error parsing JSON from editor:", e);
      }
    }
    
    // If we can't find it in the DOM, try to look at network requests
    // This is a fallback and might not work without proper permissions
    console.log("Could not find Kibana data in the DOM elements");
    
    // Fallback: Check for global variables that might contain the data
    if (window.hasOwnProperty('elasticsearchData') || 
        window.hasOwnProperty('kibanaData')) {
      const globalData = window.elasticsearchData || window.kibanaData;
      if (globalData) {
        return resolve(globalData);
      }
    }
    
    // Last resort: try to prompt user to paste the JSON
    setTimeout(() => {
      const jsonInput = prompt("Could not automatically detect Kibana JSON data. Please paste your JSON data here:");
      if (jsonInput) {
        try {
          const data = JSON.parse(jsonInput);
          resolve(data);
        } catch (e) {
          alert("Invalid JSON format. Please try again.");
          resolve(null);
        }
      } else {
        resolve(null);
      }
    }, 100);
  });
}

function extractJsonString(text) {
  let start = text.indexOf('{');
  if (start !== -1) {
    let braceCount = 1;
    let end = start + 1;
    
    while (end < text.length && braceCount > 0) {
      if (text[end] === '{') braceCount++;
      if (text[end] === '}') braceCount--;
      end++;
    }
    
    if (braceCount === 0) {
      return text.substring(start, end);
    }
  }
  return null;
}

// Function to transform Kibana data into a table format
function transformToTableData(kibanaData) {
  if (!kibanaData || !kibanaData.aggregations || !kibanaData.aggregations.country_agg) {
    return null;
  }

  const result = [];
  const countryBuckets = kibanaData.aggregations.country_agg.buckets;

  for (const country of countryBuckets) {
    const countryCode = country.key;
    const totalDocCount = country.doc_count;
    
    if (country.source_name_agg && country.source_name_agg.buckets) {
      for (const source of country.source_name_agg.buckets) {
        if (!source.key) continue;
        
        const row = {
          countryCode: countryCode,
          totalDocCount: totalDocCount,
          sourceName: source.key,
          sourceDocCount: source.doc_count
        };
        
        // Add monthly job counts if available
        if (source.monthly_job_count && source.monthly_job_count.buckets) {
          source.monthly_job_count.buckets.forEach(monthBucket => {
            if (monthBucket.key_as_string) {
              row[`month_${monthBucket.key_as_string}`] = monthBucket.doc_count;
            }
          });
        }
        
        result.push(row);
      }
    }
  }
  
  return result;
}

// Function to export data to CSV
function exportToCSV(jsonData) {
  const tableData = transformToTableData(jsonData);
  if (!tableData || tableData.length === 0) {
    alert("No valid data to export");
    return;
  }
  
  // Get all headers (column names)
  const headers = [];
  tableData.forEach(row => {
    Object.keys(row).forEach(key => {
      if (!headers.includes(key)) {
        headers.push(key);
      }
    });
  });
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  tableData.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] !== undefined ? row[header] : '';
      // Escape quotes and wrap in quotes if value contains comma
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvContent += values.join(',') + '\n';
  });
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `kibana_data_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to export data to Excel (XLSX)
function exportToExcel(jsonData) {
  const tableData = transformToTableData(jsonData);
  if (!tableData || tableData.length === 0) {
    alert("No valid data to export");
    return;
  }
  
  // For Excel, we'll actually create a CSV with UTF-8 BOM for Excel compatibility
  // This is a simpler approach than using a full Excel library
  
  // Get all headers (column names)
  const headers = [];
  tableData.forEach(row => {
    Object.keys(row).forEach(key => {
      if (!headers.includes(key)) {
        headers.push(key);
      }
    });
  });
  
  // Create CSV content with UTF-8 BOM
  let csvContent = '\ufeff' + headers.join(',') + '\n';
  
  tableData.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] !== undefined ? row[header] : '';
      // Escape quotes and wrap in quotes if value contains comma
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvContent += values.join(',') + '\n';
  });
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `kibana_data_${new Date().toISOString().slice(0,10)}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
