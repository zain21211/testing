import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Smart decimal: shows decimals only when they exist (10 → "10", 10.5 → "10.5")
const formatSmartDecimal = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";
  return num % 1 === 0 ? num.toString() : num.toString();
};

const formatDate = (value) => {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

export const downloadInvoice = async ({ docNum, acid, name, userData }) => {
  if (!docNum) {
    throw new Error("Invalid Document Number.");
  }

  const timestamp = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  // fileName will be set after API data is received, using DB values

  try {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/report/generate-report`, {
      reportName: 'invoiceReportData',
      parameters: { DocNumber: docNum }
    });

    const invoiceData = response.data;
    if (!invoiceData || invoiceData.length === 0) {
      throw new Error("No data found for this invoice.");
    }

    const doc = new jsPDF();
    const firstRow = invoiceData[0];

    // Use acid and customer name from DB data (always correct, not stale caller data)
    const realAcid = firstRow.id || acid;
    const realName = firstRow.Subsidary || name || "Customer";
    const fileName = `Invoice_${realAcid}_${realName.replace(/\s+/g, '_')}_${docNum}_${new Date().getTime()}.pdf`;

    // Header - Business Info
    doc.setFontSize(27);
    doc.setTextColor(26, 35, 126);
    doc.setFont("helvetica", "bold");
    doc.text("Ahmad International", 105, 20, { align: "center" });

    doc.setFontSize(17);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Sales Invoice", 105, 30, { align: "center" });

    // Customer Info Box
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.5);
    doc.line(6, 35, 204, 35);

    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");

    // Left Column
    doc.text(`Customer:`, 6, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.id || acid} - ${firstRow.Subsidary || name}`, 27, 45);

    doc.setFont("helvetica", "bold");
    doc.text(`Address:`, 6, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.OAddress || "N/A"}`, 27, 52);

    doc.setFont("helvetica", "bold");
    doc.text(`Phone:`, 6, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.OCell || "N/A"}`, 27, 59);

    doc.setFont("helvetica", "bold");
    doc.text(`Route:`, 6, 66);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.ROUTE || "N/A"}`, 27, 66);

    // Right Column
    doc.text(`Invoice No:`, 130, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.DoC || docNum}`, 155, 45);

    doc.setFont("helvetica", "bold");
    doc.text(`Date:`, 130, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.Date ? formatDate(firstRow.Date) : "N/A"}`, 155, 52);

    doc.setFont("helvetica", "bold");
    doc.text(`SPO:`, 130, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.SPO || "N/A"}`, 155, 59);

    doc.setFont("helvetica", "bold");
    doc.text(`Print Date:`, 130, 66);
    doc.setFont("helvetica", "normal");
    doc.text(`${timestamp}`, 155, 66);

    // Table Data
    let totalGross = 0;
    let totalDiscpAmount = 0;

    const hasFOC = invoiceData.some(item => (item.Qty || 0) !== 0 && Number(String(item.SchPc || 0).split(',')[0]) > 0);
    const hasDiscP2 = invoiceData.some(item => (item.Qty || 0) !== 0 && (item.DiscP2 || 0) > 0);

    const tableColumn = ["S.No", "Product Name", "Qty"];
    if (hasFOC) tableColumn.push("FOC");
    tableColumn.push("Rate");
    if (hasDiscP2) tableColumn.push("Disc");
    tableColumn.push("Amount");

    const tableRows = invoiceData
      .filter(item => (item.Qty || 0) !== 0)
      .map((item, index) => {
        const qty = item.Qty || 0;
        const rate = item.Rate || 0;
        const discP2 = item.DiscP2 || 0;
        const subtotal = rate * qty;
        const calculatedAmount = subtotal - (subtotal * discP2 / 100);

        totalGross += calculatedAmount;
        totalDiscpAmount += (item.Discount || 0);

        let company = String(item.company || "").trim();
        let category = String(item.category || "").trim();
        let name = String(item.Name || "").trim();

        // Handle duplicates like "race,race" in company
        company = Array.from(new Set(company.split(/[, ]+/))).join(' ');

        // Deduplicate all words in company, name, and category
        const fullName = `${company} ${name} ${category}`
            .replace(/[,]/g, ' ')
            .split(/\s+/)
            .filter((word, idx, arr) => word && arr.findIndex(w => w.toLowerCase() === word.toLowerCase()) === idx)
            .join(' ')
            .trim();

        const productDisplay = item.Urduname ? `${fullName}\n\n ` : fullName;

        const rowData = [
            index + 1,
            productDisplay,
            qty
        ];
        
        if (hasFOC) rowData.push(String(item.SchPc || 0).split(',')[0]);
        rowData.push(formatCurrency(rate));
        if (hasDiscP2) rowData.push(formatSmartDecimal(item.DiscP2 || 0));
        rowData.push(formatCurrency(calculatedAmount));

        return {
          data: rowData,
          urdu: item.Urduname
        };
      });

    autoTable(doc, {
      startY: 75,
      head: [tableColumn],
      body: tableRows.map(r => r.data),
      theme: 'grid',
      headStyles: {
        fillColor: [26, 35, 126],
        textColor: 255,
        fontSize: 12,
        halign: 'center',
        fontStyle: 'bold'
      },
      columnStyles: (() => {
        let colIndex = 0;
        const styles = {};
        styles[colIndex++] = { halign: 'center', cellWidth: 11 }; // S.No
        styles[colIndex++] = { halign: 'left' };                  // Product Name (auto, gets all remaining width)
        styles[colIndex++] = { halign: 'center', cellWidth: 18 }; // Qty
        if (hasFOC) styles[colIndex++] = { halign: 'center', cellWidth: 12 }; // FOC
        styles[colIndex++] = { halign: 'right', cellWidth: 17 };  // Rate
        if (hasDiscP2) styles[colIndex++] = { halign: 'right', cellWidth: 16 }; // Disc
        styles[colIndex++] = { halign: 'right', cellWidth: 27 };  // Amount
        return styles;
      })(),
      styles: { fontSize: 11, cellPadding: 3.5, minCellHeight: 19 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      margin: { left: 6, right: 6, bottom: 20 },
      didDrawCell: (data) => {
        if (data.column.index === 1 && data.cell.section === 'body') {
          const urduText = tableRows[data.row.index]?.urdu;
          if (urduText) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const fontSize = 40;
            ctx.font = `${fontSize}px 'Jameel Noori Nastaleeq'`;
            const textWidth = ctx.measureText(urduText).width;

            canvas.width = textWidth + 20;
            canvas.height = fontSize + 20;

            ctx.font = `${fontSize}px 'Jameel Noori Nastaleeq'`;
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'black';
            ctx.fillText(urduText, 10, canvas.height / 2);

            const imgData = canvas.toDataURL('image/png');
            const imgHeight = 7;
            const ratio = canvas.width / canvas.height;
            const imgWidth = imgHeight * ratio;

            const finalWidth = Math.min(imgWidth, data.cell.width - 4);
            doc.addImage(imgData, 'PNG', data.cell.x + data.cell.width - finalWidth - 2, data.cell.y + data.cell.height - imgHeight - 1, finalWidth, imgHeight);
          }
        }
      },
      didDrawPage: (data) => {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Generated on ${timestamp} | Printed by ${userData?.username || "System"} | Page ${data.pageNumber}`, 105, 285, { align: "center" });
      }
    });

    // Footer Calculations
    const summaryBoxHeight = 60; // height of the summary block
    const pageHeight = doc.internal.pageSize.getHeight();
    let finalY = doc.lastAutoTable.finalY + 10;
    // If summary won't fit on current page, push to a new page
    if (finalY + summaryBoxHeight > pageHeight - 18) {
      doc.addPage();
      finalY = 20;
    }
    const summaryWidth = 80;
    const startX = 204 - summaryWidth;

    const preBal = firstRow.PreBal || 0;
    const netAmount = firstRow.amount || 0;
    const totalPayable = preBal + netAmount;

    const hasExtra    = totalDiscpAmount !== 0;
    const hasFreight  = Math.abs(firstRow.Freight || 0) !== 0;
    const rowSpacing  = 8; // px between each summary row
    const rowCount    = 3 + (hasExtra ? 1 : 0) + (hasFreight ? 1 : 0); // Gross + optional + Net + PrevBal + Total
    const dynSummaryH = 14 + rowCount * rowSpacing + 6; // header(14) + rows + padding(6)

    // Redraw the box with the correct dynamic height
    doc.setFillColor(248, 249, 250);
    doc.rect(startX - 5, finalY - 5, summaryWidth + 10, dynSummaryH, 'F');
    doc.setDrawColor(200);
    doc.rect(startX - 5, finalY - 5, summaryWidth + 10, dynSummaryH, 'S');

    doc.setFontSize(13);
    doc.setTextColor(26, 35, 126);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE SUMMARY", startX, finalY + 2);

    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.3);
    doc.line(startX, finalY + 4, startX + summaryWidth, finalY + 4);

    const drawSummaryRow = (label, value, y, color = [0, 0, 0], isBold = false) => {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(label, startX, y);

      doc.setTextColor(color[0], color[1], color[2]);
      if (isBold) doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(value), startX + summaryWidth, y, { align: "right" });
    };

    // Dynamic Y cursor — rows only added when they have a value
    let curY = finalY + 11;
    drawSummaryRow("Gross Amount:", totalGross, curY);         curY += rowSpacing;
    if (hasExtra)   { drawSummaryRow("Extra:",   totalDiscpAmount,                  curY, [211, 47, 47]); curY += rowSpacing; }
    if (hasFreight) { drawSummaryRow("Freight:", Math.abs(firstRow.Freight || 0),   curY);                curY += rowSpacing; }
    drawSummaryRow("Net Amount:",       netAmount,    curY, [26, 35, 126], true);  curY += rowSpacing;
    drawSummaryRow("Previous Balance:", preBal,       curY);                        curY += rowSpacing;
    drawSummaryRow("Total Payable:",    totalPayable, curY, [26, 35, 126], true);

    // Save and auto-open in new tab
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    doc.save(fileName);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return true;
  } catch (err) {
    console.error("Invoice PDF download failed:", err);
    throw err;
  }
};
