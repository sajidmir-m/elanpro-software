import { Router, type IRouter } from "express";
import multer from "multer";
import { db, uploadsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { processExcelUpload } from "../lib/excel-parser";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/uploads", requireAuth, async (req, res): Promise<void> => {
  const uploads = await db.select().from(uploadsTable).orderBy(desc(uploadsTable.uploadedAt));
  const result = uploads.map((u) => ({
    id: u.id,
    filename: u.filename,
    fileType: u.fileType,
    recordCount: u.recordCount,
    uploadedAt: u.uploadedAt?.toISOString() ?? null,
    status: u.status,
    errorMessage: u.errorMessage ?? null,
  }));
  res.json(result);
});

router.post("/uploads", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  const file = req.file;
  const fileType = req.body?.fileType as string | undefined;

  if (!file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const validTypes = ["active_tickets", "closed_tickets", "mrf_data"];
  if (!fileType || !validTypes.includes(fileType)) {
    res.status(400).json({ error: "fileType must be one of: active_tickets, closed_tickets, mrf_data" });
    return;
  }

  // Create upload record first
  const [uploadRecord] = await db
    .insert(uploadsTable)
    .values({
      filename: file.originalname,
      fileType,
      recordCount: 0,
      status: "processing",
    })
    .returning();

  // Immediately return the processing record
  const responseData = {
    id: uploadRecord.id,
    filename: uploadRecord.filename,
    fileType: uploadRecord.fileType,
    recordCount: uploadRecord.recordCount,
    uploadedAt: uploadRecord.uploadedAt?.toISOString() ?? null,
    status: uploadRecord.status,
    errorMessage: uploadRecord.errorMessage ?? null,
  };

  res.status(201).json(responseData);

  // Process asynchronously
  processExcelUpload(file.buffer, fileType, uploadRecord.id).catch((err) => {
    logger.error({ err, uploadId: uploadRecord.id }, "Background upload processing failed");
  });
});

router.delete("/uploads/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  await db.delete(uploadsTable).where(eq(uploadsTable.id, id));
  res.json({ message: "Upload deleted" });
});

export default router;
