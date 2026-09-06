/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import AppError from '../errorHelpers/AppError';
import StatusCodes from 'http-status-codes';

// Extend the Invoice Interface
export interface IInvoiceData {
  transactionId: string;
  bookingDate: Date;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userAddress?: string;
  tourTitle: string;
  guestCount: number;
  totalAmount: number;
}

export const generatePDF = async (data: IInvoiceData): Promise<Buffer<ArrayBufferLike>> => {
  try {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0 }); // Margin 0 to allow full-width header
      const buffer: Uint8Array[] = [];

      doc.on('data', (chunk) => buffer.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffer)));
      doc.on('error', (err) => reject(err));

      // Colors matching the frontend design
      const primaryColor = '#029E9D';
      const textColor = '#333333';
      const lightGray = '#f4f7f6';
      const borderGray = '#eeeeee';

      // --- HEADER SECTION ---
      doc.rect(0, 0, doc.page.width, 140).fill(primaryColor);

      // Brand Name / Logo Text
      doc.fillColor('#ffffff').fontSize(36).font('Helvetica-Bold').text('Traveler', 50, 50);

      doc.fontSize(14).font('Helvetica').text('Booking Confirmed', 50, 90);

      // Invoice Info (Top Right)
      doc
        .fontSize(10)
        .text(`INVOICE NUMBER`, doc.page.width - 250, 50, { align: 'right' })
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(data.transactionId, { align: 'right' });

      doc.moveDown(0.5);
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(`DATE`, doc.page.width - 250, 90, { align: 'right' })
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(new Date(data.bookingDate).toLocaleDateString(), { align: 'right' });

      // Reset margins for the body content
      doc.page.margins = { top: 50, bottom: 50, left: 50, right: 50 };
      doc.y = 180; // Start below the header
      doc.x = 50;

      // --- CUSTOMER DETAILS ---
      doc.fillColor(textColor).fontSize(12).font('Helvetica-Bold').text('BILLED TO:');

      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);
      doc.text(data.userName);
      doc.text(data.userEmail);
      if (data.userPhone) doc.text(data.userPhone);
      if (data.userAddress) doc.text(data.userAddress);

      doc.moveDown(4);

      // --- INVOICE TABLE ---
      const tableTop = doc.y;

      // Table Header Background
      doc.rect(50, tableTop, doc.page.width - 100, 30).fill(lightGray);

      // Table Header Text
      doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
      doc.text('DESCRIPTION', 65, tableTop + 10);
      doc.text('GUESTS', 280, tableTop + 10, { width: 90, align: 'center' });
      doc.text('PRICE / GUEST', 370, tableTop + 10, { width: 90, align: 'right' });
      doc.text('TOTAL', 460, tableTop + 10, { width: 75, align: 'right' });

      // Table Row Content
      const rowTop = tableTop + 45;
      doc.font('Helvetica').fontSize(11);
      doc.text(data.tourTitle, 65, rowTop, { width: 215 });
      doc.text(`${data.guestCount}`, 280, rowTop, { width: 90, align: 'center' });

      const pricePerGuest = (data.totalAmount / data.guestCount).toFixed(2);
      doc.text(`$${pricePerGuest}`, 370, rowTop, { width: 90, align: 'right' });
      doc.text(`$${data.totalAmount.toFixed(2)}`, 460, rowTop, { width: 75, align: 'right' });

      // Bottom border for the row
      const lineY = rowTop + Math.max(doc.heightOfString(data.tourTitle, { width: 215 }), 15) + 15;
      doc
        .moveTo(50, lineY)
        .lineTo(doc.page.width - 50, lineY)
        .strokeColor(borderGray)
        .stroke();

      doc.y = lineY + 20;

      // --- TOTALS ---
      const tax = data.totalAmount * 0.1;
      const netTotal = data.totalAmount + tax;
      const totalsTop = doc.y;

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('SUBTOTAL:', 370, totalsTop, { width: 90, align: 'right' });
      doc
        .font('Helvetica')
        .text(`$${data.totalAmount.toFixed(2)}`, 460, totalsTop, { width: 75, align: 'right' });

      doc
        .font('Helvetica-Bold')
        .text('TAX (10%):', 370, totalsTop + 20, { width: 90, align: 'right' });
      doc
        .font('Helvetica')
        .text(`$${tax.toFixed(2)}`, 460, totalsTop + 20, { width: 75, align: 'right' });

      // Total Box
      doc.rect(350, totalsTop + 45, doc.page.width - 400, 40).fill(lightGray);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12);
      doc.text('NET TOTAL:', 370, totalsTop + 58, { width: 90, align: 'right' });
      doc
        .fontSize(14)
        .text(`$${netTotal.toFixed(2)}`, 460, totalsTop + 57, { width: 75, align: 'right' });

      // --- FOOTER ---
      const footerTop = doc.page.height - 100;
      doc.rect(0, footerTop, doc.page.width, 100).fill(lightGray);
      doc
        .fillColor('#888888')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Thank you for choosing Traveler!', 0, footerTop + 35, { align: 'center' });

      doc
        .font('Helvetica')
        .text(
          'For any questions regarding this invoice, please contact support@traveler.ismailjosim.com',
          0,
          footerTop + 55,
          { align: 'center' }
        );

      doc.end();
    });
  } catch (error: any) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Found Error While generation PDF: ${error.message}`
    );
  }
};
