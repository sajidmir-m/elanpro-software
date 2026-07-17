import { Router, type IRouter } from "express";
import multer from "multer";
import { getServiceClient, formatUpload, type UploadRow } from "@workspace/supabase";
import { requireAuth, requireUploadAccess } from "../lib/auth";
import { processExcelUpload } from "../lib/excel-parser";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.get("/uploads", requireAuth, requireUploadAccess, async (_req, res): Promise<void> => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json((data as UploadRow[]).map(formatUpload));
});

router.post(
  "/uploads",
  requireAuth,
  requireUploadAccess,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const file = req.file;
    const fileType = req.body?.fileType as string | undefined;

    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const validTypes = ["active_tickets", "closed_tickets", "mrf_data", "sales_data"];
    if (!fileType || !validTypes.includes(fileType)) {
      res.status(400).json({
        error: "fileType must be one of: active_tickets, closed_tickets, mrf_data, sales_data",
      });
      return;
    }

    const supabase = getServiceClient();
    const { data: uploadRecord, error } = await supabase
      .from("uploads")
      .insert({
        filename: file.originalname,
        file_type: fileType,
        record_count: 0,
        status: "processing",
        uploaded_by: req.currentUser!.id,
      })
      .select("*")
      .single();

    if (error || !uploadRecord) {
      res.status(500).json({ error: error?.message ?? "Failed to create upload record" });
      return;
    }

    res.status(201).json(formatUpload(uploadRecord as UploadRow));

    processExcelUpload(file.buffer, fileType, uploadRecord.id).catch((err) => {
      logger.error({ err, uploadId: uploadRecord.id }, "Background upload processing failed");
    });
  },
);

router.delete("/uploads/:id", requireAuth, requireUploadAccess, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const supabase = getServiceClient();

  const { error } = await supabase.from("uploads").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: "Upload deleted" });
});

export default router;
