// Global variables
let kibanaData = null;
let tableData = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 25;
let sortColumn = '';
let sortDirection = 'asc';
let visibleColumns = new Set();
let allColumns = [];

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM Content loaded");
  
  // Initialize Bootstrap dropdowns
  initializeBootstrapComponents();
  
  // Set up event listeners
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('rowsPerPage').addEventListener('change', handleRowsPerPageChange);
  document.getElementById('exportCsvBtn').addEventListener('click', handleExportCsv);
  document.getElementById('copyCsvBtn').addEventListener('click', handleCopyCsv);
  document.getElementById('exportTsvBtn').addEventListener('click', handleExportTsv);
  document.getElementById('copyTsvBtn').addEventListener('click', handleCopyTsv);
  document.getElementById('exportExcelBtn').addEventListener('click', handleExportExcel);
  document.getElementById('selectAllColumns').addEventListener('click', selectAllColumns);
  document.getElementById('deselectAllColumns').addEventListener('click', deselectAllColumns);
  
  // Add debug features
  addDebugFeatures();
  
  // COMMENTED OUT: We don't want sample data in production
  // createSampleData();
  
  // Load real data instead
  loadData();
});

// Initialize Bootstrap components
function initializeBootstrapComponents() {
  // Check if Bootstrap JS is already loaded
  if (typeof bootstrap !== 'undefined') {
    console.log("Bootstrap already loaded");
    initDropdowns();
    return;
  }
  
  console.log("Bootstrap not available, using custom dropdown implementation");
  // We're relying on bootstrap-fallback.js to handle loading Bootstrap
  // or providing a fallback implementation
  initCustomDropdowns();
}

// Initialize Bootstrap dropdowns if Bootstrap is available
function initDropdowns() {
  if (typeof bootstrap !== 'undefined') {
    try {
      const dropdownElementList = document.querySelectorAll('[data-bs-toggle="dropdown"]');
      dropdownElementList.forEach(function(dropdownToggleEl) {
        new bootstrap.Dropdown(dropdownToggleEl);
      });
      console.log("Bootstrap dropdowns initialized");
    } catch (e) {
      console.error("Error initializing Bootstrap dropdowns:", e);
      initCustomDropdowns();
    }
  } else {
    initCustomDropdowns();
  }
}

// Fallback custom dropdown implementation
function initCustomDropdowns() {
  console.log("Using custom dropdown implementation");
  document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(function(element) {
    element.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const dropdownMenu = this.nextElementSibling;
      if (dropdownMenu.classList.contains('show')) {
        dropdownMenu.classList.remove('show');
      } else {
        // Hide any open dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
          menu.classList.remove('show');
        });
        dropdownMenu.classList.add('show');
      }
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
        menu.classList.remove('show');
      });
    }
  });
}

// Load data from chrome.storage
function loadData() {
  showLoading(true);
  console.log("Loading data...");
  
  // In a Chrome extension environment
  if (typeof chrome !== 'undefined' && chrome.storage) {
    console.log("Trying to load from Chrome storage");
    chrome.storage.local.get(['kibanaData'], function(result) {
      console.log("Chrome storage result:", result);
      if (result && result.kibanaData) {
        kibanaData = result.kibanaData;
        processData();
      } else {
        console.warn("No data found in Chrome storage");
        showEmptyState(true);
        showLoading(false);
      }
    });
  } else {
    // Fallback for non-extension environments
    if (!tryLoadFromUrlFragment() && !checkLocalStorage()) {
      console.warn("No data sources available");
      showEmptyState(true);
      showLoading(false);
    }
  }
}

// Check localStorage for data (useful for debugging in standalone HTML)
function checkLocalStorage() {
  try {
    const localData = localStorage.getItem('kibanaData');
    if (localData) {
      console.log("Found data in localStorage");
      kibanaData = JSON.parse(localData);
      return true;
    }
  } catch (e) {
    console.warn("Error accessing localStorage:", e);
  }
  return false;
}

// Attempt to load data from URL fragment if storage fails
function tryLoadFromUrlFragment() {
  try {
    const hash = window.location.hash.substring(1);
    if (hash) {
      // The hash might contain the storage key or encoded data
      if (hash === 'debug') {
        // Check localStorage first
        if (checkLocalStorage()) {
          console.log("Loaded data from localStorage in debug mode");
          processData();
          return true;
        }
        
        // If localStorage doesn't have data, create sample data
        console.log("Creating sample debug data");
        kibanaData = {
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
              }
            ]
          }
        };
        processData();
        return true;
      }
    }
  } catch (e) {
    console.error("Error parsing URL fragment:", e);
  }
  return false;
}

// Process loaded data
function processData() {
  try {
    if (!kibanaData) {
      showEmptyState(true);
      showLoading(false);
      return;
    }
    
    console.log("Processing data:", kibanaData);
    
    // Process the JSON data and convert it to table format
    tableData = transformToTableData(kibanaData);
    console.log("Transformed data:", tableData);
    
    if (tableData.length === 0) {
      console.warn("No rows in tableData after transformation");
      showEmptyState(true);
      showLoading(false);
      return;
    }
    
    // Identify all columns from the data
    identifyColumns();
    console.log("Identified columns:", allColumns);
    
    // Initialize visibility for all columns (all visible by default)
    visibleColumns = new Set(allColumns);
    
    // Create column toggle UI - Wrap in try/catch to handle potential CORS errors
    try {
      createColumnToggleUI();
    } catch (e) {
      console.warn("Error creating column toggle UI:", e);
      // Continue with rendering even if toggle UI fails
    }
    
    // Apply initial filtering and sorting
    filteredData = [...tableData];
    
    // Render the table
    console.log("Rendering table with", filteredData.length, "rows");
    renderTable();
    renderPagination();
    showLoading(false);
  } catch (error) {
    console.error("Error in processData:", error);
    
    // More user-friendly error message for security errors
    if (error.name === "SecurityError") {
      showError("Security error: This is likely due to browser security restrictions. Try using the extension in a regular Chrome tab.");
    } else if (error.name === "DOMException" && error.message.includes("cssRules")) {
      showError("Security restriction: Cannot access CSS rules. Using fallback styles.");
      // Continue with table rendering using basic styles
      try {
        renderTableWithFallbackStyles();
      } catch (e) {
        showError("Failed to render table: " + e.message);
      }
    } else {
      showError("Failed to process data: " + error.message);
    }
  }
}

// Add this fallback rendering function
function renderTableWithFallbackStyles() {
  // Basic table rendering without fancy styling
  const container = document.getElementById('tableContainer');
  
  // Clear container first
  if (container) {
    container.innerHTML = '';
    
    // Create a basic table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add headers
    const visibleColumnsArray = Array.from(visibleColumns);
    visibleColumnsArray.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      th.style.padding = '8px';
      th.style.borderBottom = '2px solid #ddd';
      th.style.textAlign = 'left';
      th.style.fontWeight = 'bold';
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add data rows
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const visibleData = filteredData.slice(start, end);
    
    visibleData.forEach(row => {
      const tr = document.createElement('tr');
      
      visibleColumnsArray.forEach(column => {
        const td = document.createElement('td');
        td.textContent = formatCellValue(row[column] || '');
        td.style.padding = '8px';
        td.style.borderBottom = '1px solid #ddd';
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Add basic pagination
    renderBasicPagination();
  }
}

function renderBasicPagination() {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;
  
  paginationContainer.innerHTML = '';
  
  if (filteredData.length <= rowsPerPage) return;
  
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  const nav = document.createElement('div');
  nav.style.marginTop = '10px';
  nav.style.textAlign = 'center';
  
  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.style.margin = '0 5px';
    prevBtn.style.padding = '5px 10px';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      renderTableWithFallbackStyles();
    });
    nav.appendChild(prevBtn);
  }
  
  // Page indicator
  const pageInfo = document.createElement('span');
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  pageInfo.style.margin = '0 10px';
  nav.appendChild(pageInfo);
  
  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.style.margin = '0 5px';
    nextBtn.style.padding = '5px 10px';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      renderTableWithFallbackStyles();
    });
    nav.appendChild(nextBtn);
  }
  
  paginationContainer.appendChild(nav);
}

// Transform Kibana JSON data into table format
function transformToTableData(kibanaData) {
  if (!kibanaData) return [];
  
  // Case 1: Handle country_agg structure
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

// Handle country_agg structure 
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

// Handle generic aggregation structures
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

// Helper function to flatten nested objects
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

// Identify all columns from the data
function identifyColumns() {
  allColumns = [];
  const columnsSet = new Set();
  
  tableData.forEach(row => {
    Object.keys(row).forEach(key => {
      columnsSet.add(key);
    });
  });
  
  allColumns = Array.from(columnsSet);
}

// Create the column toggle UI
function createColumnToggleUI() {
  const container = document.getElementById('columnToggle');
  
  // Clear previous content except the buttons at the bottom
  const buttonsDiv = container.querySelector('.d-grid');
  container.innerHTML = '';
  
  // Create a wrapper for the checkboxes
  const checkboxesDiv = document.createElement('div');
  checkboxesDiv.className = 'mb-2';
  checkboxesDiv.style.maxHeight = '250px';
  checkboxesDiv.style.overflowY = 'auto';
  
  allColumns.forEach(column => {
    const div = document.createElement('div');
    div.className = 'form-check';
    
    const input = document.createElement('input');
    input.className = 'form-check-input column-checkbox';
    input.type = 'checkbox';
    input.id = `column-${column}`;
    input.checked = visibleColumns.has(column);
    input.dataset.column = column;
    input.addEventListener('change', handleColumnToggle);
    
    const label = document.createElement('label');
    label.className = 'form-check-label text-truncate d-block';
    label.htmlFor = `column-${column}`;
    label.title = column;
    label.textContent = column;
    
    div.appendChild(input);
    div.appendChild(label);
    checkboxesDiv.appendChild(div);
  });
  
  // Add the checkboxes to the container
  container.appendChild(checkboxesDiv);
  
  // Re-add the buttons
  if (buttonsDiv) {
    container.appendChild(buttonsDiv);
  } else {
    // If buttons div doesn't exist, recreate it
    const newButtonsDiv = document.createElement('div');
    newButtonsDiv.className = 'd-grid gap-2 mt-2';
    
    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'btn btn-sm btn-outline-primary';
    selectAllBtn.id = 'selectAllColumns';
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.type = 'button';
    selectAllBtn.addEventListener('click', selectAllColumns);
    
    const deselectAllBtn = document.createElement('button');
    deselectAllBtn.className = 'btn btn-sm btn-outline-secondary';
    deselectAllBtn.id = 'deselectAllColumns';
    deselectAllBtn.textContent = 'Deselect All';
    deselectAllBtn.type = 'button';
    deselectAllBtn.addEventListener('click', deselectAllColumns);
    
    newButtonsDiv.appendChild(selectAllBtn);
    newButtonsDiv.appendChild(deselectAllBtn);
    container.appendChild(newButtonsDiv);
  }
}

// Event handler for column visibility toggle
function handleColumnToggle(e) {
  const column = e.target.dataset.column;
  
  if (e.target.checked) {
    visibleColumns.add(column);
  } else {
    // Prevent unchecking the last visible column
    if (visibleColumns.size <= 1 && visibleColumns.has(column)) {
      e.target.checked = true;
      showError("At least one column must remain visible");
      return;
    }
    visibleColumns.delete(column);
  }
  
  // Redraw the table with updated column visibility
  renderTable();
}

// Update the createTableHeader function to improve display
function createTableHeader(columns) {
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  
  columns.forEach(column => {
    const th = document.createElement('th');
    
    // Create a text node for the column name (without space)
    const textNode = document.createTextNode(column);
    th.appendChild(textNode);
      // Add sort indicator span with the appropriate icon
    const sortIndicator = document.createElement('span');
    sortIndicator.className = 'sort-indicator';
      // Set initial icon state based on current sort
    if (sortColumn === column) {
      sortIndicator.classList.add('text-primary'); // Use Bootstrap class for active sort
      if (sortDirection === 'asc') {
        sortIndicator.innerHTML = getSortIcon('asc');
        sortIndicator.title = "Sorted ascending (A to Z, low to high)";
      } else if (sortDirection === 'desc') {
        sortIndicator.innerHTML = getSortIcon('desc');
        sortIndicator.title = "Sorted descending (Z to A, high to low)";
      }
    } else {
      // Default state (no sorting)
      sortIndicator.innerHTML = getSortIcon('default');
      sortIndicator.title = "Click to sort";
      sortIndicator.style.color = '#6c757d'; // Bootstrap secondary color
    }
    
    th.appendChild(sortIndicator);
    th.addEventListener('click', () => handleSort(column));
    tr.appendChild(th);
  });
  
  thead.appendChild(tr);
  return thead;
}

// Update the sorting handler function to cycle through three states
function handleSort(column) {
  // If clicking the same column, toggle direction
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc'; // Default to ascending when sorting a new column
  }
    // Update all sort indicators
  const headers = document.querySelectorAll('th');
  headers.forEach(th => {
    // Remove sorted class from all headers
    th.classList.remove('sorted');
    
    const sortIndicator = th.querySelector('.sort-indicator');
    if (sortIndicator) {
      // Clear any existing sort classes
      sortIndicator.classList.remove('text-primary');        if (th.textContent.includes(column)) {
        // Highlight active sort column
        sortIndicator.classList.add('text-primary');
        // Add sorted class to the header
        th.classList.add('sorted');
        
        // Set the appropriate icon based on sort direction
        if (sortDirection === 'asc') {
          sortIndicator.innerHTML = getSortIcon('asc'); // Using innerHTML for Bootstrap icons
          sortIndicator.title = "Sorted ascending (A to Z, low to high)";
        } else if (sortDirection === 'desc') {
          sortIndicator.innerHTML = getSortIcon('desc'); // Using innerHTML for Bootstrap icons
          sortIndicator.title = "Sorted descending (Z to A, high to low)";
        } else {
          // Fallback, though this shouldn't happen with the new logic
          sortIndicator.innerHTML = getSortIcon('default'); // Using innerHTML for Bootstrap icons
          sortIndicator.title = "Click to sort";
        }      } else {
        // Reset other columns or unsorted state to the default icon
        sortIndicator.innerHTML = getSortIcon('default'); // Using innerHTML for Bootstrap icons
        sortIndicator.title = "Click to sort";
        sortIndicator.style.color = '#6c757d'; // Bootstrap secondary color
      }
    }
  });
  
  // Perform the actual sorting
  if (sortColumn) {
    filteredData.sort((a, b) => {
      const valA = a[sortColumn] !== undefined ? a[sortColumn] : '';
      const valB = b[sortColumn] !== undefined ? b[sortColumn] : '';
      
      // Handle numeric values
      if (!isNaN(valA) && !isNaN(valB)) {
        return sortDirection === 'asc' 
          ? Number(valA) - Number(valB) 
          : Number(valB) - Number(valA);
      }
      
      // Handle string values
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      
      if (sortDirection === 'asc') {
        return strA.localeCompare(strB);
      } else {
        return strB.localeCompare(strA);
      }
    });
  } else {
    // If no sorting, restore original order
    filteredData = [...tableData].filter(row => {
      // Apply any current search filter
      const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
      if (!searchTerm) return true;
      
      return Object.values(row).some(value => {
        const strValue = String(value).toLowerCase();
        return strValue.includes(searchTerm);
      });
    });
  }
  
  // Reset to first page
  currentPage = 1;
  
  // Redraw
  renderTable();
  renderPagination();
}

// Render the table with current data and settings
function renderTable() {
  const container = document.getElementById('tableContainer');
  if (!container) {
    console.error("Table container not found");
    return;
  }
  
  container.innerHTML = '';
  
  // Add mobile scroll hint
  const mobileHint = document.createElement('div');
  mobileHint.className = 'mobile-hint';
  mobileHint.textContent = 'Scroll horizontally to see more columns →';
  container.appendChild(mobileHint);
  
  // Create responsive wrapper
  const responsiveWrapper = document.createElement('div');
  responsiveWrapper.className = 'table-responsive-wrapper';
  
  // Create table with existing code
  const table = document.createElement('table');
  table.className = 'table table-hover';
  
  // Add table header
  const visibleColumnsArray = Array.from(visibleColumns);
  const thead = createTableHeader(visibleColumnsArray);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  // Calculate pagination
  const start = (currentPage - 1) * rowsPerPage;
  const end = Math.min(start + rowsPerPage, filteredData.length);
  const visibleData = filteredData.slice(start, end);
  
  // Add table rows
  visibleData.forEach(row => {
    const tr = document.createElement('tr');
    
    visibleColumnsArray.forEach(column => {
      const td = document.createElement('td');
      td.textContent = formatCellValue(row[column] || '');
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  
  // Add to DOM with wrapper
  responsiveWrapper.appendChild(table);
  container.appendChild(responsiveWrapper);
  
  // Update table info
  const paginatedStart = (currentPage - 1) * rowsPerPage;
  const paginatedEnd = Math.min(paginatedStart + rowsPerPage, filteredData.length);
  updateTableInfo(paginatedStart + 1, paginatedEnd, filteredData.length);
}

// Update table information display
function updateTableInfo(start, end, total) {
  const tableInfoElement = document.getElementById('tableInfoText');
  if (tableInfoElement) {
    if (total === 0) {
      tableInfoElement.textContent = 'No data to display.';
    } else if (rowsPerPage === -1 || total <= rowsPerPage) { // -1 means "Show All" or total is less than rows per page
      tableInfoElement.textContent = `Showing all ${total} entries.`;
    } else {
      tableInfoElement.textContent = `Showing ${start} to ${Math.min(end, total)} of ${total} entries.`;
    }
  } else {
    console.warn('Element with ID "tableInfoText" not found for updating table info.');
  }
}

// Format cell values for display
function formatCellValue(value) {
  if (value === undefined || value === null) {
    return '';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

// Render pagination controls
function renderPagination() {
  const paginationContainer = document.getElementById('pagination');
  paginationContainer.innerHTML = '';
  
  if (rowsPerPage === -1 || filteredData.length <= rowsPerPage) {
    return; // No pagination needed
  }
  
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  // Previous button
  const prevItem = document.createElement('li');
  prevItem.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  
  const prevLink = document.createElement('a');
  prevLink.className = 'page-link';
  prevLink.href = '#';
  prevLink.innerHTML = '&laquo;';
  prevLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      renderTable();
      renderPagination();
    }
  });
  
  prevItem.appendChild(prevLink);
  paginationContainer.appendChild(prevItem);
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // Adjust if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // First page if not visible
  if (startPage > 1) {
    const firstItem = document.createElement('li');
    firstItem.className = 'page-item';
    
    const firstLink = document.createElement('a');
    firstLink.className = 'page-link';
    firstLink.href = '#';
    firstLink.textContent = '1';
    firstLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = 1;
      renderTable();
      renderPagination();
    });
    
    firstItem.appendChild(firstLink);
    paginationContainer.appendChild(firstItem);
    
    if (startPage > 2) {
      const ellipsisItem = document.createElement('li');
      ellipsisItem.className = 'page-item disabled';
      
      const ellipsisLink = document.createElement('a');
      ellipsisLink.className = 'page-link';
      ellipsisLink.href = '#';
      ellipsisLink.innerHTML = '&hellip;';
      
      ellipsisItem.appendChild(ellipsisLink);
      paginationContainer.appendChild(ellipsisItem);
    }
  }
  
  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    const pageItem = document.createElement('li');
    pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
    
    const pageLink = document.createElement('a');
    pageLink.className = 'page-link';
    pageLink.href = '#';
    pageLink.textContent = i;
    pageLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = i;
      renderTable();
      renderPagination();
    });
    
    pageItem.appendChild(pageLink);
    paginationContainer.appendChild(pageItem);
  }
  
  // Last page if not visible
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsisItem = document.createElement('li');
      ellipsisItem.className = 'page-item disabled';
      
      const ellipsisLink = document.createElement('a');
      ellipsisLink.className = 'page-link';
      ellipsisLink.href = '#';
      ellipsisLink.innerHTML = '&hellip;';
      
      ellipsisItem.appendChild(ellipsisLink);
      paginationContainer.appendChild(ellipsisItem);
    }
    
    const lastItem = document.createElement('li');
    lastItem.className = 'page-item';
    
    const lastLink = document.createElement('a');
    lastLink.className = 'page-link';
    lastLink.href = '#';
    lastLink.textContent = totalPages;
    lastLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = totalPages;
      renderTable();
      renderPagination();
    });
    
    lastItem.appendChild(lastLink);
    paginationContainer.appendChild(lastItem);
  }
  
  // Next button
  const nextItem = document.createElement('li');
  nextItem.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  
  const nextLink = document.createElement('a');
  nextLink.className = 'page-link';
  nextLink.href = '#';
  nextLink.innerHTML = '&raquo;';
  nextLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
      renderPagination();
    }
  });
  
  nextItem.appendChild(nextLink);
  paginationContainer.appendChild(nextItem);
}

// Event handler for search input
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  if (searchTerm.trim() === '') {
    filteredData = [...tableData];
  } else {
    filteredData = tableData.filter(row => {
      return Object.values(row).some(value => {
        const strValue = String(value).toLowerCase();
        return strValue.includes(searchTerm);
      });
    });
  }
  
  currentPage = 1; // Reset to first page
  renderTable();
  renderPagination();
}

// Event handler for rows per page change
function handleRowsPerPageChange(e) {
  rowsPerPage = parseInt(e.target.value, 10);
  currentPage = 1; // Reset to first page
  renderTable();
  renderPagination();
}

// Export data to CSV format
function handleExportCsv() {
  if (!tableData || tableData.length === 0) {
    alert("No data to export");
    return;
  }
  
  // Get all headers (column names)
  const headers = allColumns;
  
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

// Export data to TSV format
function handleExportTsv() {
  if (!tableData || tableData.length === 0) {
    alert("No data to export");
    return;
  }
  
  // Get all headers (column names)
  const headers = allColumns;
  
  // Create TSV content
  let tsvContent = headers.join('\t') + '\n';
  
  tableData.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] !== undefined ? row[header] : '';
      // For TSV, we only need to escape tabs and newlines
      return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
    });
    tsvContent += values.join('\t') + '\n';
  });
  
  // Create and trigger download
  const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `kibana_data_${new Date().toISOString().slice(0,10)}.tsv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Copy CSV data to clipboard
function handleCopyCsv() {
  if (!tableData || tableData.length === 0) {
    alert("No data to copy");
    return;
  }
  
  // Get all headers (column names)
  const headers = allColumns;
  
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
  
  // Copy to clipboard
  copyToClipboard(csvContent, 'CSV');
}

// Copy TSV data to clipboard
function handleCopyTsv() {
  if (!tableData || tableData.length === 0) {
    alert("No data to copy");
    return;
  }
  
  // Get all headers (column names)
  const headers = allColumns;
  
  // Create TSV content
  let tsvContent = headers.join('\t') + '\n';
  
  tableData.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] !== undefined ? row[header] : '';
      // For TSV, we only need to escape tabs and newlines
      return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
    });
    tsvContent += values.join('\t') + '\n';
  });
  
  // Copy to clipboard
  copyToClipboard(tsvContent, 'TSV');
}

// Helper function to copy text to clipboard
function copyToClipboard(text, format) {
  // Use the modern Clipboard API if available
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showCopySuccess(format);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        showCopyFallback(text, format);
      });
  } else {
    showCopyFallback(text, format);
  }
}

// Fallback approach for copying to clipboard
function showCopyFallback(text, format) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';  // Prevent scrolling to bottom
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showCopySuccess(format);
    } else {
      console.error('Failed to copy text with execCommand');
      alert(`Unable to copy ${format} data to clipboard. Your browser may not support this feature.`);
    }
  } catch (err) {
    console.error('Error copying text: ', err);
    alert(`Error copying ${format} data: ${err}`);
  } finally {
    document.body.removeChild(textarea);
  }
}

// Show success message after copying
function showCopySuccess(format) {
  // Create or reuse a toast notification
  let toast = document.getElementById('copyToast');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copyToast';
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '5';
    
    toast.innerHTML = `
      <div class="toast show align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            <i class="bi bi-clipboard-check me-2"></i>
            <span id="copyToastMessage"></span>
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
  }
  
  // Set message
  document.getElementById('copyToastMessage').textContent = `${format} data copied to clipboard`;
  
  // Show toast
  const toastElement = toast.querySelector('.toast');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      document.body.removeChild(toast);
    }
  }, 3000);
}

// Export data to Excel format
function handleExportExcel() {
  if (!tableData || tableData.length === 0) {
    alert("No data to export");
    return;
  }
  
  // Get all headers (column names)
  const headers = allColumns;
  
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

// Select all columns
function selectAllColumns() {
  // Update the visibleColumns set
  allColumns.forEach(column => {
    visibleColumns.add(column);
  });
  
  // Update checkbox states
  allColumns.forEach(column => {
    const checkbox = document.getElementById(`column-${column}`);
    if (checkbox) checkbox.checked = true;
  });
  
  // Redraw the table
  renderTable();
}

// Deselect all columns
function deselectAllColumns() {
  // Keep at least one column visible
  if (allColumns.length > 0) {
    // Clear current selection
    visibleColumns.clear();
    
    // Keep only the first column visible
    if (allColumns.length > 0) {
      visibleColumns.add(allColumns[0]);
    }
    
    // Update checkbox states
    allColumns.forEach(column => {
      const checkbox = document.getElementById(`column-${column}`);
      if (checkbox) checkbox.checked = column === allColumns[0];
    });
    
    // Redraw the table
    renderTable();
  }
}

// Show/hide loading overlay
function showLoading(show) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// Show/hide empty state
function showEmptyState(show) {
  const container = document.getElementById('tableContainer');
  if (!container) return;
  
  let emptyState = document.getElementById('emptyState');
  if (!emptyState && show) {
    emptyState = document.createElement('div');
    emptyState.id = 'emptyState';
    emptyState.className = 'alert alert-info my-3';
    emptyState.innerHTML = `
      <h4>No Data Available</h4>
      <p>No Elasticsearch data has been loaded. Please:</p>
      <ol>
        <li>Make sure you've clicked the extension icon on a Kibana results page</li>
        <li>Click "Extract Data" in the popup</li>
        <li>Wait for the data extraction to complete</li>
      </ol>
      <p>If you're in development mode, you can <a href="#debug">enable debug mode</a> to test with sample data.</p>
    `;
    container.parentNode.insertBefore(emptyState, container);
  }
  
  if (emptyState) {
    emptyState.style.display = show ? 'block' : 'none';
  }
  
  if (container) {
    container.style.display = show ? 'none' : 'block';
  }
}

// Show error message
function showError(message) {
  const container = document.getElementById('tableContainer');
  container.innerHTML = `
    <div class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      ${message}
    </div>
  `;
  showLoading(false);
}

// Add debug and troubleshooting function
function addDebugFeatures() {
  // Only add if in debug mode
  if (window.location.hash.includes('debug')) {
    const container = document.querySelector('.container-fluid');
    const debugDiv = document.createElement('div');
    debugDiv.className = 'alert alert-warning mb-3';
    debugDiv.innerHTML = `
      <h4>Debug Mode Active</h4>
      <p>Troubleshooting Information:</p>
      <ul>
        <li>Bootstrap loaded: ${typeof bootstrap !== 'undefined' ? 'Yes' : 'No'}</li>
        <li>Chrome API available: ${typeof chrome !== 'undefined' && chrome.storage ? 'Yes' : 'No'}</li>
        <li>User Agent: ${navigator.userAgent}</li>
        <li>Screen Size: ${window.innerWidth}x${window.innerHeight}</li>
      </ul>
      <div class="d-flex gap-2">
        <button id="createSampleDataBtn" class="btn btn-sm btn-warning">Create Sample Data</button>
        <button id="clearDataBtn" class="btn btn-sm btn-danger">Clear All Data</button>
        <button id="showStorageBtn" class="btn btn-sm btn-info">Show Storage Data</button>
      </div>
    `;
    
    if (container) {
      container.insertBefore(debugDiv, container.firstChild);
      
      // Add event listeners after a brief delay to ensure DOM is ready
      setTimeout(() => {
        document.getElementById('createSampleDataBtn')?.addEventListener('click', createSampleData);
        
        document.getElementById('clearDataBtn')?.addEventListener('click', () => {
          if (confirm('Are you sure you want to clear all stored data?')) {
            if (typeof chrome !== 'undefined' && chrome.storage) {
              chrome.storage.local.clear(() => {
                alert('Storage cleared');
                window.location.reload();
              });
            } else {
              localStorage.clear();
              alert('LocalStorage cleared');
              window.location.reload();
            }
          }
        });
        
        document.getElementById('showStorageBtn')?.addEventListener('click', () => {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(null, (data) => {
              console.log('All storage data:', data);
              alert('Check console for storage data');
            });
          } else {
            console.log('All localStorage data:', localStorage);
            alert('Check console for localStorage data');
          }
        });
      }, 100);
    }
  }
}

// Create sample data for testing
function createSampleData() {
  kibanaData = {
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
  
  processData();
}

// Update the getSortIcon function to use Bootstrap icons
function getSortIcon(type) {
  // Use improved Bootstrap icons for better visual appearance
  switch (type) {
    case 'asc':
      return '<i class="bi bi-sort-up-alt"></i>'; // Bootstrap up arrow icon (improved)
    case 'desc':
      return '<i class="bi bi-sort-down-alt"></i>'; // Bootstrap down arrow icon (improved)
    default:
      return '<i class="bi bi-arrow-down-up"></i>'; // Bootstrap up-down arrow icon (improved)
  }
}