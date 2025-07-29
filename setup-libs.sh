#!/bin/bash

# Setup script for A5 Programme Generator
# Installs required JavaScript libraries for image-based PDF export

echo "Setting up JavaScript libraries for image-based PDF export..."

# Create libs directory if it doesn't exist
mkdir -p public/js/libs

# Copy libraries from node_modules
if [ -f "node_modules/html2canvas/dist/html2canvas.min.js" ]; then
    cp node_modules/html2canvas/dist/html2canvas.min.js public/js/libs/
    echo "✓ html2canvas.min.js copied"
else
    echo "✗ html2canvas not found in node_modules. Run 'npm install' first."
    exit 1
fi

if [ -f "node_modules/jspdf/dist/jspdf.umd.min.js" ]; then
    cp node_modules/jspdf/dist/jspdf.umd.min.js public/js/libs/
    echo "✓ jspdf.umd.min.js copied"
else
    echo "✗ jspdf not found in node_modules. Run 'npm install' first."
    exit 1
fi

echo "✓ All libraries setup complete!"
echo ""
echo "The image-based PDF export feature is now ready to use."
echo "Note: This feature renders at 72 DPI. For 300 DPI support, see TODO comments in the code."