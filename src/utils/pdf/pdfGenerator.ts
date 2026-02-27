import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WorkOrder, Machine } from '../../types';

// Opcional: Logo de la empresa en base64 para reemplazar el texto "RAVICARIBE INC."
const COMPANY_LOGO_BASE64 = ''; 

export const generateRMant02PDF = (order: WorkOrder, machine?: Machine) => {
  // Configuración inicial del PDF (A4, horizontal)
  const doc = new jsPDF({
    orientation: 'portrait', // El original parece vertical u horizontal según la cantidad de columnas, usaremos portrait para A4 estándar y escalaremos
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;
  
  // Fuentes Globales
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // --- HEADER SECTION ---
  // Borde exterior del header
  doc.rect(margin, margin, pageWidth - 2 * margin, 25);
  
  // Líneas separadoras verticales del header
  const col1Width = 45;
  const col3Width = 40;
  const col2Width = (pageWidth - 2 * margin) - col1Width - col3Width;

  doc.line(margin + col1Width, margin, margin + col1Width, margin + 25);
  doc.line(margin + col1Width + col2Width, margin, margin + col1Width + col2Width, margin + 25);
  
  // Título 1 Logo/Nombre Empresa
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 150, 0); // Verde estilo "RaviCaribe"
  if (COMPANY_LOGO_BASE64) {
      doc.addImage(COMPANY_LOGO_BASE64, 'PNG', margin + 2, margin + 5, 40, 15);
  } else {
      doc.text("COREFLOW INC.", margin + 5, margin + 15);
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text("SOLUCIONES INDUSTRIALES", margin + 5, margin + 18);
  }

  // Título Central
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("REGISTRO DE MANTENIMIENTO PREVENTIVO", margin + col1Width + (col2Width/2), margin + 10, { align: 'center' });
  doc.text(machine?.name?.toUpperCase() || '', margin + col1Width + (col2Width/2), margin + 16, { align: 'center' });
  doc.text(machine?.zone?.toUpperCase() || '', margin + col1Width + (col2Width/2), margin + 22, { align: 'center' });

  // Título Derecha (R-MANT-02)
  doc.setFontSize(14);
  doc.text("R-MANT-02", margin + col1Width + col2Width + (col3Width/2), margin + 15, { align: 'center' });


  // --- INFO SECTION ---
  const infoY = margin + 30;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Columna Izquierda
  doc.text("Nº de Orden Trabajo:", margin, infoY);
  doc.text(order.displayId || order.id, margin + 35, infoY);
  doc.line(margin + 35, infoY + 1, margin + 80, infoY + 1);

  doc.text("Fecha Inicio de Mtto :", margin, infoY + 6);
  doc.text(order.startDate || '', margin + 35, infoY + 6);
  doc.line(margin + 35, infoY + 7, margin + 80, infoY + 7);

  doc.text("Fecha Final de Mtto :", margin, infoY + 12);
  doc.text(order.endDate || order.completedDate?.split('T')[0] || '', margin + 35, infoY + 12);
  doc.line(margin + 35, infoY + 13, margin + 80, infoY + 13);

  doc.text("Horas maq.de trabajo:", margin, infoY + 18);
  doc.text((order.machineWorkHours || 0).toString(), margin + 35, infoY + 18);
  doc.line(margin + 35, infoY + 19, margin + 80, infoY + 19);

  doc.text("Horas de Prox. Mtto.:", margin, infoY + 24);
  doc.text((order.nextMaintenanceHours || 0).toString(), margin + 35, infoY + 24);
  doc.line(margin + 35, infoY + 25, margin + 80, infoY + 25);

  doc.text("Ejecutante:", margin, infoY + 30);
  doc.text(order.executors?.[0]?.name || order.assignedTo || '-', margin + 30, infoY + 30);
  doc.line(margin + 30, infoY + 31, margin + 80, infoY + 31);

  doc.text("Supervisión:", margin, infoY + 36);
  doc.text(order.supervisor || '-', margin + 30, infoY + 36);
  doc.line(margin + 30, infoY + 37, margin + 80, infoY + 37);

  doc.text("Tiempo de Ejecución:", margin, infoY + 42);
  doc.text("Minutos", margin + 65, infoY + 42);
  // Calculando tiempo si existe
  let durationMins = '';
  if (order.startTime && order.endTime && order.startDate === order.endDate) {
    const start = new Date(`1970-01-01T${order.startTime}:00`);
    const end = new Date(`1970-01-01T${order.endTime}:00`);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs > 0) durationMins = Math.floor(diffMs / 60000).toString();
  }
  doc.text(durationMins, margin + 50, infoY + 42);
  doc.line(margin + 35, infoY + 43, margin + 60, infoY + 43);

  // Columna Centro (Intervalos y Tiempos)
  const centerX = margin + 90;
  
  // Caja de intervalo (15 Dias / 360 Hrs)
  doc.rect(centerX, infoY - 4, 35, 12);
  doc.line(centerX, infoY + 2, centerX + 35, infoY + 2);
  doc.line(centerX + 20, infoY + 2, centerX + 20, infoY + 8);
  
  doc.setFontSize(8);
  doc.text("Días", centerX + 5, infoY);
  doc.setFont('helvetica', 'bold');
  doc.text(order.interval?.includes('Mes') ? '30' : '15', centerX + 20, infoY); // Mock lógico
  
  doc.text(order.interval?.replace(/\D/g,'') || '0', centerX + 5, infoY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text("Hrs", centerX + 25, infoY + 6);
  
  // Tiempos
  doc.setFontSize(9);
  doc.text("Hora de inicio:", centerX, infoY + 16);
  doc.text(order.startTime || '', centerX + 25, infoY + 16);
  doc.line(centerX + 25, infoY + 17, centerX + 50, infoY + 17);

  doc.text("Hora final:", centerX, infoY + 22);
  doc.text(order.endTime || '', centerX + 25, infoY + 22);
  doc.line(centerX + 25, infoY + 23, centerX + 50, infoY + 23);

  doc.text("T. Empleado:", centerX, infoY + 28);
  doc.text(durationMins, centerX + 25, infoY + 28);
  doc.line(centerX + 25, infoY + 29, centerX + 50, infoY + 29);

  // Código debajo del bloque central
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${machine?.alias}_${machine?.zone}_${order.interval}_R_M_02`.replace(/\s/g, '_'), centerX, infoY + 40);


  // Columna Derecha
  const rightX = pageWidth - margin - 65;
  
  // Tabla Equipo/Matricula
  doc.rect(rightX, infoY - 4, 65, 12);
  doc.line(rightX, infoY + 2, rightX + 65, infoY + 2);
  doc.line(rightX + 20, infoY - 4, rightX + 20, infoY + 8);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text("Equipo", rightX + 2, infoY);
  doc.setFont('helvetica', 'bold');
  doc.text(machine?.alias || '-', rightX + 22, infoY);
  
  doc.setFont('helvetica', 'normal');
  doc.text("Matricula", rightX + 2, infoY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(machine?.plate || '-', rightX + 22, infoY + 6);

  // Tabla Tipo de Mantenimiento
  const typeY = infoY + 12;
  doc.rect(rightX, typeY, 65, 24);
  doc.line(rightX, typeY + 6, rightX + 65, typeY + 6);
  doc.line(rightX, typeY + 12, rightX + 65, typeY + 12);
  doc.line(rightX, typeY + 18, rightX + 65, typeY + 18);
  
  doc.line(rightX + 45, typeY + 6, rightX + 45, typeY + 24); // Separator for checks
  
  doc.setFont('helvetica', 'normal');
  doc.text("Tipo de Mantenimiento", rightX + 32.5, typeY + 4, { align: 'center' });
  
  doc.text("Preventivo", rightX + 2, typeY + 10);
  if (order.maintenanceType === 'Preventive') doc.text("X", rightX + 53, typeY + 10);

  doc.text("Programado", rightX + 2, typeY + 16);
  if (order.maintenanceType === 'Programmed') doc.text("X", rightX + 53, typeY + 16);

  doc.text("Otro", rightX + 2, typeY + 22);
  if (order.maintenanceType === 'Other') doc.text("X", rightX + 53, typeY + 22);


  // --- TASKS TABLE (autoTable) ---
  const tableStartY = infoY + 50;

  // Transform Tasks Data for AutoTable
  const tableData = ((order as any).tasks || []).map((t: any, idx: number) => {
    return [
      idx + 1,
      t.group || '',
      t.component || '',
      t.activity || '',
      t.referenceCode || '',
      t.lubricantType || '',
      t.lubricantCode || '',
      t.estimatedTime || '',
      t.actionFlags?.clean ? 'X' : '',
      t.actionFlags?.inspect ? 'X' : '',
      t.actionFlags?.lubricate ? 'X' : '',
      t.actionFlags?.adjust ? 'X' : '',
      t.actionFlags?.refill ? 'X' : '',
      t.actionFlags?.replace ? 'X' : '',
      t.actionFlags?.mount ? 'X' : ''
    ];
  }) || [];

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      'Nº', 'Grupo', 'Punto de intervención', 'Tipo de intervención', 'Ref de interv.', 
      'Tipo de Lub.', 'Codigo', 'Tiem. Estim min', 
      'L', 'C', 'Lu', 'A', 'R', 'S', 'D/M'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      // Checkboxes columns narrow
      8: { halign: 'center', cellWidth: 5 },
      9: { halign: 'center', cellWidth: 5 },
      10: { halign: 'center', cellWidth: 5 },
      11: { halign: 'center', cellWidth: 5 },
      12: { halign: 'center', cellWidth: 5 },
      13: { halign: 'center', cellWidth: 5 },
      14: { halign: 'center', cellWidth: 5 },
    }
  });

  // --- HANDOVER CHECKLIST ---
  let finalY = (doc as any).lastAutoTable.finalY + 5;
  
  // Page break check
  if (finalY > pageHeight - 60) {
      doc.addPage();
      finalY = margin;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, finalY, pageWidth - 2 * margin, 8, 'F');
  doc.rect(margin, finalY, pageWidth - 2 * margin, 8); // border
  doc.text("ENTREGA DEL AREA O EQUIPO DONDE SE REALIZO EL TRABAJO", pageWidth/2, finalY + 5, { align: 'center' });

  // Checklist table
  const handovers = [
    { desc: "Punto específico de intervención limpio libre de contaminantes", val: order.checklist?.pointClean },
    { desc: "Área o punto de intervención limpio", val: order.checklist?.areaClean },
    { desc: "Protecciones y guardas de las maquinas completas", val: order.checklist?.guardsComplete },
    { desc: "Se retiro del área todas las herramientas y accesorios que se utilizo", val: order.checklist?.toolsRemoved },
    { desc: "En caso de haber utilizado grasas o aceites dejar en el lugar", val: order.checklist?.greaseCleaned },
    { desc: "Activar todas la protecciones de seguridad", val: order.checklist?.safetyActivated },
  ];

  const colWidth = (pageWidth - 2 * margin) / 2;
  const rh = 8; // row height
  let currY = finalY + 8;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  for (let i = 0; i < 3; i++) {
    const leftTask = handovers[i];
    const rightTask = handovers[i+3];

    // Left
    doc.rect(margin, currY, colWidth - 15, rh); // Text
    doc.rect(margin + colWidth - 15, currY, 7.5, rh); // SI
    doc.rect(margin + colWidth - 7.5, currY, 7.5, rh); // NO
    
    doc.text(leftTask.desc.substring(0, 60), margin + 2, currY + 5);
    if (leftTask.val === true) doc.text("X", margin + colWidth - 12, currY + 5);
    if (leftTask.val === false) doc.text("X", margin + colWidth - 4, currY + 5);

    // Right
    doc.rect(margin + colWidth, currY, colWidth - 15, rh); // Text
    doc.rect(margin + 2*colWidth - 15, currY, 7.5, rh); // SI
    doc.rect(margin + 2*colWidth - 7.5, currY, 7.5, rh); // NO

    doc.text(rightTask.desc.substring(0, 60), margin + colWidth + 2, currY + 5);
    if (rightTask.val === true) doc.text("X", margin + 2*colWidth - 12, currY + 5);
    if (rightTask.val === false) doc.text("X", margin + 2*colWidth - 4, currY + 5);

    currY += rh;
  }

  // --- EXECUTORS AND OBSERVATIONS ---
  currY += 5;
  doc.setFont('helvetica', 'bold');
  doc.rect(margin, currY, pageWidth - 2 * margin, rh);
  doc.text("Nombres de personal que participo en el mantenimiento", margin + 2, currY + 5);
  doc.rect(margin + colWidth, currY, colWidth, rh);
  doc.text("Posición / Rol", margin + colWidth + 2, currY + 5);
  
  doc.setFont('helvetica', 'normal');
  currY += rh;
  doc.rect(margin, currY, colWidth, rh);
  doc.text(order.signatureExecutor || order.executors?.[0]?.name || '-', margin + 2, currY + 5);
  doc.rect(margin + colWidth, currY, colWidth, rh);
  doc.text("Mecánico Asignado", margin + colWidth + 2, currY + 5);

  currY += rh + 5;
  doc.rect(margin, currY, pageWidth - 2 * margin, 20);
  doc.setFont('helvetica', 'bold');
  doc.text("OBSERVACIONES:", margin + 2, currY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(order.observations || 'Sin observaciones.', margin + 35, currY + 5, { maxWidth: pageWidth - 2 * margin - 40 });

  // --- SIGNATURES ---
  currY += 25;
  doc.setFont('helvetica', 'bold');
  doc.text("MECANICO ASIGNADO:", margin + 20, currY);
  // doc.line(margin + 20, currY + 1, margin + 70, currY + 1); // Signature line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(order.signatureExecutor || '', margin + 20, currY + 5);
  if (order.signatureExecutorDate) {
      doc.text(new Date(order.signatureExecutorDate).toLocaleString(), margin + 20, currY + 9);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("RECIBIDO CONFORME (Supervisor):", pageWidth / 2 + 20, currY);
  // doc.line(pageWidth / 2 + 20, currY + 1, pageWidth / 2 + 70, currY + 1);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(order.signatureSupervisor || '', pageWidth / 2 + 20, currY + 5);
  if (order.signatureSupervisorDate) {
      doc.text(new Date(order.signatureSupervisorDate).toLocaleString(), pageWidth / 2 + 20, currY + 9);
  }

  // --- SAVE ---
  doc.save(`R-MANT-02-${order.displayId || order.id}.pdf`);
};

export const generateMaintenanceListPDF = (orders: WorkOrder[], title: string, machines: Machine[]) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const margin = 10;

  // --- HEADER SECTION ---
  doc.rect(margin, margin, pageWidth - 2 * margin, 20);
  
  // Logo / Company Name
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 150, 0);
  if (COMPANY_LOGO_BASE64) {
    doc.addImage(COMPANY_LOGO_BASE64, 'PNG', margin + 2, margin + 2, 35, 12);
  } else {
    doc.setFontSize(14);
    doc.text("COREFLOW INC.", margin + 5, margin + 10);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("SOLUCIONES INDUSTRIALES", margin + 5, margin + 14);
  }

  // Report Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, margin + 12, { align: 'center' });

  // Date and Metadata
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, pageWidth - margin - 5, margin + 8, { align: 'right' });
  doc.text(`Registros Encontrados: ${orders.length}`, pageWidth - margin - 5, margin + 14, { align: 'right' });

  // --- TABLE SECTION ---
  const isRMant02 = title.includes('PREVENTIVO');

  const head = isRMant02 
    ? [['Nº Orden', 'Equipo', 'Zona / Línea', 'Alias', 'Tipo', 'Intervalo', 'Fecha', 'Estado']]
    : [['Nº Orden', 'Equipo', 'Tipo', 'Departamento', 'Tipo de Avería', 'Fecha', 'Estado']];

  const body = orders.map(o => {
    const machine = machines.find(m => m.id === o.machineId);
    const date = new Date(o.createdDate).toLocaleDateString();
    
    if (isRMant02) {
      return [
        o.displayId || '(Nuevo)',
        machine?.name || '-',
        machine?.zone || '-',
        machine?.alias || '-',
        o.maintenanceType || '-',
        o.interval || '-',
        date,
        o.currentStage
      ];
    } else {
      return [
        o.displayId || '(Nuevo)',
        `${machine?.name || '-'} ${machine?.alias ? `(${machine.alias})` : ''}`,
        o.maintenanceType || '-',
        o.department || '-',
        o.failureType || '-',
        date,
        o.currentStage
      ];
    }
  });

  autoTable(doc, {
    startY: 35,
    head: head,
    body: body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 100, 0], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 255, 245] }
  });

  doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};
