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
  const fileName = `${acid}_${(name || "Customer").replace(/\s+/g, '_')}_${docNum}_${new Date().getTime()}.pdf`;

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

    // Header - Business Info
    doc.setFontSize(25);
    doc.setTextColor(26, 35, 126);
    doc.setFont("helvetica", "bold");
    doc.text("Ahmad International", 105, 20, { align: "center" });

    doc.setFontSize(15);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Sales Invoice", 105, 28, { align: "center" });

    // Customer Info Box
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");

    // Left Column
    doc.text(`Customer:`, 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.id || acid} - ${firstRow.Subsidary || name}`, 35, 45);

    doc.setFont("helvetica", "bold");
    doc.text(`Address:`, 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.OAddress || "N/A"}`, 35, 52);

    doc.setFont("helvetica", "bold");
    doc.text(`Phone:`, 14, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.OCell || "N/A"}`, 35, 59);

    doc.setFont("helvetica", "bold");
    doc.text(`Route:`, 14, 66);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.ROUTE || "N/A"}`, 35, 66);

    // Right Column
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice No:`, 120, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.DoC || docNum}`, 145, 45);

    doc.setFont("helvetica", "bold");
    doc.text(`Date:`, 120, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.Date ? formatDate(firstRow.Date) : "N/A"}`, 145, 52);

    doc.setFont("helvetica", "bold");
    doc.text(`SPO:`, 120, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`${firstRow.SPO || "N/A"}`, 145, 59);

    doc.setFont("helvetica", "bold");
    doc.text(`Print Date:`, 120, 66);
    doc.setFont("helvetica", "normal");
    doc.text(`${timestamp}`, 145, 66);

    // Table Data
    let totalGross = 0;
    let totalDiscpAmount = 0;

    const tableColumn = ["S.No", "Code", "Product Name", "Qty", "FOC", "Rate", "DiscP2", "Amount"];
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

        if (category.toLowerCase() === company.toLowerCase()) category = "";
        if (name.toLowerCase().startsWith(company.toLowerCase())) name = name.substring(company.length).trim();

        const fullName = `${company} ${name} ${category}`.replace(/\s+/g, ' ').trim();
        const productDisplay = item.Urduname ? `${fullName}\n\n ` : fullName;

        return {
          data: [
            index + 1,
            item.ProductCode || "",
            productDisplay,
            qty,
            String(item.SchPc || 0).split(',')[0],
            formatCurrency(rate),
            formatCurrency(item.DiscP2 || 0),
            formatCurrency(calculatedAmount)
          ],
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
        fontSize: 10,
        halign: 'center',
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'left' },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 25 },
      },
      styles: { fontSize: 9, cellPadding: 2, minCellHeight: 16 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      margin: { bottom: 20 },
      didDrawCell: (data) => {
        if (data.column.index === 2 && data.cell.section === 'body') {
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
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated on ${timestamp} | Printed by ${userData?.username || "System"} | Page ${data.pageNumber}`, 105, 285, { align: "center" });
      }
    });

    // Footer Calculations
    const finalY = doc.lastAutoTable.finalY + 10;
    const summaryWidth = 80;
    const startX = 200 - summaryWidth - 14;

    const preBal = firstRow.PreBal || 0;
    const netAmount = firstRow.amount || 0;
    const totalPayable = preBal + netAmount;

    doc.setFillColor(248, 249, 250);
    doc.rect(startX - 5, finalY - 5, summaryWidth + 10, 55, 'F');
    doc.setDrawColor(200);
    doc.rect(startX - 5, finalY - 5, summaryWidth + 10, 55, 'S');

    doc.setFontSize(11);
    doc.setTextColor(26, 35, 126);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE SUMMARY", startX, finalY + 2);

    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.3);
    doc.line(startX, finalY + 4, startX + summaryWidth, finalY + 4);

    const drawSummaryRow = (label, value, y, color = [0, 0, 0], isBold = false) => {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(label, startX, y);

      doc.setTextColor(color[0], color[1], color[2]);
      if (isBold) doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(value), startX + summaryWidth, y, { align: "right" });
    };

    drawSummaryRow("Gross Amount:", totalGross, finalY + 11);
    drawSummaryRow("Extra:", totalDiscpAmount, finalY + 17, [211, 47, 47]);
    drawSummaryRow("Freight:", Math.abs(firstRow.Freight || 0), finalY + 23);
    drawSummaryRow("Net Amount:", netAmount, finalY + 29, [26, 35, 126], true);
    drawSummaryRow("Previous Balance:", preBal, finalY + 35);
    drawSummaryRow("Total Payable:", totalPayable, finalY + 41, [26, 35, 126], true);

    doc.save(fileName);
    return true;
  } catch (err) {
    console.error("Invoice PDF download failed:", err);
    throw err;
  }
};
