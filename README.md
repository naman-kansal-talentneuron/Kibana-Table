# Kibana Table Exporter

A Google Chrome extension that extracts and transforms Kibana JSON data into a table format for easy viewing and exporting to CSV or Excel.

## Features

- Extract JSON data from Kibana dashboards
- Preview data in a sortable, searchable table format
- Export data to CSV
- Export data to Excel-compatible format
- Filter and search within the extracted data

## Installation

Since this is a development version, you'll need to load it as an unpacked extension:

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `Kibana Table` folder
4. The extension should now be installed and visible in your extensions list

## Usage

1. Navigate to your Kibana dashboard page
2. Click on the Kibana Table Exporter extension icon in your browser toolbar
3. Click "Extract JSON Data" to extract data from the current page
4. Once data is extracted, you can:
   - Click "Preview as Table" to view the data in a table format
   - Click "Export to CSV" to download the data as a CSV file
   - Click "Export to Excel" to download the data in an Excel-compatible format

## Compatibility

This extension is designed to work with Kibana dashboards that display aggregation results with the following structure:
```json
{
  "aggregations": {
    "country_agg": {
      "buckets": [
        {
          "key": "COUNTRY_CODE",
          "doc_count": NUMBER,
          "source_name_agg": {
            "buckets": [
              {
                "key": "SOURCE_NAME",
                "doc_count": NUMBER,
                "monthly_job_count": {
                  "buckets": [
                    {
                      "key_as_string": "YYYY-MM",
                      "doc_count": NUMBER
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

## Troubleshooting

If the extension fails to extract data automatically:

1. In Kibana, copy the JSON response from the Console or Network tab
2. Click the extension icon and click "Extract JSON Data"
3. When prompted, paste the JSON data into the input box

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
