# A5 Programme Generator

An Express/EJS web application for generating themed A5 play programmes as PDFs.

## Features

- Create professional A5 programme layouts with multiple themes
- Upload cover images, logos, cast photos, and additional images
- Dynamic cast and crew management
- Director's notes with photo support
- Adverts and sponsor sections
- Live preview functionality
- **Improved A5 preview with perfect centering and content filling**
- **Dual PDF export options:**
  - Standard PDF generation (server-side using PDFKit)
  - **NEW: Image-based PDF export (experimental, client-side with html2canvas + jsPDF)**
- **Image-based export features:**
  - 72 DPI rendering (with 300 DPI upgrade path documented)
  - Browser-based image processing
  - Multi-page support with sequential rendering
  - Matches on-screen preview exactly for consistent output

## 🎨 AI Artwork Generation (Prototype Feature)

**This is an experimental feature for testing purposes.**

### What it does
- Generates AI artwork for play programme covers using Stable Diffusion
- Creates themed artwork based on play name, synopsis, and selected theme
- Allows you to preview and optionally use generated artwork as the cover image

### How to use
1. Fill in the play name and synopsis in the form
2. Select your desired theme
3. Click the "🎨 Generate AI Artwork" button next to the cover image upload
4. Wait 10-30 seconds for the AI to generate artwork
5. Preview the generated image and click "Use as Cover Image" if you like it

### API Information
- Uses Hugging Face Inference API with Stable Diffusion v1.5
- Free tier demo token (may have rate limits)
- Fallback handling when service is unavailable

### Alternative APIs for Testing
If the current API becomes unavailable, you can try these free alternatives:

1. **Hugging Face Spaces**: https://huggingface.co/spaces/runwayml/stable-diffusion-v1-5
2. **Mage.Space Demo**: https://www.mage.space/ (free tier)
3. **Replicate**: https://replicate.com/stability-ai/stable-diffusion (pay-per-use)

### Setup Notes
- No additional setup required for basic usage
- For production use, obtain a proper Hugging Face API token
- Replace the demo token in `server.js` line with your own token:
  ```javascript
  'Authorization': 'Bearer YOUR_HF_TOKEN_HERE'
  ```

### Removing the Feature
To disable or remove the AI artwork feature:

1. **Frontend**: Remove or comment out lines marked with "AI artwork prototype" in `views/form.ejs`
2. **Backend**: Remove or comment out the `/generate-ai-artwork` route in `server.js`
3. **Dependencies**: Remove the `https` import if not used elsewhere

All existing functionality remains completely unchanged.

## Installation

```bash
npm install
./setup-libs.sh  # Sets up libraries for image-based PDF export
npm start
```

The application will be available at http://localhost:3002

## Dependencies

- express: Web framework
- ejs: Template engine
- multer: File upload handling
- pdfkit: PDF generation

## Themes

- **Classic**: Traditional, elegant design
- **Fairy**: Magical, whimsical style
- **Forest**: Natural, earthy theme
- **Arabian**: Middle Eastern, ornate design
- **Spy**: Dark, mysterious noir style
- **Drama**: Intense, emotional design

## File Structure

```
├── server.js          # Main application server
├── views/
│   └── form.ejs      # Main form template
├── public/
│   ├── css/
│   │   └── styles.css # Application styles
│   └── theme-assets/ # Theme border images
└── uploads/          # Uploaded files storage
```