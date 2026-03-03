import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { ExtendedPurchaseRequest } from '../types/inventory';

export const exportPurchaseRequestPDF = (request: ExtendedPurchaseRequest) => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header & Logo Placeholder ---
    doc.setFillColor(30, 41, 59); // industrial-900 (approx)
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('COREFLOW', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SISTEMA DE GESTIÓN DE MANTENIMIENTO', 15, 28);

    doc.setFontSize(14);
    doc.text('ORDEN DE REQUISICIÓN', pageWidth - 15, 25, { align: 'right' });

    // --- Request Info ---
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE LA SOLICITUD', 15, 55);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 57, pageWidth - 15, 57);

    doc.setFont('helvetica', 'normal');
    const requestDate = new Date(request.requestDate).toLocaleDateString();
    
    doc.text(`CÓDIGO: ${request.purchaseRequestNumber}`, 15, 65);
    doc.text(`FECHA: ${requestDate}`, 15, 72);
    doc.text(`ORIGEN: ${request.sourceRequestNumber || 'DIRECTO'}`, pageWidth - 15, 65, { align: 'right' });
    doc.text(`SOLICITADO POR: ${request.requestedBy}`, pageWidth - 15, 72, { align: 'right' });

    // --- Items Table ---
    const tableHeaders = [['CANT.', 'NÚMERO DE PARTE', 'DESCRIPCIÓN', 'ESTADO']];
    const tableData = request.items.map(item => [
        item.quantity,
        item.partNumber || request.sparePartNumber || 'N/A',
        item.partName || request.sparePartName || 'N/A',
        'PENDIENTE'
    ]);

    doc.autoTable({
        startY: 85,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 10,
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 4
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { cellWidth: 40 },
            3: { halign: 'center', cellWidth: 30 }
        }
    });

    // --- Footer ---
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    
    doc.line(15, finalY, 70, finalY);
    doc.text('Firma Solicitante', 15, finalY + 5);
    
    doc.line(pageWidth - 70, finalY, pageWidth - 15, finalY);
    doc.text('Firma Autorización', pageWidth - 70, finalY + 5);

    // Save
    const fileName = `Requisicion_${request.purchaseRequestNumber}.pdf`;
    doc.save(fileName);
};
