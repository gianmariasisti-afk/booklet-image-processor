import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { storagePut, storageGet, storageReadBuffer } from "./storage";
import {
  createUpload,
  getUploadById,
  getUserUploads,
  updateUploadStatus,
  createCroppedImage,
  getCroppedImagesByUploadId,
  createDescription,
  getDescriptionByCroppedImageId,
} from "./db";
import {
  detectImageRegions,
  cropImageRegion,
  generateImageDescription,
  extractPageText,
} from "./imageProcessing";
import { notifyOwner } from "./_core/notification";

export const processingRouter = router({
  uploadBooklet: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        imageBase64: z.string().min(1),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const imageBuffer = Buffer.from(input.imageBase64, "base64");
      const fileSize = imageBuffer.length;

      if (fileSize > 50 * 1024 * 1024) {
        throw new Error("File size exceeds 50MB limit");
      }

      const fileKey = `uploads/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { url: originalImageUrl, key: originalImageKey } = await storagePut(
        fileKey,
        imageBuffer,
        input.mimeType
      );

      const uploadResult = await createUpload({
        userId: ctx.user.id,
        fileName: input.fileName,
        originalImageUrl,
        originalImageKey,
        mimeType: input.mimeType,
        fileSize,
      });

      const uploadId = Number((uploadResult as any).insertId);
      if (!uploadId) throw new Error("Failed to create upload record");

      processBookletAsync(uploadId, originalImageKey, imageBuffer, ctx.user.id).catch((err) => {
        console.error("[Processing] Background processing error:", err);
      });

      return { uploadId, status: "processing", message: "Booklet uploaded. Processing started." };
    }),

  getUpload: protectedProcedure
    .input(z.object({ uploadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const upload = await getUploadById(input.uploadId);
      if (!upload) throw new Error("Upload not found");
      if (upload.userId !== ctx.user.id) throw new Error("Unauthorized");

      const croppedImageRows = await getCroppedImagesByUploadId(input.uploadId);

      const imagesWithDescriptions = await Promise.all(
        croppedImageRows.map(async (img) => {
          const description = await getDescriptionByCroppedImageId(img.id);
          return { ...img, description };
        })
      );

      return { ...upload, croppedImages: imagesWithDescriptions };
    }),

  listUploads: protectedProcedure.query(async ({ ctx }) => {
    return getUserUploads(ctx.user.id);
  }),
});

async function processBookletAsync(
  uploadId: number,
  originalImageKey: string,
  imageBuffer: Buffer,
  userId: number
): Promise<void> {
  try {
    await updateUploadStatus(uploadId, "processing");

    const pageText = await extractPageText(imageBuffer);
    const regions = await detectImageRegions(imageBuffer);

    console.log(`[Processing] Detected ${regions.length} regions in upload ${uploadId}`);

    await updateUploadStatus(uploadId, "processing", { totalImagesDetected: regions.length });

    let processedCount = 0;

    for (const region of regions) {
      try {
        const croppedBuffer = await cropImageRegion(imageBuffer, region);

        const croppedKey = `cropped/${uploadId}/${Date.now()}-${region.type}.jpg`;
        const { url: croppedImageUrl, key: croppedImageKey } = await storagePut(croppedKey, croppedBuffer, "image/jpeg");

        const croppedResult = await createCroppedImage({
          uploadId,
          croppedImageUrl,
          croppedImageKey,
          detectionConfidence: region.confidence.toString(),
          regionCoordinates: { x: region.x, y: region.y, width: region.width, height: region.height },
          imageType: region.type,
        });

        const croppedImageId = Number((croppedResult as any).insertId);

        const { description, contextSummary } = await generateImageDescription(
          croppedBuffer,
          imageBuffer,
          pageText
        );

        await createDescription({ croppedImageId, uploadId, description, contextSummary });

        processedCount++;
      } catch (regionError) {
        console.error(`[Processing] Error processing region:`, regionError);
      }
    }

    await updateUploadStatus(uploadId, "completed", { totalImagesProcessed: processedCount });

    const upload = await getUploadById(uploadId);
    await notifyOwner({
      title: "Booklet Processing Complete",
      content: `"${upload?.fileName}" processed. Detected and described ${processedCount} images.`,
    });

    console.log(`[Processing] Upload ${uploadId} complete. Processed ${processedCount} images.`);
  } catch (error) {
    console.error(`[Processing] Error processing upload ${uploadId}:`, error);
    await updateUploadStatus(uploadId, "failed", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
