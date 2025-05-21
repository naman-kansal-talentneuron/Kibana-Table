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
  
  try {
    // In a Chrome extension environment
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['kibanaData'], function(result) {
        console.log("Loaded data from Chrome storage:", result);
        if (result.kibanaData) {
          kibanaData = result.kibanaData;
          processData();
        } else {
          console.warn("No data found in Chrome storage");
          // Don't create sample data automatically - show empty state instead
          showEmptyState(true);
          showLoading(false);
        }
      });
    } else {
      // Fallbacks for testing in standalone environment
      if (!tryLoadFromUrlFragment() && !checkLocalStorage()) {
        console.warn("No data found in URL or localStorage");
        showEmptyState(true);
        showLoading(false);
      }
    }
  } catch (e) {
    console.error("Error loading data:", e);
    if (!tryLoadFromUrlFragment() && !checkLocalStorage()) {
      showError("Failed to load data: " + e.message);
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
    sortIndicator.style.marginLeft = '5px';
    
    // Set initial icon state based on current sort
    if (sortColumn === column) {
      sortIndicator.style.color = '#0d6efd'; // Blue color for active sort
      if (sortDirection === 'asc') {
        sortIndicator.textContent = getSortIcon('asc');
        sortIndicator.title = "Sorted ascending (A to Z, low to high)";
      } else if (sortDirection === 'desc') {
        sortIndicator.textContent = getSortIcon('desc');
        sortIndicator.title = "Sorted descending (Z to A, high to low)";
      }
    } else {
      // Default state (no sorting) - make it lighter gray
      sortIndicator.textContent = getSortIcon('default');
      sortIndicator.title = "Click to sort";
      sortIndicator.style.color = '#999';
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
  // Initialize sortColumn and sortDirection if this is the first time
  if (!sortColumn) sortColumn = '';
  if (!sortDirection) sortDirection = '';
  
  // Cycle through the three states: default -> asc -> desc -> default
  if (sortColumn !== column) {
    // New column: start with ascending sort
    sortColumn = column;
    sortDirection = 'asc';
  } else {
    // Same column: cycle through states
    if (sortDirection === 'asc') {
      sortDirection = 'desc';
    } else if (sortDirection === 'desc') {
      // Reset to default (unsorted) state
      sortColumn = '';
      sortDirection = '';
    } else {
      // Default to ascending if in an unknown state
      sortDirection = 'asc';
    }
  }
  
  // Update all sort indicators
  const headers = document.querySelectorAll('th');
  headers.forEach(th => {
    const sortIndicator = th.querySelector('.sort-indicator');
    if (sortIndicator) {
      // Clear any existing sort classes
      sortIndicator.classList.remove('text-primary');
      
      if (sortColumn && th.textContent.includes(sortColumn)) {
        // Highlight active sort column
        sortIndicator.classList.add('text-primary');
        
        // Set the appropriate icon based on sort direction
        if (sortDirection === 'asc') {
          sortIndicator.innerHTML = getSortIcon('asc');
          sortIndicator.title = "Sorted ascending (A to Z, low to high)";
        } else if (sortDirection === 'desc') {
          sortIndicator.innerHTML = getSortIcon('desc');
          sortIndicator.title = "Sorted descending (Z to A, high to low)";
        } else {
          // Fallback, though this shouldn't happen with the new logic
          sortIndicator.innerHTML = getSortIcon('default');
          sortIndicator.title = "Click to sort";
        }
      } else {
        // Reset other columns or unsorted state to the default icon
        sortIndicator.innerHTML = getSortIcon('default');
        sortIndicator.title = "Click to sort";
      }
    }
  });
  
  // Perform the actual sorting if we have a sort column
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
    console.error("Table container not found - no element with ID 'tableContainer'");
    // Try to create it as a fallback
    const mainContainer = document.querySelector('.container-fluid') || document.body;
    const newContainer = document.createElement('div');
    newContainer.id = 'tableContainer';
    mainContainer.appendChild(newContainer);
    return;
  }
  
  console.log("Rendering table with", filteredData.length, "rows and", visibleColumns.size, "visible columns");
  
  // Calculate pagination
  const start = rowsPerPage === -1 ? 0 : (currentPage - 1) * rowsPerPage;
  const end = rowsPerPage === -1 ? filteredData.length : start + rowsPerPage;
  const paginatedData = filteredData.slice(start, end);
  
  // Create table
  const table = document.createElement('table');
  table.className = 'table table-hover table-bordered';
  
  // Create header
  const thead = createTableHeader(allColumns.filter(column => visibleColumns.has(column)));
  table.appendChild(thead);
  
  // Create body
  const tbody = document.createElement('tbody');
  
  if (paginatedData.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = visibleColumns.size;
    td.className = 'text-center';
    td.textContent = 'No matching records found';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    paginatedData.forEach(row => {
      const tr = document.createElement('tr');
      
      allColumns
        .filter(column => visibleColumns.has(column))
        .forEach(column => {
          const td = document.createElement('td');
          td.textContent = formatCellValue(row[column]);
          td.title = formatCellValue(row[column]); // Show full content on hover
          tr.appendChild(td);
        });
      
      tbody.appendChild(tr);
    });
  }
  
  table.appendChild(tbody);
  
  // Clear container and add table
  container.innerHTML = '';
  container.appendChild(table);
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
  const emptyState = document.getElementById('emptyState');
  const tableContainer = document.getElementById('tableContainer');
  
  if (!emptyState) {
    // Create empty state if it doesn't exist
    const newEmptyState = document.createElement('div');
    newEmptyState.id = 'emptyState';
    newEmptyState.className = 'alert alert-warning mt-3';
    newEmptyState.innerHTML = '<p>No data available. Please paste JSON data in the extension popup and click "Parse JSON".</p>';
    
    // Insert after table container
    tableContainer.parentNode.insertBefore(newEmptyState, tableContainer.nextSibling);
  }
  
  if (emptyState && tableContainer) {
    emptyState.style.display = show ? 'block' : 'none';
    tableContainer.style.display = show ? 'none' : 'block';
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
  // Add a message at the top of the page if debug mode
  if (window.location.hash.includes('debug')) {
    const container = document.querySelector('.container-fluid');
    const debugDiv = document.createElement('div');
    debugDiv.className = 'alert alert-info mb-3';
    debugDiv.innerHTML = `
      <strong>Debug Mode Active</strong>
      <p>Troubleshooting Information:</p>
      <ul>
        <li>Bootstrap loaded: ${typeof bootstrap !== 'undefined' ? 'Yes' : 'No'}</li>
        <li>Using custom dropdown implementation: ${typeof bootstrap === 'undefined' ? 'Yes' : 'No'}</li>
      </ul>
      <button id="createSampleData" class="btn btn-sm btn-warning">Create Sample Data</button>
    `;
    container.insertBefore(debugDiv, container.firstChild);
    
    // Add event listener for the create sample data button
    setTimeout(() => {
      const sampleDataBtn = document.getElementById('createSampleData');
      if (sampleDataBtn) {
        sampleDataBtn.addEventListener('click', () => {
          createSampleData();
        });
      }
    }, 500);
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

// Update the getSortIcon function to use cleaner Unicode characters
function getSortIcon(type) {
  // Always use Unicode characters for better compatibility
  switch (type) {
    case 'asc':
      return '▲'; // Solid up triangle
    case 'desc':
      return '▼'; // Solid down triangle
    default:
      return '⇵'; // Up-down arrow (more compact than the current one)
  }
}