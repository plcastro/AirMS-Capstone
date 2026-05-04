# Word Template Export System Setup Script (PowerShell)
# This script sets up the Word document template export system for Windows

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Word Template Export Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "server") -or -not (Test-Path "mobile")) {
    Write-Host "Error: This script must be run from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Installing server dependencies..." -ForegroundColor Yellow
Push-Location server
npm install
Pop-Location
Write-Host "✓ Server dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Installing mobile dependencies..." -ForegroundColor Yellow
Push-Location mobile
npm install
Pop-Location
Write-Host "✓ Mobile dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Creating templates directory..." -ForegroundColor Yellow
if (-not (Test-Path "server/templates")) {
    New-Item -ItemType Directory -Path "server/templates" -Force > $null
}
Write-Host "✓ Templates directory created" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Setup Summary" -ForegroundColor Yellow
Write-Host ""
Write-Host "✓ Dependencies installed:" -ForegroundColor Green
Write-Host "  - Server: docxtemplater, pizzip"
Write-Host "  - Mobile: expo-file-system"
Write-Host ""
Write-Host "✓ Templates directory created at: server/templates/" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Place your Word document templates in server/templates/"
Write-Host "   - Pre-inspection template: pre-inspection.docx"
Write-Host "   - Post-inspection template: post-inspection.docx"
Write-Host ""
Write-Host "2. Edit the templates to include merge field placeholders:"
Write-Host "   {rpc}, {date}, {aircraftType}, {fob}, {engineer}, {remarks}, etc."
Write-Host ""
Write-Host "3. Start the server:"
Write-Host "   cd server; npm start"
Write-Host ""
Write-Host "4. Start the mobile app:"
Write-Host "   cd mobile; npm start"
Write-Host ""
Write-Host "5. Users can now export inspections as Word documents"
Write-Host ""
Write-Host "For detailed setup information, see: TEMPLATE_SETUP_GUIDE.md"
Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
