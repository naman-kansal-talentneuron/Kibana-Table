# Kibana Table Exporter Troubleshooting Guide

## Common Issues and Solutions

### Extension Can't Extract Data

**Problem**: The extension shows "Extraction failed" or can't find the JSON data in Kibana.

**Solutions**:

1. **Make sure you're on Kibana Dev Tools page** - The extension is designed to work with Kibana Dev Tools console.

2. **Run a query first** - Execute a query in the Dev Tools console to get a response before extracting.

3. **Check console response** - Ensure there's a valid JSON response in the right panel.

4. **Use manual entry** - If automatic extraction fails, use the text area to paste the JSON data manually and click "Parse JSON".

### Data Not Displaying Correctly in Table

**Problem**: The table is empty or shows incomplete/incorrect data.

**Solutions**:

1. **Check data structure** - The extension works best with Elasticsearch query responses that contain either:
   - Search results (`hits.hits`)
   - Aggregations (`aggregations`)

2. **Try different queries** - Some complex nested structures might not display optimally.

3. **Toggle columns** - Use the "Columns" button to show/hide specific data fields.

4. **Check your browser console** - Open developer tools (F12) and look for any error messages.

### Table Not Rendering or Bootstrap Issues

**Problem**: The table page loads but no data appears, or dropdown menus aren't working.

**Solutions**:

1. **Use Debug Mode**: Add `#debug` to the table.html URL to enable debug mode:
   - Example: Open the table page, then add `#debug` to the URL and refresh.
   - This will show additional debug information and offer a "Create Sample Data" button.

2. **Check for CSP issues**: Some corporate environments block external scripts. The extension includes fallbacks for this case.

3. **Try the test page**: Open `test_debug.html` directly in your browser to test table rendering outside the extension context.

### Content Security Policy (CSP) Issues

**Problem**: Extension fails to load with error messages about CSP violations in chrome://extensions page.

**Solutions**:

1. **Check Chrome Extensions Page**: Go to chrome://extensions and look for specific error messages related to CSP.

2. **Review Error Messages**: Common CSP errors include:
   - "Refused to execute inline script..." - There might be inline scripts in HTML files
   - "Refused to load the script..." - External scripts might be blocked

3. **Use Debug Mode**: Table.html with #debug hash (table.html#debug) will show CSP compatibility information.

4. **Corporate Environments**: In restrictive corporate environments, the extension uses fallbacks for both Bootstrap components and external scripts.

### Bootstrap Components Not Working

**Problem**: Dropdowns or other UI elements not functioning properly.

**Solutions**:

1. The extension has a built-in fallback if Bootstrap cannot load from CDN.

2. Debug mode will indicate whether Bootstrap was loaded successfully.

3. For corporate environments with strict CSP policies, the extension uses a simplified dropdown implementation automatically.

### Extension Button Disabled

**Problem**: The "Extract Data" button is disabled or grayed out.

**Solutions**:

1. **Navigate to Kibana** - The extension only activates on Kibana pages.

2. **Refresh the page** - Sometimes the extension needs a page refresh to detect Kibana.

3. **Check permissions** - Make sure the extension has permissions for the current site.

## Using Test Mode for Debugging

For developers or advanced users troubleshooting rendering issues:

1. Open `test_debug.html` in Chrome
2. Use the "Use Sample Data" button to populate with test data
3. Click "View in Table" to open table.html with the debug flag
4. The table should render the sample data

## Support

If you continue to experience issues:

1. Try clearing your browser cache and restarting Chrome
2. Check for browser console errors by pressing F12
3. Make sure you're using a recent version of Chrome
4. If all else fails, contact support with:
   - A description of the problem
   - Steps to reproduce
   - Console error logs (if any)
   - Sample JSON data (if possible)