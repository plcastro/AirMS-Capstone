# Word Document Template Export System

This document outlines the setup and usage of the Word document template export system for pre and post-flight inspections.

## Overview

The system allows users to export pre-flight and post-flight inspections as properly formatted Word documents (.docx) instead of just PDFs. The templates are stored on the server and populated with inspection data dynamically.

## Setup Instructions

### 1. Install Required Dependencies

#### Server Dependencies
```bash
cd server
npm install pizzip docxtemplater
```

**Package Descriptions:**
- `pizzip`: A JavaScript/TypeScript library for reading/writing ZIP archives (used internally by docxtemplater)
- `docxtemplater`: A JavaScript library that generates Word documents from templates by replacing placeholder tags

### 2. Prepare Template Files

The Word template files should be placed in the `server/templates/` directory:

```
server/templates/
├── pre-inspection.docx
└── post-inspection.docx
```

**Template Files:**
- `AS 350 PRE-FLIGHT INSPECTION 2d.doc` → rename to `pre-inspection.docx`
- `AS 350 B3 POST INSPECTION 2d.doc` → rename to `post-inspection.docx`

### 3. Update Templates with Merge Fields

The Word templates need to contain merge field placeholders that match the data structure. Common placeholders:

```
{rpc}                    - Aircraft registration number
{date}                   - Inspection date
{aircraftType}           - Type of aircraft
{fob}                    - Fuel on board percentage
{engineer}               - Engineer who performed inspection
{remarks}                - Additional remarks/notes
{status}                 - Inspection status
{createdAt}              - Creation timestamp
{createdBy}              - User who created the inspection
{inspectionItems}        - Loop for inspection items
  {item}                 - Individual item name
  {status}               - Item status
  {notes}                - Item notes
  {initial}              - Initials
```

### 4. Server Routes Setup

The following routes are automatically available once the services and controllers are integrated:

```
GET /api/inspections/pre/:id/export-document
  - Export pre-inspection as Word document
  - Requires: Authentication
  - Returns: .docx file

GET /api/inspections/post/:id/export-document
  - Export post-inspection as Word document
  - Requires: Authentication
  - Returns: .docx file
```

### 5. Integrate Routes in Server

Add to `server/server.js` or your main application file:

```javascript
// Import the inspection export routes
const inspectionExportRoutes = require('./routes/inspectionExportRoutes');

// Add the routes (ensure this is after other inspection routes)
app.use('/api/inspections', inspectionExportRoutes);
```

### 6. Mobile App Configuration

The mobile app automatically detects and uses the Word export feature. Users can:

1. **View Export Options**: Click the export icon (⋯) on any inspection card
2. **Choose Format**:
   - Export as PDF (existing functionality)
   - Export as Word (new functionality)
3. **Download**: The Word document is downloaded and shared via the device's native sharing interface

## File Structure

```
server/
├── services/
│   └── documentTemplateService.js       # Template generation logic
├── controllers/
│   └── inspectionExportController.js    # API endpoints
├── routes/
│   └── inspectionExportRoutes.js        # Route definitions
├── templates/
│   ├── pre-inspection.docx
│   └── post-inspection.docx
└── ...

mobile/
├── utilities/
│   ├── documentExport.js                # Mobile export functions
│   ├── pdfExport.js                     # Existing PDF export
│   └── ...
├── screens/Main/
│   ├── PreInspection.jsx                # Updated with Word export
│   └── PostInspection.jsx               # Updated with Word export
├── components/
│   ├── PreInspection/
│   │   └── PreInspectionCards.jsx       # Updated with export menu
│   └── PostInspection/
│       └── PostInspectionCards.jsx      # Updated with export menu
└── ...
```

## Troubleshooting

### Template Not Found Error
**Problem**: "Template not found: pre-inspection.docx"
**Solution**: 
- Verify the template file exists in `server/templates/`
- Check file naming is exact (lowercase, .docx extension)
- Ensure file permissions allow reading

### Document Generation Fails
**Problem**: "Failed to generate document: ..."
**Solution**:
- Verify template has valid merge field syntax
- Ensure inspection data contains required fields
- Check server logs for specific error details

### Mobile Export Not Working
**Problem**: Export button doesn't work or throws error
**Solution**:
- Verify API endpoint is accessible from mobile device
- Check authentication token is valid
- Ensure network connectivity
- Review browser/app console for error messages

### Merge Fields Not Replaced
**Problem**: Word document shows {fieldName} instead of values
**Solution**:
- Verify field names exactly match the template placeholders
- Check that data object contains the fields
- Ensure template fields are properly formatted in Word

## API Response Details

### Success Response
- Status: 200 OK
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Body: Binary .docx file

### Error Response
- Status: 400 (Bad Request) or 500 (Server Error)
- Content-Type: `application/json`
- Body: 
```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Data Mapping

The `formatInspectionData` function in `documentTemplateService.js` handles the transformation of inspection database objects into template-friendly format:

```javascript
{
  rpc: String,
  date: String (formatted),
  aircraftType: String,
  fob: String (with % symbol),
  engineer: String,
  remarks: String,
  status: String,
  inspectionItems: Array of Objects with:
    - item: String
    - status: String
    - notes: String
    - initial: String
  createdAt: String (formatted date),
  createdBy: String
}
```

## Future Enhancements

- Add support for custom template selection
- Implement server-side PDF generation as alternative
- Add email delivery of generated documents
- Create template builder UI for customization
- Add multi-language support for templates

## Support

For issues or questions about the template system:
1. Check the Troubleshooting section above
2. Review server logs at `server/tmp/logs/`
3. Check mobile console output in development mode
4. Verify all dependencies are correctly installed
