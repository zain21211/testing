import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper: Render Urdu text to a high-quality image using a hidden canvas
const renderUrduToImage = async (text, fontSize = 24) => {
  return new Promise((resolve) => {
    // Wait for fonts to load properly
    document.fonts.ready.then(() => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      // Measure with the Urdu font
      ctx.font = `bold ${fontSize}px "Jameel Noori Nastaleeq", serif`;
      const metrics = ctx.measureText(text);
      
      // Scale canvas for better resolution in PDF
      const scale = 2;
      const w = metrics.width + 10;
      const h = fontSize * 1.5;
      
      canvas.width = w * scale;
      canvas.height = h * scale;
      
      ctx.scale(scale, scale);
      ctx.font = `bold ${fontSize}px "Jameel Noori Nastaleeq", serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.direction = "rtl";
      
      // Fill with black text
      ctx.fillStyle = "#000000";
      ctx.fillText(text, (canvas.width / scale) - 2, (canvas.height / scale) / 2);
      
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width: w,
        height: h,
        ratio: w / h
      });
    });
  });
};

export const generateInvoicePdf = async (invoiceData, acid, userType, apiUrl) => {
  try {
    const { Customer, Products } = invoiceData || {};

    // ── Guard: must have products ──────────────────────────────────────────────
    if (!Products || Products.length === 0) {
      console.warn("No products found in invoice");
      alert("No products found to generate PDF.");
      return;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    const safe = (val, fallback = "") => String(val ?? fallback);

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    };

    const safeNum = (val) => {
      // Strips commas so "1,000" → 1000, handles undefined/null/NaN
      const n = Number(String(val ?? "0").replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const formatCurrency = (val) =>
      safeNum(val).toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

    // ── Build PDF ──────────────────────────────────────────────────────────────
    const doc = new jsPDF("p", "mm", "a4");

    // 1. HEADER — Left customer info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Name:", 14, 20);
    doc.text("Code:", 14, 26);
    doc.text("Address:", 14, 32);
    doc.text("Contact:", 14, 38);

    doc.setFontSize(12); // Increased from default
    doc.setFont("helvetica", "normal");
    const custName = safe(Customer?.CustomerName);
    const urduName = safe(Customer?.UrduName);
    
    const truncatedName = doc.getTextWidth(custName) > 90 
      ? doc.splitTextToSize(custName, 90)[0] + "..." 
      : custName;
    
    doc.text(truncatedName, 35, 20);
    if (urduName) {
      // Render Urdu name as image
      const urdu = await renderUrduToImage(urduName, 52); // Increased from 48
      // Use fixed height (10mm) and calculate width to prevent stretching
      const displayH = 10;
      const displayW = urdu.ratio * displayH;
      doc.addImage(urdu.dataUrl, "PNG", 35, 21, displayW, displayH, undefined, "FAST");
    }
    
    doc.text(safe(acid),                            35, 29);
    doc.text(safe(Customer?.Address, "FAISALABAD"), 35, 35);
    doc.text(safe(Customer?.Number), 35, 41);

    // 1b. HEADER — Right info box
    doc.setFillColor(240, 240, 240);
    doc.rect(130, 14, 66, 14, "F");

    doc.setFontSize(13); // Increased from 11
    doc.setFont("helvetica", "bold");
    doc.text("Invoice #:", 132, 20);
    doc.text("Bill Date:", 132, 26);
    
    doc.setFont("helvetica", "normal");
    doc.text(safe(Customer?.InvoiceNumber), 196, 20, { align: "right" });
    doc.text(formatDate(Customer?.InvoiceDate), 196, 26, { align: "right" });

    // Print timestamp centred under the box
    const now = new Date();
    const timeString = now.toLocaleString("en-US", {
      hour: "numeric", minute: "numeric", second: "numeric", hour12: true,
    });
    doc.setFontSize(9);
    doc.text("Print Date & Time", 163, 33, { align: "center" });
    doc.text(`${formatDate(now)} ${timeString}`, 163, 38, { align: "center" });

    if (Customer?.Description) {
      doc.text(safe(Customer.Description), 163, 43, { align: "center" });
    }

    doc.line(14, 46, 196, 46); // separator

    // 2. ITEMS TABLE
    const tableHead = [["Product Description", "Pcs", "FOC", "Rate", "Disc(%)", "Amount"]];
    let totalPcs = 0;

    // Filter out rows with qty=0
    const filteredProducts = Products.filter(row => safeNum(row.BQ) > 0);

    // Pre-render all Urdu product names to avoid async issues in autoTable
    const urduProductImgs = await Promise.all(
      filteredProducts.map(row => row.UrduProductName ? renderUrduToImage(row.UrduProductName, 40) : Promise.resolve(null))
    );

    const tableBody = filteredProducts.map((row) => {
      const pcs = safeNum(row.BQ);
      const foc = safeNum(row.FOC); // Explicit mapped name
      const rate = safeNum(row.suggestedRate ?? row.Price);
      const disc = safeNum(row.DiscP); // Explicit mapped name
      const amount = safeNum(row.Amount);

      totalPcs += pcs;

      // Format: company - name category
      const company = safe(row.company).trim();
      const name = safe(row.Name || row.Product).trim();
      const category = safe(row.category).trim();
      
      const productName = `${company ? company + " - " : ""}${name}${category ? " " + category : ""}`.toUpperCase();

      return [
        productName,
        pcs > 0 ? pcs : "0",
        foc > 0 ? foc : "—",
        rate > 0 ? rate.toFixed(2) : "0.00",
        disc > 0 ? `${disc}%` : "—",
        formatCurrency(amount),
      ];
    });

    autoTable(doc, {
      startY: 49,
      margin: { left: 10, right: 10 },
      head: tableHead,
      body: tableBody,
      theme: "striped",
      styles: {
        fontSize: 11, // Reduced from 12
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
      },
      headStyles: {
        fontStyle: "bold",
        fillColor: [44, 62, 80], // Modern Deep Slate Blue
        textColor: 255,
        halign: "center",
        fontSize: 13,
      },
      columnStyles: {
        0: { cellWidth: 70, halign: "left", minCellHeight: 22 }, 
        1: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 15, halign: "center" }, // FOC
        3: { cellWidth: 25, halign: "right" },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      didDrawCell: (data) => {
        // Drawing Urdu names using pre-rendered images (Sync)
        if (data.column.index === 0 && data.section === "body") {
          const urdu = urduProductImgs[data.row.index];
          if (urdu) {
            // Right-align Urdu text within the column
            const displayH = 8.5;
            const displayW = urdu.ratio * displayH;
            
            // Dynamic Y positioning: Find how many lines the English name takes
            const cellText = data.cell.text || [];
            const textLines = Array.isArray(cellText) ? cellText.length : 1;
            const textHeight = textLines * (data.cell.styles.fontSize / 2.835); // Convert pt to mm approx
            
            // Calculate X to align right (with small margin)
            const x = data.cell.x + data.cell.width - displayW - 3;
            // Place below English text with some padding
            const y = data.cell.y + textHeight + 5; 
            
            doc.addImage(urdu.dataUrl, "PNG", x, y, displayW, displayH, undefined, "FAST");
          }
        }
      },
      didParseCell: (data) => {
        if (data.section === "head") {
          data.cell.styles.lineWidth = { top: 0.5, bottom: 0.5 };
        }
      },
      didDrawPage: (data) => {
        // Page number footer
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Page ${data.pageNumber}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 8
        );
      },
    });

    const finalY = doc.lastAutoTable.finalY + 5;

    // 3. SUMMARY SECTION
    doc.setFontSize(15); // Increased from 13
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total No. of Items:      ${filteredProducts.length} / ${filteredProducts.length}`,
      14,
      finalY
    );
    doc.text(`${totalPcs}   Pcs`, 115, finalY, { align: "right" });

    // Right summary block
    const summaryX = 125; // Pulled back from 135 to avoid merging
    let cy = finalY;

    const summaryRow = (label, value, highlight = false) => {
      doc.setFontSize(15);
      if (highlight) {
        doc.setFillColor(0, 0, 0);
        doc.rect(summaryX - 2, cy - 4, 75, 7, "F"); // Slightly wider box
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(0, 0, 0);
      }
      doc.setFont("helvetica", "bold");
      doc.text(label, summaryX, cy);
      doc.text(value, 196, cy, { align: "right" });
      doc.setTextColor(0, 0, 0);
      cy += 7.5; // Slightly more vertical space
    };

    const freight = Math.abs(safeNum(Customer?.Freight)); 
    // Calculate Amount directly from product VIST sum for perfect accuracy
    const sumOfVist = filteredProducts.reduce((acc, p) => acc + safeNum(p.Amount), 0);
    const invoiceAmount = sumOfVist; 
    
    const extraDiscount = safeNum(Customer?.ExtraDiscount);
    const prevBalance = safeNum(Customer?.PreBal);
    const received = safeNum(Customer?.Received);
    const billAmount = invoiceAmount + freight - extraDiscount; 
    const totalBalance = billAmount + prevBalance - received;

    summaryRow("Amount", formatCurrency(invoiceAmount));
    if (freight > 0) summaryRow("Freight", formatCurrency(freight));
    if (extraDiscount !== 0) summaryRow("Add / Less:", formatCurrency(extraDiscount));
    
    summaryRow("Bill Amount:", formatCurrency(billAmount), true);  // black highlight
    
    if (prevBalance !== 0) {
      summaryRow("Previous Balance:", formatCurrency(prevBalance));
      if (received > 0) summaryRow("Received:", formatCurrency(received));
      summaryRow("Net Balance:", formatCurrency(totalBalance));
    }

    // 4. FOOTER — phone number (placed at bottom center to avoid overlap)
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("0330-8581600", 105, doc.internal.pageSize.height - 25, { align: "center" });

    // ── Submit to backend ──────────────────────────────────────────────────────
    // Sanitize filename: Strip non-ASCII characters (like Urdu) to avoid server/OS errors
    const sanitizeFilename = (str) => 
      str.replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII
         .replace(/[\\/:*?"<>|]/g, "_") // Remove illegal characters
         .replace(/\s+/g, " ") // Clean up spaces
         .trim();

    const filename = `${safe(acid)} ${safe(Customer?.InvoiceNumber)} ${sanitizeFilename(safe(Customer?.CustomerName)) || "Invoice"}.pdf`;

    // Build PDF data BEFORE touching the DOM — if this throws, catch handles it
    const pdfData = doc.output("datauristring");

    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = `${protocol}//${hostname}:3001/api/ledger/download-pdf`;
    form.target = "_blank";
    form.style.display = "none";

    const pdfInput = document.createElement("input");
    pdfInput.name = "pdfData";
    pdfInput.value = pdfData;
    form.appendChild(pdfInput);

    const fileInput = document.createElement("input");
    fileInput.name = "filename";
    fileInput.value = filename;
    form.appendChild(fileInput);

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => document.body.removeChild(form), 1000);

    console.log("Invoice PDF sent to backend for download:", filename);
  } catch (err) {
    console.error("Invoice PDF Generation Error:", err);
    alert("Failed to generate PDF: " + err.message);
  }
};
