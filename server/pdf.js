import PDFDocument from 'pdfkit';

/** Render a PDF with a custom header, message and a table of issues. Returns a Buffer. */
export function renderPdf({ header, message, columns, rows }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: columns.length > 4 ? 'landscape' : 'portrait' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const bottom = () => doc.page.height - doc.page.margins.bottom;

    doc.font('Helvetica-Bold').fontSize(20).text(header || 'Roadmap Update', { width });
    doc.moveDown(0.5);
    if (message) {
      doc.font('Helvetica').fontSize(11).text(message, { width });
      doc.moveDown(0.5);
    }
    doc.font('Helvetica').fontSize(8).fillColor('#666').text(`Generated ${new Date().toLocaleDateString()}`);
    doc.fillColor('#000').moveDown(1);

    // Summary-like columns get more room.
    const weight = (c) => (c.key === 'summary' ? 4 : c.key === 'key' ? 1.2 : /note/i.test(c.key) ? 3 : 1.6);
    const total = columns.reduce((s, c) => s + weight(c), 0);
    const widths = columns.map((c) => (weight(c) / total) * width);
    const pad = 4;

    const drawRow = (cells, bold, shade) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      const h = Math.max(...cells.map((t, i) => doc.heightOfString(t, { width: widths[i] - pad * 2 }))) + pad * 2;
      if (doc.y + h > bottom()) {
        doc.addPage();
        drawRow(columns.map((c) => c.label), true, true);
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      }
      const y = doc.y;
      if (shade) doc.rect(left, y, width, h).fill('#e8eef7').fillColor('#000');
      let x = left;
      cells.forEach((t, i) => {
        doc.text(t, x + pad, y + pad, { width: widths[i] - pad * 2 });
        x += widths[i];
      });
      doc.moveTo(left, y + h).lineTo(left + width, y + h).strokeColor('#ccc').lineWidth(0.5).stroke();
      doc.y = y + h;
      doc.x = left;
    };

    drawRow(columns.map((c) => c.label), true, true);
    if (!rows.length) doc.font('Helvetica-Oblique').text('No matching issues.', left, doc.y + 6);
    rows.forEach((r) => drawRow(columns.map((c) => r[c.key] ?? ''), false, false));
    doc.end();
  });
}
