import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { extractSqftPerBox, calculateFlooringBoxes } from "./flooring-calculator";

export async function downloadPackingListPDF(invoice: any) {
  if (!invoice) return;

  // Create hidden container for PDF generation
  const pdfContainer = document.createElement("div");
  pdfContainer.style.position = "fixed";
  pdfContainer.style.left = "0";
  pdfContainer.style.top = "0";
  pdfContainer.style.zIndex = "-9999";
  pdfContainer.style.width = "210mm";
  pdfContainer.style.padding = "20mm";
  pdfContainer.style.backgroundColor = "white";
  pdfContainer.style.fontFamily = "Arial, sans-serif";
  pdfContainer.style.fontSize = "12px";
  pdfContainer.style.color = "black";
  document.body.appendChild(pdfContainer);

  try {
    // Build billing address lines
    const billingLines: string[] = [];
    if (invoice.customer?.billingAddress) {
      const addr = invoice.customer.billingAddress;
      if (addr.street) billingLines.push(addr.street);
      const cityStateZip = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
      if (cityStateZip) billingLines.push(cityStateZip);
      if (addr.country) billingLines.push(addr.country);
    }

    // Build shipping address lines (fallback to billing if not present)
    const shippingLines: string[] = [];
    const shipAddr = invoice.customer?.shippingAddress || invoice.customer?.billingAddress;
    if (shipAddr) {
      if (shipAddr.street) shippingLines.push(shipAddr.street);
      const cityStateZip = [shipAddr.city, shipAddr.state, shipAddr.zip].filter(Boolean).join(", ");
      if (cityStateZip) shippingLines.push(cityStateZip);
      if (shipAddr.country) shippingLines.push(shipAddr.country);
    }

    // Build organization address lines
    const orgAddressLines: string[] = [];
    if (invoice.organization?.settings && typeof invoice.organization.settings === "object") {
      const orgAddr = invoice.organization.settings.address;
      if (orgAddr) {
        if (orgAddr.street) orgAddressLines.push(orgAddr.street);
        const orgCityStateZip = [orgAddr.city, orgAddr.state, orgAddr.zip].filter(Boolean).join(", ");
        if (orgCityStateZip) orgAddressLines.push(orgCityStateZip);
        if (orgAddr.country) orgAddressLines.push(orgAddr.country);
      }
    }

    // Compute line items and total boxes
    let totalBoxesCount = 0;
    let totalSqftCount = 0;
    let hasFlooringItems = false;

    const processedItems = (invoice.items || []).map((item: any) => {
      const sqftPerBox =
        item.sqftPerBox ||
        extractSqftPerBox(item.product?.sqftPerBox || item.product?.description || item.description);
      
      const qtyNum = Number(item.quantity || 0);
      let boxesNum: number = item.boxes ? Number(item.boxes) : qtyNum;
      let lineSqft: number = qtyNum;

      if (sqftPerBox && sqftPerBox > 0) {
        hasFlooringItems = true;
        boxesNum = item.boxes ? Number(item.boxes) : qtyNum;
        lineSqft = parseFloat((boxesNum * sqftPerBox).toFixed(2));
        totalBoxesCount += boxesNum;
        totalSqftCount += lineSqft;
      } else {
        totalSqftCount += qtyNum;
      }

      return {
        ...item,
        sqftPerBox,
        boxes: boxesNum,
        lineSqft,
        unit: item.product?.unit || (sqftPerBox ? "sqft" : "pcs"),
      };
    });

    pdfContainer.innerHTML = `
      <div style="margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 2px solid #000; padding-bottom: 14px;">
          <div style="flex: 1;">
            ${invoice.organization?.settings?.logoUrl ? `<img src="${invoice.organization.settings.logoUrl}" style="max-height: 55px; max-width: 200px; object-fit: contain; margin-bottom: 8px; display: block;" />` : ""}
            <h1 style="font-size: 26px; font-weight: 800; margin: 0 0 4px 0; color: #111; letter-spacing: 0.5px;">PACKING LIST</h1>
            <div style="font-size: 12px; line-height: 1.45; color: #333;">
              <div style="font-weight: bold; font-size: 13px;">${invoice.organization?.name || "Company"}</div>
              ${invoice.organization?.settings?.email ? `<div>${invoice.organization.settings.email}</div>` : ""}
              ${invoice.organization?.settings?.phone ? `<div>${invoice.organization.settings.phone}</div>` : ""}
              ${orgAddressLines.map((line) => `<div>${line}</div>`).join("")}
            </div>
          </div>
          <div style="flex: 1; text-align: right; font-size: 12px; line-height: 1.55;">
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 4px; color: #111827;">Ref: PL-${invoice.number?.replace(/^(INV|EST)-/, "") || invoice.number}</div>
            <div style="margin-bottom: 3px;"><strong>${invoice.number?.startsWith("EST") ? "Estimate / Quote #:" : "Invoice #:"}</strong> ${invoice.number}</div>
            ${invoice.poNumber ? `<div style="margin-bottom: 3px;"><strong>PO #:</strong> ${invoice.poNumber}</div>` : ""}
            ${invoice.salesRep ? `<div style="margin-bottom: 3px;"><strong>Sales Rep:</strong> ${invoice.salesRep}</div>` : ""}
            <div><strong>Date:</strong> ${invoice.date ? new Date(invoice.date).toLocaleDateString() : new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px;">
        <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; letter-spacing: 0.5px;">Bill To:</div>
          <div style="font-size: 12px; line-height: 1.4; font-weight: 600; color: #111;">${invoice.customer?.name || "-"}</div>
          ${invoice.customer?.email ? `<div style="font-size: 11px; color: #4b5563;">${invoice.customer.email}</div>` : ""}
          ${billingLines.map((line) => `<div style="font-size: 11px; color: #4b5563;">${line}</div>`).join("")}
        </div>
        <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; letter-spacing: 0.5px;">Ship / Deliver To:</div>
          ${invoice.shipTo ? `
            <div style="font-size: 11px; line-height: 1.4; color: #111; white-space: pre-wrap; font-weight: 500;">${invoice.shipTo}</div>
          ` : `
            <div style="font-size: 12px; line-height: 1.4; font-weight: 600; color: #111;">${invoice.customer?.name || "-"}</div>
            ${shippingLines.length > 0 ? shippingLines.map((line) => `<div style="font-size: 11px; color: #4b5563;">${line}</div>`).join("") : billingLines.map((line) => `<div style="font-size: 11px; color: #4b5563;">${line}</div>`).join("")}
          `}
        </div>
      </div>

      ${invoice.sideMark ? `
        <div style="margin-bottom: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #92400e; margin-bottom: 2px;">Side Mark / Jobsite Identifier:</div>
          <div style="font-size: 12px; color: #78350f; font-family: monospace; font-weight: 600; white-space: pre-wrap;">${invoice.sideMark}</div>
        </div>
      ` : ""}

      <!-- Packing Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #111827; color: #ffffff;">
            <th style="text-align: left; padding: 10px 12px; font-weight: 700; font-size: 11px; width: 120px; border-radius: 4px 0 0 0;">SKU / Code</th>
            <th style="text-align: left; padding: 10px 12px; font-weight: 700; font-size: 11px;">Item Description</th>
            <th style="text-align: right; padding: 10px 12px; font-weight: 700; font-size: 11px; width: 130px;">Total Quantity</th>
            <th style="text-align: center; padding: 10px 8px; font-weight: 700; font-size: 11px; width: 70px; border-radius: 0 4px 0 0;">Checked</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || [])
            .map(
              (item: any, idx: number) => `
            <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? "#ffffff" : "#f9fafb"};">
              <td style="padding: 10px 12px; font-weight: 600; font-size: 12px; vertical-align: middle; font-family: monospace;">
                ${item.product?.sku || "-"}
              </td>
              <td style="padding: 10px 12px; vertical-align: middle;">
                <div style="font-weight: 600; font-size: 12px; color: #111;">${item.description}</div>
              </td>
              <td style="text-align: right; padding: 10px 12px; font-weight: 700; font-size: 13px; color: #111; vertical-align: middle;">
                ${Number(item.quantity || 0).toLocaleString()}
              </td>
              <td style="text-align: center; padding: 10px 8px; vertical-align: middle;">
                <div style="display: inline-block; width: 16px; height: 16px; border: 1.5px solid #9ca3af; border-radius: 3px;"></div>
              </td>
            </tr>
          `
            )
            .join("")}
          <!-- Total Summary Table Row -->
          <tr style="background: #f3f4f6; border-top: 2px solid #111827; border-bottom: 2px solid #111827;">
            <td colspan="2" style="padding: 10px 12px; font-weight: 800; font-size: 12px; text-transform: uppercase; color: #111827;">
              Total
            </td>
            <td style="text-align: right; padding: 10px 12px; font-weight: 900; font-size: 14px; color: #111827;">
              ${(invoice.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0).toLocaleString()}
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>

      ${invoice.notes ? `
        <div style="margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; background: #ffffff;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 3px;">Delivery / Handling Instructions:</div>
          <div style="font-size: 11px; color: #374151; white-space: pre-wrap;">${invoice.notes}</div>
        </div>
      ` : ""}

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px dashed #9ca3af;">
        <div style="display: flex; justify-content: space-between; gap: 36px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 26px;">Dispatched / Picked By:</div>
            <div style="border-bottom: 1px solid #000; margin-bottom: 4px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #6b7280;">
              <span>Warehouse Signature</span>
              <span>Date</span>
            </div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 26px;">Received in Good Condition By:</div>
            <div style="border-bottom: 1px solid #000; margin-bottom: 4px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #6b7280;">
              <span>Recipient / Driver Signature</span>
              <span>Date</span>
            </div>
          </div>
        </div>
      </div>
    `;

    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(pdfContainer, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: pdfContainer.scrollWidth,
      windowHeight: pdfContainer.scrollHeight,
    });

    if (pdfContainer.parentNode) {
      pdfContainer.parentNode.removeChild(pdfContainer);
    }

    const imgData = canvas.toDataURL("image/jpeg", 0.8);
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const imgPdfHeight = pdfWidth / ratio;
    let heightLeft = imgPdfHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgPdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`PackingList-${invoice.number}.pdf`);
  } catch (error) {
    console.error("Error generating packing list PDF:", error);
    if (pdfContainer.parentNode) {
      pdfContainer.parentNode.removeChild(pdfContainer);
    }
    alert(`Failed to generate Packing List: ${error instanceof Error ? error.message : String(error)}`);
  }
}
