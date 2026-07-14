import xlsx from "xlsx";
import { db, activeTicketsTable, closedTicketsTable, mrfDataTable, uploadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function parseRows(buffer: Buffer): Record<string, unknown>[] {
  const wb = xlsx.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];
}

function mapActiveTicket(row: Record<string, unknown>, uploadId: number) {
  return {
    uploadId,
    ticketId: str(row["Ticket ID"]) ?? "",
    createdOn: str(row["Created On"]),
    customerType: str(row["Customer Type"]),
    customerCategory: str(row["Customer Category"]),
    customerName: str(row["Customer Name"]),
    city: str(row["City"]),
    state: str(row["State"]),
    rsh: str(row["Reporting Manager"]),
    rshEmail: str(row["Reporting Manager E-Mail"]),
    servicePartnerName: str(row["Service Partner Name"]),
    servicePartnerEmail: str(row["Service Partner E-Mail"]),
    ash: str(row["Representative"]),
    ashPhone: str(row["Representative Ph.No"]),
    category: str(row["Category"]),
    product: str(row["Product"]),
    serialNumber: str(row["Serial Number"]),
    support: str(row["Support"]),
    supportType: str(row["Support Type"]),
    invoiceDate: str(row["Invoice Date"]),
    invoiceNumber: str(row["Invoice Number"]),
    installationDate: str(row["Installation Date"]),
    territoryType: str(row["Territory Type"]),
    ticketType: str(row["Ticket Type"]),
    serviceType: str(row["Service Type"]),
    problemDescription: str(row["Problem Description"]),
    ticketPriority: str(row["Ticket Priority"]),
    ticketStatus: str(row["Ticket Status"]),
    wipSubStage: str(row["WIP Sub Stage"]),
    wipSubStageDate: str(row["WIP Sub Stage Date"]),
    lastAction: str(row["Last Action"]),
    ticketTerritory: str(row["Ticket Territory"]),
    components: str(row["Components"]) ?? str(JSON.stringify(row["Components"])),
    reOpenTicket: str(row["ReOpen Ticket"]),
    repeatTicket: str(row["Repeat Ticket"]),
    freeOfCost: str(row["Free Of Cost"]),
    paymentType: str(row["Payment Type"]),
    territoryCategory: str(row["Territory Category"]),
  };
}

function mapClosedTicket(row: Record<string, unknown>, uploadId: number) {
  const base = mapActiveTicket(row, uploadId);
  return {
    ...base,
    paymentValue: row["Payment Value"] != null ? String(row["Payment Value"]) : undefined,
    closureRemarks: str(row["Closure Remarks"]),
    closureComments: str(row["Closure Comments"]),
    technicianClosedDate: str(row["Technician Closed Date"]),
    partiallyClosedByEcp: str(row["Partially Closed By ECP"]),
    partiallyClosedDate: str(row["Partially Closed Date"]),
    partiallyClosedByAshRsh: str(row["Partially Closed By ASH/RSH"]),
    closedFrom: str(row["Closed From"]),
    closedDate: str(row["Closed Date"]),
    totalDuration: str(row["Total Duration"]),
    tatMinutes: row["TAT(min)"] != null ? String(row["TAT(min)"]) : undefined,
    distanceTravelled: str(row["Distance Travelled(m)"]),
    closureType: str(row["Closure Type"]),
    serviceReportNumber: str(row["Service Report Number"]),
    ticketClosedBy: str(row["Ticket Closed By"]),
    consumedComponents: str(row["Consumed Components"]),
  };
}

function mapMrfData(row: Record<string, unknown>, uploadId: number) {
  return {
    uploadId,
    ticketId: str(row["Ticket ID"]) ?? "",
    createdOn: str(row["Created On"]),
    customerName: str(row["Customer Name"]),
    state: str(row["State"]),
    rsh: str(row["Reporting Manager"]),
    rshEmail: str(row["Reporting Manager E-Mail"]),
    servicePartnerName: str(row["Service Partner Name"]),
    ash: str(row["Representative"]),
    category: str(row["Category"]),
    product: str(row["Product"]),
    supportType: str(row["Support Type"]),
    ticketType: str(row["Ticket Type"]),
    mrfNo: str(row["MRF No."]),
    mrfCreatedDate: str(row["MRF Created Date"]),
    componentName: str(row["Component Name"]),
    partCode: str(row["Part Code"]),
    description: str(row["Description"]),
    quantity: num(row["Quantity"]) ?? 0,
    remarks: str(row["Remarks"]),
    componentToBeIssuedFrom: str(row["Component To Be Issued From"]),
    dispatchTo: str(row["Dispatch To"]),
    dispatchCity: str(row["Dispatch City"]),
    dispatchState: str(row["Dispatch State"]),
    contactName: str(row["Contact Name"]),
    contactNumber: str(row["Contact Number"]),
    mrfStatus: str(row["MRF Status"]),
    mrfRequestedBy: str(row["MRF Requested By"]),
    ashApprovedDate: str(row["ASH Approved Date"]),
    approvedBy: str(row["Approved By"]),
    approvedDate: str(row["Approved Date"]),
    dispatchFrom: str(row["Dispatch From"]),
    dispatchDate: str(row["Dispatch Date"]),
    courierName: str(row["Courier Name"]),
    docketNo: str(row["Docket No"]),
    deliveryDate: str(row["Delivery Date"]),
    orgStockApprovedQty: num(row["Organization Stock Approved Quantity"]) ?? 0,
    ownStockApprovedQty: num(row["Own Stock Approved Quantity"]) ?? 0,
  };
}

export async function processExcelUpload(
  buffer: Buffer,
  fileType: string,
  uploadId: number,
): Promise<number> {
  const rows = parseRows(buffer);

  if (rows.length === 0) {
    await db
      .update(uploadsTable)
      .set({ status: "failed", errorMessage: "No data rows found in file" })
      .where(eq(uploadsTable.id, uploadId));
    return 0;
  }

  try {
    if (fileType === "active_tickets") {
      const mapped = rows.map((r) => mapActiveTicket(r, uploadId));
      // Clear old records for this upload before inserting
      await db.delete(activeTicketsTable).where(eq(activeTicketsTable.uploadId, uploadId));
      for (const ch of chunk(mapped, 500)) {
        await db.insert(activeTicketsTable).values(ch);
      }
    } else if (fileType === "closed_tickets") {
      const mapped = rows.map((r) => mapClosedTicket(r, uploadId));
      await db.delete(closedTicketsTable).where(eq(closedTicketsTable.uploadId, uploadId));
      for (const ch of chunk(mapped, 500)) {
        await db.insert(closedTicketsTable).values(ch);
      }
    } else if (fileType === "mrf_data") {
      const mapped = rows.map((r) => mapMrfData(r, uploadId));
      await db.delete(mrfDataTable).where(eq(mrfDataTable.uploadId, uploadId));
      for (const ch of chunk(mapped, 500)) {
        await db.insert(mrfDataTable).values(ch);
      }
    }

    await db
      .update(uploadsTable)
      .set({ status: "completed", recordCount: rows.length })
      .where(eq(uploadsTable.id, uploadId));

    return rows.length;
  } catch (err) {
    logger.error({ err, uploadId }, "Error processing upload");
    await db
      .update(uploadsTable)
      .set({ status: "failed", errorMessage: String(err) })
      .where(eq(uploadsTable.id, uploadId));
    throw err;
  }
}
