import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExtendedPurchaseRequest } from '../types/inventory';
import { useMasterStore } from '../stores/useMasterStore';

export const exportPurchaseRequestPDF = (request: ExtendedPurchaseRequest) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const { plantSettings } = useMasterStore.getState() as any;

    // --- Header & Logo Section ---
    let logoHeight = 0;
    const margin = 14;

    if (plantSettings.logoUrl) {
        try {
            const imgProps = doc.getImageProperties(plantSettings.logoUrl);
            const logoWidth = 25; // Small size, matching spare parts request report
            logoHeight = (imgProps.height * logoWidth) / imgProps.width;
            doc.addImage(plantSettings.logoUrl, 'PNG', margin, 10, logoWidth, logoHeight);
        } catch (e) {
            console.warn('Could not add logo to PDF', e);
        }
    } else {
        // Fallback text if no logo
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(plantSettings.plantName || 'CoreFlow', margin, 18);
        logoHeight = 10;
    }

    // Adjust Y coordinates based on logo height
    const headerY = Math.max(25, 10 + logoHeight + 5);

    // Title (matching exact font size and style of spare parts request report)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Requisición de Compra', margin, headerY);

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Fecha de Emisión: ${dateStr}`, margin, headerY + 7);

    // --- Request Metadata Block ---
    const metaY = headerY + 18;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('INFORMACIÓN DE LA REQUISICIÓN', margin, metaY);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, metaY + 2, pageWidth - margin, metaY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const reqDate = new Date(request.requestDate).toLocaleDateString();
    
    doc.text(`Código de Requisición: ${request.purchaseRequestNumber}`, margin, metaY + 8);
    doc.text(`Solicitado Por: ${request.requestedBy}`, margin, metaY + 14);
    
    doc.text(`Fecha de Requisición: ${reqDate}`, pageWidth - margin, metaY + 8, { align: 'right' });
    doc.text(`Solicitud de Origen: ${request.sourceRequestNumber || 'DIRECTO'}`, pageWidth - margin, metaY + 14, { align: 'right' });

    const yPos = metaY + 22;

    // --- Items Table ---
    const tableBody = request.items.map(item => {
        const itemDate = new Date(request.requestDate).toLocaleDateString();
        const itemStatus = request.status === 'Cancelado'
            ? 'Cancelado'
            : (item.quantityReceived || 0) >= item.quantity
                ? 'Recibido'
                : (item.quantityReceived || 0) > 0
                    ? 'Parcial'
                    : 'Pendiente';
        
        return [
            itemDate,
            item.partNumber || request.sparePartNumber || 'N/A',
            item.partName || request.sparePartName || 'N/A',
            item.company || 'N/A',
            item.quantity,
            itemStatus
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Código', 'Nombre', 'Empresa', 'Cant. Solicitada', 'Estado Solicitud']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
            4: { halign: 'right' }, // Right-aligned "Cant. Solicitada"
            5: { halign: 'center' }  // Center-aligned "Estado Solicitud"
        },
        margin: { left: margin, right: margin }
    });

    // --- Footer & Signatures ---
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    
    let signatureY = finalY;
    if (signatureY > pageHeight - 30) {
        doc.addPage();
        signatureY = 40;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    doc.line(margin, signatureY, margin + 55, signatureY);
    doc.text('Firma Solicitante', margin, signatureY + 5);
    
    doc.line(pageWidth - margin - 55, signatureY, pageWidth - margin, signatureY);
    doc.text('Firma Autorización', pageWidth - margin - 55, signatureY + 5);

    // Save PDF
    const fileName = `Requisicion_${request.purchaseRequestNumber}.pdf`;
    doc.save(fileName);
};

