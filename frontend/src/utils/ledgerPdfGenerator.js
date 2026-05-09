import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateLedgerPdf = (rows, summary, customerName, dateRange, acid, apiUrl) => {
  try {
    if (!rows || rows.length === 0) {
      console.warn("No rows to generate PDF");
      return;
    }
    
    const doc = new jsPDF("p", "mm", "a4");
    const { totalDebit, totalCredit, openingBalance, closingBalance } = summary;
    const { startDate, endDate } = dateRange;

    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    };

    // 1. Header
    doc.setFontSize(22);
    doc.setTextColor(25, 118, 210); // MUI Primary Blue
    doc.text("AHMAD INTERNATIONAL", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Customer Ledger Statement", 105, 30, { align: "center" });

    // 2. Info Section
    doc.setFontSize(11);
    doc.text(`Customer: ${customerName}`, 14, 45);
    doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate || new Date())}`, 14, 52);
    doc.text(`Generated: ${formatDate(new Date())} ${new Date().toLocaleTimeString()}`, 14, 59);

    const increasedAmount = closingBalance > openingBalance ? closingBalance - openingBalance : 0;

    // 3. Summary Table (Small)
    const summaryHead = ["Opening Balance", "Total Debit", "Total Credit", "Closing Balance"];
    const summaryBody = [
      openingBalance.toLocaleString(),
      totalDebit.toLocaleString(),
      totalCredit.toLocaleString(),
      closingBalance.toLocaleString()
    ];

    if (increasedAmount > 0) {
      summaryHead.push("Increased Amount");
      summaryBody.push(increasedAmount.toLocaleString());
    }

    autoTable(doc, {
      startY: 65,
      head: [summaryHead],
      body: [summaryBody],
      theme: 'grid',
      headStyles: { fillColor: [0, 128, 128], textColor: 255, fontStyle: 'bold' }, // Ocean Green (Teal)
      styles: { halign: 'center' },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === (increasedAmount > 0 ? 4 : -1)) {
          data.cell.styles.fillColor = [211, 47, 47]; // Red background
          data.cell.styles.textColor = [255, 255, 255]; // White text
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // 4. Main Ledger Table
    const tableData = rows.map(row => [
      formatDate(row.Date),
      row.Doc || "N/A",
      row.Narration || "",
      row.Debit ? Number(row.Debit).toLocaleString() : "0",
      row.Credit ? Number(row.Credit).toLocaleString() : "0",
      row.Total ? Number(row.Total).toLocaleString() : "0"
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Date", "Doc", "Narration", "Debit", "Credit", "Balance"]],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 12 },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontSize: 13 },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 20 }, // Doc
        2: { cellWidth: 'auto' }, // Narration
        3: { cellWidth: 25, halign: 'right' }, // Debit
        4: { cellWidth: 25, halign: 'right' }, // Credit
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } // Balance
      },
      margin: { left: 14, right: 14 },didDrawPage: (data) => {
        // Footer
        doc.setFontSize(10);
        doc.text(
          `Page ${data.pageNumber}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const todayStr = formatDate(now);
    const filename = `${acid} Ledger Statement ${customerName} ${todayStr} ${timeStr}.pdf`.replace(/[\\/:*?"<>|]/g, '_');

    const pdfData = doc.output('datauristring');
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${apiUrl}/ledger/download-pdf`;
    form.target = '_blank';
    form.style.display = 'none';

    const pdfInput = document.createElement('input');
    pdfInput.name = 'pdfData';
    pdfInput.value = pdfData;
    form.appendChild(pdfInput);

    const fileInput = document.createElement('input');
    fileInput.name = 'filename';
    fileInput.value = filename;
    form.appendChild(fileInput);

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
        document.body.removeChild(form);
    }, 1000);
    
    console.log("PDF sent to backend for download:", filename);
  } catch (err) {
    console.error("PDF Generation Error:", err);
  }
};
