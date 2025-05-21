# Kibana Table Exporter Test Plan

This document outlines the testing procedures for the Kibana Table Exporter Chrome extension after fixing the Content Security Policy (CSP) issues.

## Test Environment

- Chrome browser (latest version)
- Extension loaded in developer mode

## Test Cases

### 1. Extension Installation and Loading

- [x] Extension can be loaded in Chrome without CSP errors
- [ ] Extension icon appears in toolbar
- [ ] Clicking the icon opens the popup

### 2. Popup Functionality

- [ ] Popup loads and displays correctly
- [ ] JSON input field accepts text
- [ ] Parse JSON button works
- [ ] JSON preview shows correctly
- [ ] View as Table button works
- [ ] Clear Data button works

### 3. Table View Functionality

- [ ] Table page loads without CSP errors
- [ ] Bootstrap styling is applied correctly
- [ ] Table displays sample data correctly
- [ ] Pagination works
- [ ] Sorting works
- [ ] Column visibility toggle works
- [ ] Search functionality works
- [ ] Export buttons work

### 4. Fallback Mechanism

- [ ] Bootstrap fallback loads when CDN is not available
- [ ] Custom dropdown implementation works when Bootstrap JS is not available

### 5. Debug Utilities

- [ ] Debug utilities load correctly
- [ ] Environment check reports accurately
- [ ] CSP compatibility tests run successfully

## Test Procedures

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked" and select the extension directory
4. Verify the extension loads without errors

### Testing Popup

1. Click the extension icon to open the popup
2. Paste sample JSON data in the input field
3. Click "Parse JSON" and verify the preview
4. Click "View as Table" to open the table view
5. Return to popup and click "Clear Data"
6. Verify data is cleared

### Testing Table View

1. Open the test page (test_debug.html)
2. Click "Use Sample Data" 
3. Click "View in Table"
4. Test pagination by changing rows per page
5. Test sorting by clicking column headers
6. Test column visibility by toggling columns
7. Test search by entering text in search field
8. Test export by clicking export buttons

### Testing Fallback Mechanisms

1. Open the table view with #debug hash in URL
2. Check console for Bootstrap loading status
3. Verify the debug report shows correct environment information

## Expected Results

- Extension loads without any CSP errors
- All functionality works as expected
- Fallback mechanisms activate when primary resources are unavailable
- No console errors related to CSP violations

## Test Results

(To be filled out during testing)
