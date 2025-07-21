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
app.post('/generate', upload.array('photos', 4), (req, res) => {
  const {
    theme = 'classic',
    playName,
    date,
    venue,
    synopsis,
    director
  } = req.body;

  // Parse cast/crew arrays
  const castNames = req.body['castName[]'] || req.body.castName || [];
  const castRoles = req.body['castRole[]'] || req.body.castRole || [];
  const crewNames = req.body['crewName[]'] || req.body.crewName || [];
  const crewRoles = req.body['crewRole[]'] || req.body.crewRole || [];

  // Normalize arrays
  const cast = Array.isArray(castNames)
    ? castNames.map((name, i) => ({ name, role: castRoles[i] || '' }))
    : [{ name: castNames, role: castRoles }];

  const crew = Array.isArray(crewNames)
    ? crewNames.map((name, i) => ({ name, role: crewRoles[i] || '' }))
    : [{ name: crewNames, role: crewRoles }];

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

  // Themed border (image as header)
  if (t.border && fs.existsSync(t.border)) {
    doc.image(t.border, doc.page.margins.left, doc.page.margins.top - 20, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      height: 24
    });
    doc.moveDown(1.2);
  }

  // Main Title
  doc.fontSize(20).fillColor(t.heading).font(t.font).text(playName || 'Play Name', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor(t.color).text(`Date: ${date || ''}`, { align: 'center' });
  doc.text(`Venue: ${venue || ''}`, { align: 'center' });
  doc.text(`Director: ${director || ''}`, { align: 'center' });
  doc.moveDown();

  // Section separator
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor(t.accent).lineWidth(2).stroke();
  doc.moveDown();

  // Synopsis
  doc.fontSize(15).fillColor(t.heading).text('Synopsis:', { underline: true });
  doc.fontSize(11).fillColor(t.color).text(synopsis || '', { align: 'left' });
  doc.moveDown();

  // Cast
  doc.fontSize(15).fillColor(t.heading).text('Cast:', { underline: true });
  doc.fontSize(11).fillColor(t.color);
  cast.forEach(person => {
    if (person.name && person.role) {
      doc.text(`${person.name} ....... ${person.role}`);
    }
  });
  doc.moveDown();

  // Crew
  doc.fontSize(15).fillColor(t.heading).text('Crew:', { underline: true });
  doc.fontSize(11).fillColor(t.color);
  crew.forEach(person => {
    if (person.name && person.role) {
      doc.text(`${person.name} ....... ${person.role}`);
    }
  });
  doc.moveDown();

  // Section separator
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor(t.accent).lineWidth(1.5).stroke();
  doc.moveDown();

  // Photos (each on own page, with themed frames)
  if (req.files && req.files.length) {
    req.files.forEach((file, idx) => {
      doc.addPage({ size: 'A5', margin: 40 });
      if (t.border && fs.existsSync(t.border)) {
        doc.image(t.border, doc.page.margins.left, doc.page.margins.top - 20, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          height: 24
        });
        doc.moveDown(1.2);
      }
      doc.fontSize(15).fillColor(t.heading).text(`Photo ${idx + 1}:`, { align: 'center' });
      doc.moveDown(0.5);
      try {
        doc.image(file.path, {
          fit: [doc.page.width - 80, doc.page.height - 130],
          align: 'center',
          valign: 'center'
        });
        // Themed frame: simple colored rectangle
        doc.rect(doc.page.margins.left + 10, doc.y - doc.page.height/2 + 40,
          doc.page.width - doc.page.margins.left - doc.page.margins.right - 20,
          doc.page.height - doc.page.margins.top - doc.page.margins.bottom - 90)
          .strokeColor(t.accent).lineWidth(3).stroke();
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