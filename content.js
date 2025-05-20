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
    // Try specific Kibana UI selectors first - IMPROVED SELECTORS
    try {
      // Target specific Kibana 7.x and 8.x console output elements
      const kibanaSelectors = [
        '.conApp__outputContent',                     // Kibana 7.x
        '.euiCodeBlock__code',                        // Common code blocks
        '.kbnMarkdown__body pre',                     // Markdown output
        '.monaco-editor-background + div',            // Monaco editor output
        '.euiCodeEditorWrapper + div pre',            // Another possible location
        '[data-test-subj="codeEditorOutput"]',        // Output with test subject
        '.codeEditorWrapper + .euiPanel pre'          // Another output location
      ];
      
      for (const selector of kibanaSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          try {
            const text = element.textContent;
            if (text && text.trim().startsWith('{') && text.trim().endsWith('}')) {
              try {
                const jsonData = JSON.parse(text);
                console.log(`Found JSON in selector: ${selector}`, jsonData);
                return resolve(jsonData);
              } catch (parseError) {
                console.log(`Found text in ${selector} but failed to parse as JSON`);
              }
            }
          } catch (e) {
            console.log(`Error processing ${selector}:`, e);
          }
        }
      }
      
      // Your existing approaches for extraction...
    } catch (e) {
      console.log('Error finding console output:', e);
    }
    
    // Try to find pre or code elements containing JSON
    const preElements = document.querySelectorAll('pre');
    for (const pre of preElements) {
      try {
        const possibleJson = pre.textContent;
        if (possibleJson && possibleJson.trim().startsWith('{')) {
          const jsonData = JSON.parse(possibleJson);
          console.log('Found JSON in pre element', jsonData);
          return resolve(jsonData);
        }
      } catch (e) {
        // Not valid JSON, continue checking
      }
    }

    // Try to find in Monaco editor (Kibana console)
    const editorElements = document.querySelectorAll('.monaco-editor');
    if (editorElements.length > 0) {
      // Find the right editor panel (output panel typically comes after input panel)
      const panels = document.querySelectorAll('.monaco-editor-container');
      let rightPanel;
      
      if (panels.length >= 2) {
        rightPanel = panels[1]; // Usually the second panel is the output
      } else if (panels.length === 1) {
        rightPanel = panels[0];
      }
      
      if (rightPanel) {
        // Try to find the text content in multiple ways
        
        // Method 1: Use view-line elements
        const lines = Array.from(rightPanel.querySelectorAll('.view-line'))
          .map(line => line.textContent.trim())
          .join('');
        
        try {
          const jsonString = extractJsonString(lines);
          if (jsonString) {
            const jsonData = JSON.parse(jsonString);
            console.log('Found JSON in Monaco editor view-lines', jsonData);
            return resolve(jsonData);
          }
        } catch (e) {
          console.log("Error parsing JSON from view-lines:", e);
        }
        
        // Method 2: Use monaco-editor content div
        const contentDiv = rightPanel.querySelector('.monaco-editor-background + div');
        if (contentDiv) {
          try {
            const contentText = contentDiv.textContent;
            if (contentText && contentText.includes('{') && contentText.includes('}')) {
              const jsonString = extractJsonString(contentText);
              if (jsonString) {
                const jsonData = JSON.parse(jsonString);
                console.log('Found JSON in Monaco editor content div', jsonData);
                return resolve(jsonData);
              }
            }
          } catch (e) {
            console.log("Error parsing JSON from content div:", e);
          }
        }
        
        // Method 3: Look for .lines-content element which might contain the editor text
        const linesContent = rightPanel.querySelector('.lines-content');
        if (linesContent) {
          try {
            const linesText = linesContent.textContent;
            if (linesText && linesText.includes('{') && linesText.includes('}')) {
              const jsonString = extractJsonString(linesText);
              if (jsonString) {
                const jsonData = JSON.parse(jsonString);
                console.log('Found JSON in Monaco editor lines-content', jsonData);
                return resolve(jsonData);
              }
            }
          } catch (e) {
            console.log("Error parsing JSON from lines-content:", e);
          }
        }
      }
    }
    
    // Try to find text that looks like JSON anywhere in the page
    try {
      const bodyText = document.body.textContent;
      const jsonMatches = bodyText.match(/{[\s\S]*?}(?=\s|$)/g) || [];
      
      for (const match of jsonMatches) {
        try {
          if (match.length > 50) { // Avoid small JSON objects like settings
            const jsonData = JSON.parse(match);
            if (jsonData && (jsonData.hits || jsonData.aggregations)) {
              console.log('Found JSON in page body', jsonData);
              return resolve(jsonData);
            }
          }
        } catch (e) {
          // Not valid JSON, continue
        }
      }
    } catch (e) {
      console.log('Error searching page for JSON:', e);
    }
    
    // Fallback: Check for global variables that might contain the data
    if (window.hasOwnProperty('elasticsearchData') || 
        window.hasOwnProperty('kibanaData')) {
      const globalData = window.elasticsearchData || window.kibanaData;
      if (globalData) {
        console.log('Found JSON in global variable', globalData);
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

// Improved function to transform Kibana data into a table format
function transformToTableData(kibanaData) {
  if (!kibanaData) return [];
  
  // Case 1: Handle country_agg structure (compatibility with existing code)
  if (kibanaData.aggregations && kibanaData.aggregations.country_agg) {
    return transformCountryAggData(kibanaData);
  }
  
  // Case 2: Handle other aggregation structures
  if (kibanaData.aggregations) {
    return transformGenericAggregations(kibanaData.aggregations);
  }
  
  // Case 3: Handle hits from search results
  if (kibanaData.hits && kibanaData.hits.hits) {
    return transformSearchHits(kibanaData.hits.hits);
  }
  
  // Case 4: Handle any other JSON structure as a fallback
  return [flattenObject(kibanaData)];
}

// Handle the country_agg structure (original implementation)
function transformCountryAggData(kibanaData) {
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
    } else {
      // Handle case where country has no source_name_agg
      result.push({
        countryCode: countryCode,
        totalDocCount: totalDocCount
      });
    }
  }
  
  return result;
}

// Handle any generic aggregation structure
function transformGenericAggregations(aggregations) {
  const result = [];
  
  // Process each top-level aggregation
  Object.entries(aggregations).forEach(([aggName, aggData]) => {
    if (aggData.buckets) {
      // Handle bucket aggregations
      aggData.buckets.forEach(bucket => {
        const row = {
          aggregation: aggName,
          key: bucket.key,
          doc_count: bucket.doc_count
        };
        
        // Add any additional fields from the bucket
        Object.entries(bucket).forEach(([key, value]) => {
          if (key !== 'key' && key !== 'doc_count') {
            if (typeof value === 'object' && value !== null) {
              // Handle sub-aggregations
              if (value.buckets) {
                // For sub-buckets, add top values
                value.buckets.slice(0, 5).forEach((subBucket, index) => {
                  row[`${key}_${index}_key`] = subBucket.key;
                  row[`${key}_${index}_count`] = subBucket.doc_count;
                });
              } else if (value.value !== undefined) {
                // For metrics
                row[key] = value.value;
              }
            } else {
              row[key] = value;
            }
          }
        });
        
        result.push(row);
      });
    } else if (aggData.value !== undefined) {
      // Handle metric aggregations
      result.push({
        aggregation: aggName,
        value: aggData.value
      });
    }
  });
  
  return result;
}

// Handle search hits
function transformSearchHits(hits) {
  return hits.map(hit => {
    const row = {
      _id: hit._id,
      _index: hit._index,
      _score: hit._score
    };
    
    // Flatten _source if available
    if (hit._source) {
      const flattenedSource = flattenObject(hit._source);
      Object.assign(row, flattenedSource);
    }
    
    // Add any other fields
    Object.entries(hit).forEach(([key, value]) => {
      if (key !== '_id' && key !== '_index' && key !== '_score' && key !== '_source') {
        if (typeof value === 'object' && value !== null) {
          const flattened = flattenObject(value, key);
          Object.assign(row, flattened);
        } else {
          row[key] = value;
        }
      }
    });
    
    return row;
  });
}

// Helper function to flatten nested objects (improved version)
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  function _flatten(obj, prefix) {
    if (!obj) return;
    
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        _flatten(value, newKey);
      } else if (Array.isArray(value)) {
        // Handle arrays more intelligently
        if (value.length === 0) {
          // Empty array
          flattened[newKey] = '[]';
        } else if (typeof value[0] === 'object' && value[0] !== null) {
          // Array of objects - flatten first few and indicate total count
          const maxItems = 3; // Only process first few items to avoid explosion
          for (let i = 0; i < Math.min(value.length, maxItems); i++) {
            _flatten(value[i], `${newKey}[${i}]`);
          }
          if (value.length > maxItems) {
            flattened[`${newKey}.length`] = `${value.length} items total`;
          }
        } else {
          // Array of primitives - join with commas
          flattened[newKey] = value.join(', ');
        }
      } else {
        // Handle primitive values
        flattened[newKey] = value;
      }
    }
  }
  
  _flatten(obj, prefix);
  return flattened;
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
  
  // Get all headers (column names)
  const headers = [];
  tableData.forEach(row => {
    Object.keys(row).forEach(key => {
      if (!headers.includes(key)) {
        headers.push(key);
      }
    });
  });
  
  // Create CSV content with UTF-8 BOM for Excel
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
