# Kibana Table Exporter Troubleshooting Guide

## Common Issues and Solutions

### Extension Can't Extract Data

**Problem**: The extension shows "Extraction failed" or can't find the JSON data in Kibana.

**Solutions**:

1. **Make sure you're on Kibana Dev Tools page** - The extension is designed to work with Kibana Dev Tools console.

2. **Run a query first** - Execute a query in the Dev Tools console to get a response before extracting.

3. **Check console response** - Ensure there's a valid JSON response in the right panel.

4. **Use manual entry** - If automatic extraction fails, the extension will prompt you to paste the JSON data manually.

### Data Not Displaying Correctly in Table

**Problem**: The table is empty or shows incomplete/incorrect data.

**Solutions**:

1. **Check data structure** - The extension works best with Elasticsearch query responses that contain either:
   - Search results (`hits.hits`)
   - Aggregations (`aggregations`)

2. **Try different queries** - Some complex nested structures might not display optimally.

3. **Toggle columns** - Use the "Columns" button to show/hide specific data fields.

### Extension Button Disabled

**Problem**: The "Extract Data" button is disabled or grayed out.

**Solutions**:

1. **Navigate to Kibana** - The extension only activates on Kibana pages.

2. **Refresh the page** - Sometimes the extension needs a page refresh to detect# Kibana Table Exporter Troubleshooting Guide

## Common Issues and Solutions

### Extension Can't Extract Data

**Problem**: The extension shows "Extraction failed" or can't find the JSON data in Kibana.

**Solutions**:

1. **Make sure you're on Kibana Dev Tools page** - The extension is designed to work with Kibana Dev Tools console.

2. **Run a query first** - Execute a query in the Dev Tools console to get a response before extracting.

3. **Check console response** - Ensure there's a valid JSON response in the right panel.

4. **Use manual entry** - If automatic extraction fails, the extension will prompt you to paste the JSON data manually.

### Data Not Displaying Correctly in Table

**Problem**: The table is empty or shows incomplete/incorrect data.

**Solutions**:

1. **Check data structure** - The extension works best with Elasticsearch query responses that contain either:
   - Search results (`hits.hits`)
   - Aggregations (`aggregations`)

2. **Try different queries** - Some complex nested structures might not display optimally.

3. **Toggle columns** - Use the "Columns" button to show/hide specific data fields.

### Extension Button Disabled

**Problem**: The "Extract Data" button is disabled or grayed out.

**Solutions**:

1. **Navigate to Kibana** - The extension only activates on Kibana pages.

2. **Refresh the page** - Sometimes the extension needs a page refresh to detect