# Quick Start: Word Template Export

## 🚀 Setup (5 minutes)

### Step 1: Install Dependencies
```powershell
# Windows
.\setup-templates.ps1

# Or Linux/Mac
bash setup-templates.sh

# Or manually
cd server && npm install
cd ../mobile && npm install
```

### Step 2: Add Your Templates
Place Word documents in `server/templates/`:
- `pre-inspection.docx`
- `post-inspection.docx`

### Step 3: Edit Templates
Open each .docx file in Microsoft Word and add merge field placeholders:

**Simple fields:**
```
{rpc}          - Aircraft registration
{date}         - Inspection date  
{aircraftType} - Aircraft model
{fob}          - Fuel percentage
{engineer}     - Inspector name
{remarks}      - Notes
{status}       - Status
```

**For inspection items (loops):**
```
{#inspectionItems}
Item: {item}
Status: {status}
{/inspectionItems}
```

### Step 4: Start Services
```bash
# Terminal 1
cd server && npm start

# Terminal 2
cd mobile && npm start
```

### Step 5: Test
1. Open mobile app
2. View an inspection
3. Click export icon
4. Select "Export as Word"
5. Verify document looks good

## 📋 Merge Fields Reference

| Field | Example | Usage |
|-------|---------|-------|
| `{rpc}` | N123AB | Aircraft call sign |
| `{date}` | 2026-05-04 | Inspection date |
| `{aircraftType}` | AS 350 | Aircraft model |
| `{fob}` | 85% | Fuel on board |
| `{engineer}` | John Smith | Inspector |
| `{status}` | Completed | Status |
| `{remarks}` | All normal | Notes |

## 🔧 What Was Installed

### Backend
- **docxtemplater** - Fills templates with data
- **pizzip** - Handles Word file format

### Mobile  
- **expo-file-system** - Manages file download/sharing

## 📂 File Structure

```
server/templates/           ← Place .docx files here
  ├── pre-inspection.docx
  └── post-inspection.docx

server/services/
  └── documentTemplateService.js   ← Template logic

server/routes/
  └── inspectionExportRoutes.js    ← API endpoints

mobile/utilities/
  └── documentExport.js            ← Mobile export
```

## 🎯 User Experience

Users can now:
1. Open any inspection (pre or post)
2. Click the **export icon** ⋯
3. Choose **"Export as Word"**
4. Download and share the .docx file

## 📱 API Endpoints (Backend)

```
GET /api/inspections/pre/:id/export-document
GET /api/inspections/post/:id/export-document
```

Returns: Word document (.docx)

## ⚠️ Troubleshooting

### "Template not found"
→ Check file is in `server/templates/` with exact name

### Merge fields not replaced
→ Verify field names match exactly (case-sensitive)

### Export fails
→ Check server is running and internet connected

### Template format issues
→ Ensure template is .docx (not .doc)

## 📚 Documentation

- **TEMPLATE_SETUP_GUIDE.md** - Detailed setup
- **TEMPLATE_IMPLEMENTATION.md** - Technical overview
- **MERGE_FIELDS_GUIDE.md** - Field reference

## ✅ Verification Checklist

- [ ] Dependencies installed (`npm install` completed)
- [ ] `server/templates/` directory exists
- [ ] Templates placed: `pre-inspection.docx`, `post-inspection.docx`  
- [ ] Merge fields added to templates
- [ ] Server running: `npm start` in server folder
- [ ] Mobile app running: `npm start` in mobile folder
- [ ] Export menu appears when clicking export icon
- [ ] Test export shows correct data
- [ ] Downloaded file opens in Word

## 🎓 Example Template Text

```
PRE-FLIGHT INSPECTION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aircraft: {rpc} ({aircraftType})
Date: {date}
Fuel: {fob}
Inspector: {engineer}

CHECKLIST
{#inspectionItems}
☐ {item} - {status} ({notes})
{/inspectionItems}

Notes: {remarks}
Status: {status}
```

## 🔄 Update Flow

```
Mobile App
    ↓
[Export Icon Clicked]
    ↓
[User Selects "Export as Word"]
    ↓
Server API Request
    ↓
Load Template + Fill Fields
    ↓
Send .docx File
    ↓
Mobile App Downloads
    ↓
User Shares/Saves
```

---

**For more help:** See TEMPLATE_SETUP_GUIDE.md or MERGE_FIELDS_GUIDE.md
