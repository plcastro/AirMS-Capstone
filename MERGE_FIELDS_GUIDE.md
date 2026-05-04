# Word Template Merge Field Guide

This document explains how to add merge fields to your Word templates so that inspection data is automatically populated.

## What Are Merge Fields?

Merge fields are placeholders in your Word document surrounded by curly braces `{}`. When a document is generated from a template, these fields are replaced with actual inspection data.

**Example:**
```
Template: "This inspection was performed on {date} for aircraft {rpc}"
Result:  "This inspection was performed on May 4, 2026 for aircraft N123AB"
```

## Available Merge Fields

### Basic Information Fields
| Field Name | Example Value | Usage |
|-----------|---------------|-------|
| `{rpc}` | N123AB | Aircraft registration/call sign |
| `{date}` | 2026-05-04 | Inspection date |
| `{aircraftType}` | AS 350 B3 | Aircraft model/type |
| `{fob}` | 85% | Fuel on board |
| `{engineer}` | John Smith | Inspector name |
| `{status}` | Completed | Inspection status |
| `{remarks}` | All systems normal | Additional notes |
| `{createdAt}` | 2026-05-04 | Creation timestamp |
| `{createdBy}` | Alice Johnson | User who created record |

### Inspection Items Loop
For multiple inspection items, use this structure:

```
{#inspectionItems}
Item Number: [Auto-numbered]
Item: {item}
Status: {status}
Notes: {notes}
Initials: {initial}
{/inspectionItems}
```

**This will repeat for each inspection item in the data.**

## Example Template Structure

### Pre-Flight Inspection Document

```
═══════════════════════════════════════════════════════════
AS 350 B3e PRE-FLIGHT INSPECTION REPORT
═══════════════════════════════════════════════════════════

AIRCRAFT INFORMATION
─────────────────────────────────────────────────────────
Registration (RP-C):    {rpc}
Aircraft Type:         {aircraftType}
Fuel on Board:         {fob}
Inspection Date:       {date}

INSPECTOR INFORMATION
─────────────────────────────────────────────────────────
Inspector Name:        {engineer}
Created By:            {createdBy}
Created At:            {createdAt}

INSPECTION DETAILS
─────────────────────────────────────────────────────────

Station 1 - Cockpit and Front
────────────────────────────────
{#inspectionItems}
• Item: {item}
  Status: {status}
  Notes: {notes}
  _____ (Signature/Initial: {initial})

{/inspectionItems}

REMARKS & NOTES
─────────────────────────────────────────────────────────
{remarks}

STATUS: {status}

═══════════════════════════════════════════════════════════
```

## How to Add Merge Fields in Microsoft Word

### Method 1: Using Insert > Field (Recommended)

1. **Open your template in Word**
2. **Click where you want to insert a field**
3. Go to **Insert** tab → **Field** button (in Field group)
4. Type the field name, e.g., `rpc`
5. Click **OK**

The field will appear with a gray background.

### Method 2: Using Quick Field Insertion

1. Position cursor where you want the field
2. Type the field name directly: `{rpc}`
3. Fields will be processed as is

### Method 3: Manual Text (if above doesn't work)

Simply type the merge field text directly:
- For single fields: `{fieldName}`
- For loops: `{#loopName}...{/loopName}`

## Pre-Flight Inspection Example

```
PRE-FLIGHT INSPECTION FORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: {date}
RP-C: {rpc}
Aircraft Type: {aircraftType}
FOB: {fob}
Inspector: {engineer}

STATION 1 - NOSE AND ENGINE COMPARTMENT

{#inspectionItems}
[  ] {item}
     Status: {status}
     Notes: {notes}
     Initial: _____

{/inspectionItems}

Additional Remarks:
{remarks}

Inspection Status: {status}
```

## Post-Flight Inspection Example

```
POST-FLIGHT INSPECTION FORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FLIGHT INFORMATION
Aircraft: {rpc} ({aircraftType})
Flight Date: {date}
Fuel Remaining: {fob}

POST-FLIGHT CHECKS
Performed By: {engineer}
Released By: {createdBy}

INSPECTION CHECKLIST

{#inspectionItems}
☐ {item}
  Condition: {status}
  Comments: {notes}
  Inspector: {initial}
  _____ _____ _____

{/inspectionItems}

MAINTENANCE NOTES
{remarks}

Current Status: {status}

Form Completed: {createdAt}
```

## Important Notes

### Field Naming
- Field names are **case-sensitive**
- Use exactly: `{rpc}` not `{RPC}` or `{Rpc}`
- No spaces inside: `{rpc}` not `{ rpc }`

### Loop Structure
- Start loop: `{#inspectionItems}`
- End loop: `{/inspectionItems}`
- All fields inside loop work with current item
- Loops repeat for each item in the data array

### Data Types
- Text fields are converted to strings automatically
- Boolean values become "Yes" or "No"
- Dates are formatted as readable strings
- Missing/null values become "N/A"

### Formatting Preserved
- Font, colors, and styles in your template are preserved
- Merge fields take on the formatting of surrounding text
- Tables and layouts work normally with merge fields

## Validation Checklist

Before using your template:

- [ ] File saved as .docx (not .doc)
- [ ] File placed in `server/templates/`
- [ ] Filename matches: `pre-inspection.docx` or `post-inspection.docx`
- [ ] All merge fields have matching data in code
- [ ] Loop fields properly surrounded with `{#...}{/...}`
- [ ] No extra spaces in field names
- [ ] Template layout and formatting looks good
- [ ] Tested with sample data

## Testing Your Template

Once template is set up:

1. Place .docx file in `server/templates/`
2. Start the server: `cd server && npm start`
3. Trigger an inspection export from mobile app
4. Verify all fields populated correctly
5. Check formatting is preserved
6. Review generated document

## Common Issues

### Fields Show as Code
- This is normal in Word
- Fields display correctly when document opens
- Try pressing Ctrl+A then F9 to update all fields

### Fields Not Replaced
- Verify field names exactly match (case-sensitive)
- Ensure field uses curly braces: `{fieldName}`
- Check inspection data contains the field
- Restart the server after template changes

### Merge Fields Showing in Export
- Verify your .docx file is properly saved
- Check file is not corrupted
- Try opening in Word, saving again, and uploading
- Clear server cache and try again

### Layout/Formatting Lost
- Ensure template is .docx format
- Complex headers/footers might need adjustment
- Test with simple template first
- Verify no corrupted elements in template

## Support

For more detailed information:
- See TEMPLATE_SETUP_GUIDE.md
- Review documentTemplateService.js for available fields
- Check TEMPLATE_IMPLEMENTATION.md for overview

## Reference: Data Object Structure

```javascript
{
  rpc: "N123AB",                    // Aircraft registration
  date: "2026-05-04",              // Inspection date (formatted)
  aircraftType: "AS 350 B3",       // Aircraft model
  fob: "85%",                      // Fuel percentage
  engineer: "John Smith",          // Inspector name
  remarks: "All systems normal",   // Additional notes
  status: "Completed",             // Inspection status
  createdAt: "2026-05-04",        // Creation date (formatted)
  createdBy: "Alice Johnson",      // User who created
  inspectionItems: [               // Loop through items
    {
      item: "Transparent panels",
      status: "OK",
      notes: "Clean and undamaged",
      initial: "JS"
    },
    // ... more items ...
  ]
}
```

---

**Created:** May 4, 2026  
**Version:** 1.0
