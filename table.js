// filepath: c:\Users\naman\OneDrive\Desktop\Kibana-Table\table.js
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
  // Set up event listeners
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('rowsPerPage').addEventListener('change', handleRowsPerPageChange);
  document.getElementById('exportCsvBtn').addEventListener('click', handleExportCsv);
  document.getElementById('exportExcelBtn').addEventListener('click', handleExportExcel);
  document.getElementById('selectAllColumns').addEventListener('click', selectAllColumns);
  document.getElementById('deselectAllColumns').addEventListener('click', deselectAllColumns);
  
  // Load data
  loadData();
});

// Load data from chrome.storage
function loadData() {
  showLoading(true);
  
  chrome.storage.local.get('kibanaData', function(result) {
    if (result.kibanaData) {
      kibanaData = result.kibanaData;
      processData();
    } else {
      showEmptyState(true);
      showLoading(false);
    }
  });
}

// Process loaded data
function processData() {
  if (!kibanaData) {
    showEmptyState(true);
    showLoading(false);
    return;
  }
  
  // Use content.js transformToTableData to convert the data
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "transformData",
      data: kibanaData
    }, function(response) {
      if (response && response.tableData) {
        tableData = response.tableData;
        initializeTable();
      } else {
        // Fallback: Import content script and use its functions directly
        importContentScript()
          .then(() => {
            // This assumes transformToTableData is exposed globally
            tableData = window.transformToTableData(kibanaData);
            initializeTable();
          })
          .catch(error => {
            console.error("Error importing content script:", error);
            showError("Could not process data. Please go back and extract again.");
          });
      }
    });
  });
}

// Import content.js script to use its functions
function importContentScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'content.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Initialize table after data is loaded
function initializeTable() {
  if (!tableData || tableData.length === 0) {
    showEmptyState(true);
    showLoading(false);
    return;
  }
  
  // Get all unique columns from the data
  allColumns = getUniqueColumns(tableData);
  
  // Initially, all columns are visible
  visibleColumns = new Set(allColumns);
  
  // Initialize column toggle dropdowns
  initializeColumnToggle();
  
  // Set initial sort and filtered data
  filteredData = [...tableData];
  
  // Render the table
  renderTable();
  renderPagination();
  
  // Hide loading state
  showLoading(false);
}

// Get all unique columns from the data
function getUniqueColumns(data) {
  const columns = new Set();
  
  data.forEach(row => {
    Object.keys(row).forEach(key => columns.add(key));
  });
  
  return Array.from(columns);
}

// Initialize column toggle dropdown
function initializeColumnToggle() {
  const container = document.getElementById('columnToggle');
  container.innerHTML = '';
  
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
    container.appendChild(div);
  });
  
  // Add select/deselect all buttons
  document.getElementById('selectAllColumns').addEventListener('click', selectAllColumns);
  document.getElementById('deselectAllColumns').addEventListener('click', deselectAllColumns);
}

// Render the table with current data and settings
function renderTable() {
  const container = document.getElementById('tableContainer');
  
  // Calculate pagination
  const start = rowsPerPage === -1 ? 0 : (currentPage - 1) * rowsPerPage;
  const end = rowsPerPage === -1 ? filteredData.length : start + rowsPerPage;
  const paginatedData = filteredData.slice(start, end);
  
  // Create table
  const table = document.createElement('table');
  table.className = 'table table-hover table-bordered';
  
  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Only show visible columns
  allColumns
    .filter(column => visibleColumns.has(column))
    .forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      th.dataset.column = column;
      th.addEventListener('click', () => handleSort(column));
      
      // Add sort indicator if this column is sorted
      if (sortColumn === column) {
        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator ms-1';
        indicator.innerHTML = sortDirection === 'asc' ? '▲' : '▼';
        th.appendChild(indicator);
      }
      
      headerRow.appendChild(th);
    });
  
  thead.appendChild(headerRow);
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

// Event handler for column sorting
function handleSort(column) {
  if (sortColumn === column) {
    // Toggle direction
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }
  
  filteredData.sort((a, b) => {
    const valueA = a[column];
    const valueB = b[column];
    
    // Handle null/undefined values
    if (valueA === null || valueA === undefined) return sortDirection === 'asc' ? -1 : 1;
    if (valueB === null || valueB === undefined) return sortDirection === 'asc' ? 1 : -1;
    
    // Compare based on type
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    }
    
    // Default string comparison
    const strA = String(valueA).toLowerCase();
    const strB = String(valueB).toLowerCase();
    
    return sortDirection === 'asc' 
      ? strA.localeCompare(strB) 
      : strB.localeCompare(strA);
  });
  
  renderTable();
}

// Event handler for column visibility toggle
function handleColumnToggle(e) {
  const column = e.target.dataset.column;
  
  if (e.target.checked) {
    visibleColumns.add(column);
  } else {
    visibleColumns.delete(column);
  }
  
  renderTable();
}

// Select all columns
function selectAllColumns() {
  allColumns.forEach(column => {
    visibleColumns.add(column);
    const checkbox = document.getElementById(`column-${column}`);
    if (checkbox) checkbox.checked = true;
  });
  
  renderTable();
}

// Deselect all columns
function deselectAllColumns() {
  // Keep at least one column visible
  if (allColumns.length > 0) {
    visibleColumns.clear();
    visibleColumns.add(allColumns[0]);
    
    allColumns.forEach(column => {
      const checkbox = document.getElementById(`column-${column}`);
      if (checkbox) checkbox.checked = column === allColumns[0];
    });
    
    renderTable();
  }
}

// Export data to CSV format
function handleExportCsv() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'export',
      format: 'csv',
      data: kibanaData
    });
  });
}

// Export data to Excel format
function handleExportExcel() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'export',
      format: 'excel',
      data: kibanaData
    });
  });
}

// Show/hide loading overlay
function showLoading(show) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// Show/hide empty state
function showEmptyState(show) {
  document.getElementById('emptyState').style.display = show ? 'block' : 'none';
  document.getElementById('tableContainer').style.display = show ? 'none' : 'block';
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