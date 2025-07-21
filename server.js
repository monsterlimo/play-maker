const express = require('express');
const path = require('path');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
// AI artwork prototype - imports for API calls
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3002;

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Define all the possible file upload fields
const uploadFields = [
  { name: 'photos', maxCount: 4 },
  { name: 'logo', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'directorPhoto', maxCount: 1 },
  { name: 'castPhoto', maxCount: 15 },
  { name: 'advertImage', maxCount: 10 }
];

// Theme config
const themes = {
  classic: {
    color: '#333',
    heading: '#222',
    font: 'Times-Roman',
    border: path.join(__dirname, 'public/theme-assets/classic-border.png'),
    accent: '#007bff'
  },
  fairy: {
    color: '#e070e0',
    heading: '#b050b0',
    font: 'Courier',
    border: path.join(__dirname, 'public/theme-assets/fairy-border.png'),
    accent: '#f7cafc'
  },
  forest: {
    color: '#228B22',
    heading: '#145914',
    font: 'Times-Roman',
    border: path.join(__dirname, 'public/theme-assets/forest-border.png'),
    accent: '#d4ecd1'
  },
  arabian: {
    color: '#FFD700',
    heading: '#CFA100',
    font: 'Helvetica-Bold',
    border: path.join(__dirname, 'public/theme-assets/arabian-border.png'),
    accent: '#fffbe6'
  },
  spy: {
    color: '#444',
    heading: '#222',
    font: 'Helvetica',
    border: path.join(__dirname, 'public/theme-assets/spy-border.png'),
    accent: '#e4e4e4'
  },
  drama: {
    color: '#B22222',
    heading: '#7A1818',
    font: 'Times-Bold',
    border: path.join(__dirname, 'public/theme-assets/drama-border.png'),
    accent: '#ffe5e5'
  }
};

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GET: Programme form
app.get('/', (req, res) => {
  res.render('form');
});

// AI artwork prototype - Generate AI artwork route
app.post('/generate-ai-artwork', express.json(), (req, res) => {
  const { playName, synopsis, theme } = req.body;
  
  // Create a descriptive prompt based on the play information
  let prompt = `A theatrical programme cover for "${playName || 'a play'}". `;
  
  if (synopsis) {
    prompt += `The play is about: ${synopsis.substring(0, 200)}. `;
  }
  
  // Add theme-specific styling
  const themePrompts = {
    classic: 'Classic and elegant theatrical design, vintage style, professional',
    fairy: 'Magical fairy tale design, whimsical, enchanted forest, sparkles and magic',
    forest: 'Natural forest setting, green and earthy tones, trees and nature',
    arabian: 'Arabian nights theme, golden colors, middle eastern design, ornate patterns',
    spy: 'Spy thriller design, dark and mysterious, noir style, dramatic shadows',
    drama: 'Dramatic and intense design, deep red colors, emotional, powerful'
  };
  
  prompt += themePrompts[theme] || themePrompts.classic;
  prompt += '. Digital art, high quality, theatrical poster style.';
  
  // Call Hugging Face Inference API for Stable Diffusion
  const data = JSON.stringify({
    inputs: prompt,
    parameters: {
      guidance_scale: 7.5,
      num_inference_steps: 20,
      width: 512,
      height: 768
    }
  });
  
  const options = {
    hostname: 'api-inference.huggingface.co',
    port: 443,
    path: '/models/runwayml/stable-diffusion-v1-5',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer hf_demo', // Using demo token for free tier
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  
  const apiReq = https.request(options, (apiRes) => {
    if (apiRes.statusCode === 200) {
      const chunks = [];
      apiRes.on('data', (chunk) => chunks.push(chunk));
      apiRes.on('end', () => {
        const imageBuffer = Buffer.concat(chunks);
        // Save the generated image temporarily
        const filename = `ai-artwork-${Date.now()}.png`;
        const filepath = path.join(__dirname, 'uploads', filename);
        
        fs.writeFileSync(filepath, imageBuffer);
        
        res.json({
          success: true,
          imageUrl: `/uploads/${filename}`,
          prompt: prompt
        });
      });
    } else {
      // Fallback: return a placeholder response for demo purposes
      res.json({
        success: false,
        error: 'AI service temporarily unavailable. This is a prototype feature.',
        fallback: true
      });
    }
  });
  
  apiReq.on('error', (error) => {
    console.error('AI artwork generation error:', error);
    res.json({
      success: false,
      error: 'AI service temporarily unavailable. This is a prototype feature.',
      fallback: true
    });
  });
  
  apiReq.write(data);
  apiReq.end();
});

// POST: Generate PDF
app.post('/generate', upload.fields(uploadFields), (req, res) => {
  const {
    theme = 'classic',
    playName,
    date,
    venue,
    synopsis,
    director,
    contactInfo,
    directorNote,
    sponsorInfo,
    overlayInfo
  } = req.body;

  // Parse cast/crew arrays
  const castNames = req.body['castName[]'] || req.body.castName || [];
  const castRoles = req.body['castRole[]'] || req.body.castRole || [];
  const crewNames = req.body['crewName[]'] || req.body.crewName || [];
  const crewRoles = req.body['crewRole[]'] || req.body.crewRole || [];
  
  // Parse advert arrays
  const advertTitles = req.body['advertTitle[]'] || req.body.advertTitle || [];

  // Normalize arrays
  const cast = Array.isArray(castNames)
    ? castNames.map((name, i) => ({ 
        name, 
        role: castRoles[i] || '',
        photo: req.files && req.files.castPhoto && req.files.castPhoto[i] ? req.files.castPhoto[i].path : null
      }))
    : [{ 
        name: castNames, 
        role: castRoles,
        photo: req.files && req.files.castPhoto && req.files.castPhoto[0] ? req.files.castPhoto[0].path : null
      }];

  const crew = Array.isArray(crewNames)
    ? crewNames.map((name, i) => ({ name, role: crewRoles[i] || '' }))
    : [{ name: crewNames, role: crewRoles }];

  const adverts = Array.isArray(advertTitles)
    ? advertTitles.map((title, i) => ({
        title,
        image: req.files && req.files.advertImage && req.files.advertImage[i] ? req.files.advertImage[i].path : null
      }))
    : advertTitles ? [{
        title: advertTitles,
        image: req.files && req.files.advertImage && req.files.advertImage[0] ? req.files.advertImage[0].path : null
      }] : [];

  // Get uploaded files
  const logoFile = req.files && req.files.logo ? req.files.logo[0] : null;
  const coverFile = req.files && req.files.coverImage ? req.files.coverImage[0] : null;
  const directorPhotoFile = req.files && req.files.directorPhoto ? req.files.directorPhoto[0] : null;
  const additionalPhotos = req.files && req.files.photos ? req.files.photos : [];

  // Theme config
  const t = themes[theme] || themes.classic;

  // Start PDF
  const doc = new PDFDocument({ size: 'A5', margin: 40 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {
    const result = Buffer.concat(chunks);
    res.setHeader('Content-disposition', `attachment; filename=${playName || 'programme'}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    res.send(result);
  });

  // Helper function to add themed border to page
  function addThemedBorder() {
    if (t.border && fs.existsSync(t.border)) {
      doc.image(t.border, doc.page.margins.left, doc.page.margins.top - 20, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        height: 24
      });
      doc.moveDown(1.2);
    }
  }

  // Helper function to add section separator
  function addSeparator() {
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(t.accent).lineWidth(1.5).stroke();
    doc.moveDown();
  }

  // Page 1: Front Cover
  addThemedBorder();

  // Logo (top-left corner if available)
  if (logoFile) {
    if (fs.existsSync(logoFile.path)) {
      try {
        doc.image(logoFile.path, doc.page.margins.left, doc.y, {
          fit: [80, 40],
          align: 'left'
        });
      } catch (err) {
        console.log('Error loading logo:', err);
        // Draw placeholder
        doc.rect(doc.page.margins.left, doc.y, 80, 40).fillColor('#f0f0f0').fill();
        doc.fontSize(8).fillColor('#666')
          .text('Logo', doc.page.margins.left, doc.y + 15, { width: 80, align: 'center' });
      }
    } else {
      // Draw placeholder for missing logo
      doc.rect(doc.page.margins.left, doc.y, 80, 40).fillColor('#f0f0f0').fill();
      doc.fontSize(8).fillColor('#666')
        .text('Logo', doc.page.margins.left, doc.y + 15, { width: 80, align: 'center' });
    }
  }

  // Cover image (if available and large)
  if (coverFile) {
    if (fs.existsSync(coverFile.path)) {
      try {
        doc.addPage({ size: 'A5', margin: 0 }); // No margin for full bleed
        doc.image(coverFile.path, 0, 0, {
          width: doc.page.width,
          height: doc.page.height
        });
        if (overlayInfo) {
          // Add overlay info at bottom with padding
          doc.fontSize(16).fillColor('white').font(t.font)
            .text(playName || 'Play Name', 40, doc.page.height - 100, { 
              align: 'center',
              width: doc.page.width - 80
            });
          doc.fontSize(12).text(`${date || ''} | ${venue || ''}`, { align: 'center' });
        }
      } catch (err) {
        console.log('Error loading cover image:', err);
        // Create a placeholder cover page
        doc.addPage({ size: 'A5', margin: 40 });
        addThemedBorder();
        doc.rect(doc.page.margins.left, doc.y, doc.page.width - 80, 200).fillColor('#f0f0f0').fill();
        doc.fontSize(14).fillColor('#666')
          .text('Cover Image\nNot Available', doc.page.margins.left, doc.y + 80, { 
            width: doc.page.width - 80, 
            align: 'center' 
          });
      }
    } else {
      // Create a placeholder cover page for missing file
      doc.addPage({ size: 'A5', margin: 40 });
      addThemedBorder();
      doc.rect(doc.page.margins.left, doc.y, doc.page.width - 80, 200).fillColor('#f0f0f0').fill();
      doc.fontSize(14).fillColor('#666')
        .text('Cover Image\nNot Available', doc.page.margins.left, doc.y + 80, { 
          width: doc.page.width - 80, 
          align: 'center' 
        });
    }
  }

  // Title page (if no cover image or overlay info is disabled)
  if (!coverFile || !overlayInfo) {
    if (coverFile) {
      doc.addPage({ size: 'A5', margin: 40 });
      addThemedBorder();
    }
    
    doc.fontSize(24).fillColor(t.heading).font(t.font).text(playName || 'Play Name', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor(t.color).text(`${date || ''}`, { align: 'center' });
    doc.text(`${venue || ''}`, { align: 'center' });
    doc.text(`Director: ${director || ''}`, { align: 'center' });
    doc.moveDown();

    if (contactInfo) {
      addSeparator();
      doc.fontSize(12).fillColor(t.heading).text('Contact Information:', { align: 'center' });
      doc.fontSize(10).fillColor(t.color).text(contactInfo, { align: 'center' });
      doc.moveDown();
    }
  }

  // Page 2: Synopsis
  doc.addPage({ size: 'A5', margin: 40 });
  addThemedBorder();
  
  doc.fontSize(18).fillColor(t.heading).text('Synopsis', { align: 'center' });
  doc.moveDown();
  addSeparator();
  doc.fontSize(12).fillColor(t.color).text(synopsis || '', { align: 'justify' });

  // Page 3: Credits
  doc.addPage({ size: 'A5', margin: 40 });
  addThemedBorder();
  
  doc.fontSize(18).fillColor(t.heading).text('Cast & Crew', { align: 'center' });
  doc.moveDown();
  addSeparator();

  // Cast section
  doc.fontSize(15).fillColor(t.heading).text('Cast:', { underline: true });
  doc.moveDown(0.3);
  
  // Always use list layout for cast (centered)
  doc.fontSize(11).fillColor(t.color);
  cast.forEach(person => {
    if (person.name && person.role) {
      doc.text(`${person.name} ....... ${person.role}`, { align: 'center' });
    }
  });
  
  doc.moveDown();

  // Crew section
  doc.fontSize(15).fillColor(t.heading).text('Crew:', { underline: true, align: 'center' });
  doc.fontSize(11).fillColor(t.color);
  crew.forEach(person => {
    if (person.name && person.role) {
      doc.text(`${person.name} ....... ${person.role}`, { align: 'center' });
    }
  });

  // Page 4: Director's Note (if available)
  if (directorNote) {
    doc.addPage({ size: 'A5', margin: 40 });
    addThemedBorder();
    
    doc.fontSize(18).fillColor(t.heading).text("Director's Note", { align: 'center' });
    doc.moveDown();
    addSeparator();

    // Director photo (if available)
    if (directorPhotoFile) {
      if (fs.existsSync(directorPhotoFile.path)) {
        try {
          doc.image(directorPhotoFile.path, doc.page.width - doc.page.margins.right - 80, doc.y, {
            fit: [80, 80],
            align: 'right'
          });
        } catch (err) {
          console.log('Error loading director photo:', err);
          // Draw placeholder
          doc.rect(doc.page.width - doc.page.margins.right - 80, doc.y, 80, 80).fillColor('#f0f0f0').fill();
          doc.fontSize(8).fillColor('#666')
            .text('Photo', doc.page.width - doc.page.margins.right - 80, doc.y + 35, { width: 80, align: 'center' });
        }
      } else {
        // Draw placeholder for missing photo
        doc.rect(doc.page.width - doc.page.margins.right - 80, doc.y, 80, 80).fillColor('#f0f0f0').fill();
        doc.fontSize(8).fillColor('#666')
          .text('Photo', doc.page.width - doc.page.margins.right - 80, doc.y + 35, { width: 80, align: 'center' });
      }
    }

    doc.fontSize(12).fillColor(t.color).text(directorNote, { 
      align: 'justify',
      width: directorPhotoFile ? doc.page.width - 120 : undefined
    });
    doc.moveDown();
    doc.fontSize(11).fillColor(t.heading).text(`- ${director}`, { align: 'right' });
  }

  // Adverts & Sponsors page (if available)
  if (adverts.length > 0 || sponsorInfo) {
    doc.addPage({ size: 'A5', margin: 40 });
    addThemedBorder();
    
    doc.fontSize(18).fillColor(t.heading).text('Adverts & Sponsors', { align: 'center' });
    doc.moveDown();
    addSeparator();

    // Adverts - arrange in grid (up to 4 per page)
    if (adverts.length > 0) {
      const advertsPerPage = 4;
      const pages = Math.ceil(adverts.length / advertsPerPage);
      
      for (let page = 0; page < pages; page++) {
        if (page > 0) {
          doc.addPage({ size: 'A5', margin: 40 });
          addThemedBorder();
          doc.fontSize(18).fillColor(t.heading).text('Adverts (continued)', { align: 'center' });
          doc.moveDown();
          addSeparator();
        }
        
        const startIdx = page * advertsPerPage;
        const endIdx = Math.min(startIdx + advertsPerPage, adverts.length);
        const pageAdverts = adverts.slice(startIdx, endIdx);
        
        // Grid layout: 2x2
        const gridWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 20) / 2;
        const gridHeight = 100;
        const startX = doc.page.margins.left;
        const startY = doc.y;
        
        pageAdverts.forEach((advert, idx) => {
          if (advert.title) {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const x = startX + col * (gridWidth + 20);
            const y = startY + row * (gridHeight + 30);
            
            // Title
            doc.fontSize(12).fillColor(t.heading)
              .text(advert.title, x, y, { width: gridWidth, align: 'center' });
            
            // Image or placeholder
            if (advert.image && fs.existsSync(advert.image)) {
              try {
                doc.image(advert.image, x, y + 20, {
                  fit: [gridWidth, gridHeight - 20],
                  align: 'center'
                });
              } catch (err) {
                doc.rect(x, y + 20, gridWidth, gridHeight - 20).fillColor('#eee').fill();
                doc.fontSize(8).fillColor('#666')
                  .text('Image error', x, y + 50, { width: gridWidth, align: 'center' });
              }
            } else {
              doc.rect(x, y + 20, gridWidth, gridHeight - 20).fillColor('#f5f5f5').fill();
              doc.fontSize(8).fillColor('#999')
                .text('No image', x, y + 50, { width: gridWidth, align: 'center' });
            }
          }
        });
        
        doc.y = startY + Math.ceil(pageAdverts.length / 2) * (gridHeight + 30) + 20;
      }
    }

    // Sponsors
    if (sponsorInfo) {
      doc.fontSize(15).fillColor(t.heading).text('Our Sponsors:', { underline: true });
      doc.fontSize(11).fillColor(t.color).text(sponsorInfo);
    }
  }

  // Additional Photos (each on own page, with themed frames)
  if (additionalPhotos && additionalPhotos.length) {
    additionalPhotos.forEach((file, idx) => {
      doc.addPage({ size: 'A5', margin: 40 });
      addThemedBorder();
      doc.fontSize(15).fillColor(t.heading).text(`Photo ${idx + 1}`, { align: 'center' });
      doc.moveDown(0.5);
      try {
        doc.image(file.path, {
          fit: [doc.page.width - 80, doc.page.height - 130],
          align: 'center',
          valign: 'center'
        });
      } catch (err) {
        doc.fontSize(10).fillColor('red').text('Error displaying photo', { align: 'center' });
      }
    });
  }

  doc.end();
});

// Ensure uploads and assets directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync(path.join(__dirname, 'public/theme-assets'))) {
  fs.mkdirSync(path.join(__dirname, 'public/theme-assets'), { recursive: true });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});