import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

    pdfContainer.innerHTML = `
      <div style="margin-bottom: 25px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px;">
          <div style="flex: 1;">
            ${invoice.organization?.settings?.logoUrl ? `<img src="${invoice.organization.settings.logoUrl}" style="max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 10px; display: block;" />` : ""}
            <h1 style="font-size: 26px; font-weight: bold; margin: 0 0 6px 0; color: #111; letter-spacing: 0.5px;">PACKING LIST</h1>
            <div style="font-size: 13px; line-height: 1.5; color: #333;">
              <div style="font-weight: bold;">${invoice.organization?.name || "Company"}</div>
              ${invoice.organization?.settings?.email ? `<div>${invoice.organization.settings.email}</div>` : ""}
              ${invoice.organization?.settings?.phone ? `<div>${invoice.organization.settings.phone}</div>` : ""}
              ${orgAddressLines.map((line) => `<div>${line}</div>`).join("")}
            </div>
          </div>
          <div style="flex: 1; text-align: right; font-size: 13px; line-height: 1.6;">
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 6px;">Ref: PL-${invoice.number?.replace(/^INV-/, "") || invoice.number}</div>
            <div style="margin-bottom: 4px;"><strong>Invoice #:</strong> ${invoice.number}</div>
            ${invoice.poNumber ? `<div style="margin-bottom: 4px;"><strong>PO #:</strong> ${invoice.poNumber}</div>` : ""}
            ${invoice.salesRep ? `<div style="margin-bottom: 4px;"><strong>Sales Rep:</strong> ${invoice.salesRep}</div>` : ""}
            <div><strong>Date:</strong> ${invoice.date ? new Date(invoice.date).toLocaleDateString() : new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 25px;">
        <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px;">
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; letter-spacing: 0.5px;">Bill To:</div>
          <div style="font-size: 13px; line-height: 1.5; font-weight: 600; color: #111;">${invoice.customer?.name || "-"}</div>
          ${invoice.customer?.email ? `<div style="font-size: 12px; color: #4b5563;">${invoice.customer.email}</div>` : ""}
          ${billingLines.map((line) => `<div style="font-size: 12px; color: #4b5563;">${line}</div>`).join("")}
        </div>
        <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px;">
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; letter-spacing: 0.5px;">Ship / Deliver To:</div>
          ${invoice.shipTo ? `
            <div style="font-size: 12px; line-height: 1.5; color: #111; white-space: pre-wrap;">${invoice.shipTo}</div>
          ` : `
            <div style="font-size: 13px; line-height: 1.5; font-weight: 600; color: #111;">${invoice.customer?.name || "-"}</div>
            ${shippingLines.length > 0 ? shippingLines.map((line) => `<div style="font-size: 12px; color: #4b5563;">${line}</div>`).join("") : billingLines.map((line) => `<div style="font-size: 12px; color: #4b5563;">${line}</div>`).join("")}
          `}
        </div>
      </div>

      ${invoice.sideMark ? `
        <div style="margin-bottom: 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #92400e; margin-bottom: 3px;">Side Mark / Jobsite Identifier:</div>
          <div style="font-size: 13px; color: #78350f; font-family: monospace; white-space: pre-wrap;">${invoice.sideMark}</div>
        </div>
      ` : ""}

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background: #111827; color: #ffffff;">
            <th style="text-align: left; padding: 10px 12px; font-weight: 600; font-size: 12px; width: 120px; border-radius: 4px 0 0 0;">Item / SKU</th>
            <th style="text-align: left; padding: 10px 12px; font-weight: 600; font-size: 12px;">Product & Description</th>
            <th style="text-align: right; padding: 10px 12px; font-weight: 600; font-size: 12px; width: 120px;">Quantity</th>
            <th style="text-align: center; padding: 10px 12px; font-weight: 600; font-size: 12px; width: 80px; border-radius: 0 4px 0 0;">Checked</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || [])
            .map(
              (item: any, idx: number) => `
            <tr style="border-bottom: 1px solid #e5e7eb; background: ${idx % 2 === 0 ? "#ffffff" : "#f9fafb"};">
              <td style="padding: 10px 12px; font-weight: 600; font-size: 13px; vertical-align: top;">
                ${item.product?.sku || "-"}
              </td>
              <td style="padding: 10px 12px; vertical-align: top;">
                <div style="font-weight: 600; font-size: 13px; color: #111;">${item.description}</div>
              </td>
              <td style="text-align: right; padding: 10px 12px; font-weight: bold; font-size: 14px; vertical-align: top;">
                ${Number(item.quantity || 0).toLocaleString()}
              </td>
              <td style="text-align: center; padding: 10px 12px; vertical-align: middle;">
                <div style="display: inline-block; width: 16px; height: 16px; border: 1.5px solid #9ca3af; border-radius: 3px;"></div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      ${invoice.notes ? `
        <div style="margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; background: #ffffff;">
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Delivery / Handling Instructions:</div>
          <div style="font-size: 12px; color: #374151; white-space: pre-wrap;">${invoice.notes}</div>
        </div>
      ` : ""}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #9ca3af;">
        <div style="display: flex; justify-content: space-between; gap: 40px;">
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 30px;">Dispatched / Picked By:</div>
            <div style="border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7280;">
              <span>Signature</span>
              <span>Date</span>
            </div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 30px;">Received in Good Condition By:</div>
            <div style="border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7280;">
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

    pdf.save(`Packing-List-${invoice.number}.pdf`);
  } catch (error) {
    if (pdfContainer.parentNode) {
      pdfContainer.parentNode.removeChild(pdfContainer);
    }
    console.error("Error generating Packing List PDF:", error);
    alert(`Failed to generate Packing List: ${error instanceof Error ? error.message : String(error)}`);
  }
}
