#!/bin/bash
# Template Export System Setup Script
# This script sets up the Word document template export system

set -e

echo "================================"
echo "Word Template Export Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -d "server" ] || [ ! -d "mobile" ]; then
    echo -e "${RED}Error: This script must be run from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing server dependencies...${NC}"
cd server
npm install
cd ..
echo -e "${GREEN}✓ Server dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Installing mobile dependencies...${NC}"
cd mobile
npm install
cd ..
echo -e "${GREEN}✓ Mobile dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 3: Creating templates directory...${NC}"
mkdir -p server/templates
echo -e "${GREEN}✓ Templates directory created${NC}"
echo ""

echo -e "${YELLOW}Step 4: Setup Summary${NC}"
echo ""
echo "✓ Dependencies installed:"
echo "  - Server: docxtemplater, pizzip"
echo "  - Mobile: expo-file-system"
echo ""
echo "✓ Templates directory created at: server/templates/"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Place your Word document templates in server/templates/"
echo "   - Pre-inspection template: pre-inspection.docx"
echo "   - Post-inspection template: post-inspection.docx"
echo ""
echo "2. Edit the templates to include merge field placeholders:"
echo "   {rpc}, {date}, {aircraftType}, {fob}, {engineer}, {remarks}, etc."
echo ""
echo "3. Start the server:"
echo "   cd server && npm start"
echo ""
echo "4. Start the mobile app:"
echo "   cd mobile && npm start"
echo ""
echo "5. Users can now export inspections as Word documents"
echo ""
echo "For detailed setup information, see: TEMPLATE_SETUP_GUIDE.md"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
