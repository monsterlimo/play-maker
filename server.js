const express = require('express');
const path = require('path');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const fs = require('fs');

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
    creditsLayout = 'list',
    overlayInfo
  } = req.body;

  // Parse cast/crew arrays
  const castNames = req.body['castName[]'] || req.body.castName || [];
  const castRoles = req.body['castRole[]'] || req.body.castRole || [];
  const crewNames = req.body['crewName[]'] || req.body.crewName || [];
  const crewRoles = req.body['crewRole[]'] || req.body.crewRole || [];
  
  // Parse advert arrays
  const advertTitles = req.body['advertTitle[]'] || req.body.advertTitle || [];
  const advertLayouts = req.body['advertLayout[]'] || req.body.advertLayout || [];

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
        layout: advertLayouts[i] || 'full',
        image: req.files && req.files.advertImage && req.files.advertImage[i] ? req.files.advertImage[i].path : null
      }))
    : advertTitles ? [{
        title: advertTitles,
        layout: advertLayouts || 'full',
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
  if (logoFile && fs.existsSync(logoFile.path)) {
    try {
      doc.image(logoFile.path, doc.page.margins.left, doc.y, {
        fit: [80, 40],
        align: 'left'
      });
    } catch (err) {
      console.log('Error loading logo:', err);
    }
  }

  // Cover image (if available and large)
  if (coverFile && fs.existsSync(coverFile.path)) {
    try {
      doc.addPage({ size: 'A5', margin: 40 });
      addThemedBorder();
      doc.image(coverFile.path, {
        fit: [doc.page.width - 80, doc.page.height - 120],
        align: 'center',
        valign: 'center'
      });
      if (overlayInfo) {
        // Add overlay info at bottom
        doc.fontSize(16).fillColor('white').font(t.font)
          .text(playName || 'Play Name', doc.page.margins.left, doc.page.height - 100, { 
            align: 'center',
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right
          });
        doc.fontSize(12).text(`${date || ''} | ${venue || ''}`, { align: 'center' });
      }
    } catch (err) {
      console.log('Error loading cover image:', err);
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
  
  if (creditsLayout === 'grid' && cast.some(p => p.photo)) {
    // Photo grid layout
    let x = doc.page.margins.left;
    let y = doc.y;
    const photoSize = 60;
    const spacing = 90;
    let col = 0;
    const maxCols = 3;

    cast.forEach(person => {
      if (person.name && person.role) {
        if (col >= maxCols) {
          col = 0;
          x = doc.page.margins.left;
          y += 100;
        }

        // Photo
        if (person.photo && fs.existsSync(person.photo)) {
          try {
            doc.image(person.photo, x, y, {
              fit: [photoSize, photoSize],
              align: 'center'
            });
          } catch (err) {
            doc.rect(x, y, photoSize, photoSize).fillColor('#eee').fill();
          }
        } else {
          doc.rect(x, y, photoSize, photoSize).fillColor('#eee').fill();
        }

        // Name and role
        doc.fontSize(9).fillColor(t.color)
          .text(person.name, x, y + photoSize + 5, { width: photoSize, align: 'center' });
        doc.fontSize(8).fillColor('#666')
          .text(person.role, x, y + photoSize + 18, { width: photoSize, align: 'center' });

        x += spacing;
        col++;
      }
    });
    
    doc.y = y + 120; // Move past the grid
  } else {
    // List layout
    doc.fontSize(11).fillColor(t.color);
    cast.forEach(person => {
      if (person.name && person.role) {
        doc.text(`${person.name} ....... ${person.role}`);
      }
    });
  }
  
  doc.moveDown();

  // Crew section
  doc.fontSize(15).fillColor(t.heading).text('Crew:', { underline: true });
  doc.fontSize(11).fillColor(t.color);
  crew.forEach(person => {
    if (person.name && person.role) {
      doc.text(`${person.name} ....... ${person.role}`);
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
    if (directorPhotoFile && fs.existsSync(directorPhotoFile.path)) {
      try {
        doc.image(directorPhotoFile.path, doc.page.width - doc.page.margins.right - 80, doc.y, {
          fit: [80, 80],
          align: 'right'
        });
      } catch (err) {
        console.log('Error loading director photo:', err);
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

    // Adverts
    if (adverts.length > 0) {
      adverts.forEach(advert => {
        if (advert.title) {
          const width = advert.layout === 'full' ? doc.page.width - 80 : 
                       advert.layout === 'half' ? (doc.page.width - 100) / 2 : 
                       (doc.page.width - 120) / 3;
          
          doc.fontSize(14).fillColor(t.heading).text(advert.title);
          
          if (advert.image && fs.existsSync(advert.image)) {
            try {
              doc.image(advert.image, {
                fit: [width, advert.layout === 'quarter' ? 80 : 120],
                align: 'left'
              });
            } catch (err) {
              doc.fontSize(10).fillColor('red').text('Error loading advert image');
            }
          }
          doc.moveDown();
        }
      });
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