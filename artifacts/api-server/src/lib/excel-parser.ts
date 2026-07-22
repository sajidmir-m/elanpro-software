import xlsx from "xlsx";
import { getServiceClient, keysToSnake } from "@workspace/supabase";
import { logger } from "./logger";
import { invalidateDataCache, type CachedTable } from "./data-cache";

type DataTable = "active_tickets" | "closed_tickets" | "mrf_data" | "sales_data";

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const cleaned = String(v).replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Pick the sheet that actually holds row-level extract data.
 * Many exports put a pivot summary on Sheet1 and the real tickets on a later
 * sheet (e.g. "tickets") — reading only SheetNames[0] ingested 38 pivot rows
 * instead of 771 ticket rows.
 */
function scoreDataSheet(rows: Record<string, unknown>[], fileType: string): number {
  if (!rows.length) return -1;
  const keys = Object.keys(rows[0] ?? {});
  const keySet = new Set(keys);
  let score = rows.length;

  const looksLikePivot =
    keys.some((k) => /^count of/i.test(k)) ||
    keys.some((k) => k === "__EMPTY" || k.startsWith("__EMPTY_")) ||
    (keys.length <= 4 && !keySet.has("Ticket ID") && !keySet.has("Product"));
  if (looksLikePivot) score -= 100_000;

  if (fileType === "sales_data") {
    if (keySet.has("Product")) score += 50_000;
    if (keySet.has("Quantity") || keySet.has("Sales") || keySet.has("Sales Qty")) score += 10_000;
  } else if (fileType === "mrf_data") {
    if (keySet.has("Ticket ID") || keySet.has("MRF No.")) score += 50_000;
  } else {
    if (keySet.has("Ticket ID")) score += 50_000;
    if (keySet.has("Ticket Status")) score += 10_000;
  }

  return score;
}

function parseRows(buffer: Buffer, fileType: string): Record<string, unknown>[] {
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });
  let bestRows: Record<string, unknown>[] = [];
  let bestScore = -1;
  let bestName = wb.SheetNames[0] ?? "";

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false }) as Record<
      string,
      unknown
    >[];
    const score = scoreDataSheet(rows, fileType);
    if (score > bestScore) {
      bestScore = score;
      bestRows = rows;
      bestName = name;
    }
  }

  if (wb.SheetNames.length > 1) {
    logger.info({ fileType, sheet: bestName, rows: bestRows.length }, "Selected Excel data sheet");
  }

  return bestRows;
}

function mapSharedTicketFields(row: Record<string, unknown>, uploadId: number) {
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
    components: str(row["Components"]),
    reOpenTicket: str(row["ReOpen Ticket"]),
    repeatTicket: str(row["Repeat Ticket"]),
    freeOfCost: str(row["Free Of Cost"]),
    paymentType: str(row["Payment Type"]),
    territoryCategory: str(row["Territory Category"]),
  };
}

function mapActiveTicket(row: Record<string, unknown>, uploadId: number) {
  return mapSharedTicketFields(row, uploadId);
}

function mapClosedTicket(row: Record<string, unknown>, uploadId: number) {
  return {
    ...mapSharedTicketFields(row, uploadId),
    paymentValue: num(row["Payment Value"]),
    closureRemarks: str(row["Closure Remarks"]),
    closureComments: str(row["Closure Comments"]),
    technicianClosedDate: str(row["Technician Closed Date"]),
    partiallyClosedByEcp: str(row["Partially Closed By ECP"]),
    partiallyClosedDate: str(row["Partially Closed Date"]),
    partiallyClosedByAshRsh: str(row["Partially Closed By ASH/RSH"]),
    closedFrom: str(row["Closed From"]),
    closedDate: str(row["Closed Date"]),
    totalDuration: str(row["Total Duration"]),
    tatMinutes: num(row["TAT(min)"]),
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
    npcApproval: str(row["NPC Approval"]),
    dispatchFrom: str(row["Dispatch From"]),
    dispatchDate: str(row["Dispatch Date"]),
    courierName: str(row["Courier Name"]),
    docketNo: str(row["Docket No"]),
    deliveryDate: str(row["Delivery Date"]),
    orgStockApprovedQty: num(row["Organization Stock Approved Quantity"]) ?? 0,
    ownStockApprovedQty: num(row["Own Stock Approved Quantity"]) ?? 0,
  };
}

function mapSalesData(row: Record<string, unknown>, uploadId: number) {
  return {
    uploadId,
    product: str(row["Product"]),
    category: str(row["Category"]),
    state: str(row["State"]),
    servicePartnerName: str(row["Service Partner Name"]) ?? str(row["Service Partner"]),
    periodMonth: str(row["Month"]) ?? str(row["Period"]) ?? str(row["Period Month"]),
    quantity: num(row["Quantity"]) ?? num(row["Sales"]) ?? num(row["Sales Qty"]) ?? 0,
  };
}

async function replaceTableData(
  table: DataTable,
  mapped: Record<string, unknown>[],
  uploadId: number,
): Promise<void> {
  const supabase = getServiceClient();

  for (const ch of chunk(mapped, 500)) {
    const { error } = await supabase.from(table).insert(ch);
    if (error) throw new Error(error.message);
  }

  const { error: clearError } = await supabase
    .from(table)
    .delete()
    .neq("upload_id", uploadId);
  if (clearError) throw new Error(clearError.message);
}

/**
 * When a Closed extract arrives, drop matching Active rows so Live Ops only
 * keeps tickets that are still open. Do NOT run this after an Active upload —
 * otherwise the Active sheet total (e.g. 705) is silently reduced and no longer
 * matches the uploaded file / Excel pivot.
 */
async function removeClosedTicketsFromActive(): Promise<void> {
  const supabase = getServiceClient();
  const ticketIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("closed_tickets")
      .select("ticket_id")
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data) {
      const ticketId = String(row.ticket_id ?? "").trim();
      if (ticketId) ticketIds.add(ticketId);
    }
    if (data.length < 1000) break;
    offset += 1000;
  }

  for (const ids of chunk([...ticketIds], 500)) {
    const { error } = await supabase.from("active_tickets").delete().in("ticket_id", ids);
    if (error) throw new Error(error.message);
  }
}

export async function processExcelUpload(
  buffer: Buffer,
  fileType: string,
  uploadId: number,
): Promise<number> {
  const supabase = getServiceClient();
  const rows = parseRows(buffer, fileType);

  if (rows.length === 0) {
    await supabase
      .from("uploads")
      .update({ status: "failed", error_message: "No data rows found in file" })
      .eq("id", uploadId);
    return 0;
  }

  try {
    if (fileType === "active_tickets") {
      await replaceTableData(
        "active_tickets",
        rows.map((r) => keysToSnake(mapActiveTicket(r, uploadId))),
        uploadId,
      );
      // Keep the Active extract intact so status pivots match the uploaded sheet.
    } else if (fileType === "closed_tickets") {
      await replaceTableData(
        "closed_tickets",
        rows.map((r) => keysToSnake(mapClosedTicket(r, uploadId))),
        uploadId,
      );
      await removeClosedTicketsFromActive();
    } else if (fileType === "mrf_data") {
      await replaceTableData(
        "mrf_data",
        rows.map((r) => keysToSnake(mapMrfData(r, uploadId))),
        uploadId,
      );
    } else if (fileType === "sales_data") {
      await replaceTableData(
        "sales_data",
        rows.map((r) => keysToSnake(mapSalesData(r, uploadId))),
        uploadId,
      );
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    await supabase
      .from("uploads")
      .update({ status: "completed", record_count: rows.length, error_message: null })
      .eq("id", uploadId);

    // Drop in-memory snapshots so the next dashboard request reloads fresh rows.
    const touched: CachedTable[] =
      fileType === "active_tickets"
        ? ["active_tickets"]
        : fileType === "closed_tickets"
          ? ["closed_tickets", "active_tickets"]
          : fileType === "mrf_data"
            ? ["mrf_data"]
            : fileType === "sales_data"
              ? ["sales_data"]
              : [];
    invalidateDataCache(touched.length ? touched : undefined);

    return rows.length;
  } catch (err) {
    logger.error({ err, uploadId }, "Error processing upload");

    const table: DataTable | null =
      fileType === "active_tickets" ||
      fileType === "closed_tickets" ||
      fileType === "mrf_data" ||
      fileType === "sales_data"
        ? fileType
        : null;
    if (table) {
      await supabase.from(table).delete().eq("upload_id", uploadId);
    }

    await supabase
      .from("uploads")
      .update({ status: "failed", error_message: String(err) })
      .eq("id", uploadId);
    throw err;
  }
}
