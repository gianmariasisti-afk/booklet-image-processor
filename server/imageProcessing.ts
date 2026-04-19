import sharp from "sharp";
import { invokeLLM } from "./_core/llm";

export interface DetectedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  confidence: number;
}

function bufferToBase64DataUrl(buffer: Buffer, mimeType = "image/jpeg"): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function detectImageRegions(imageBuffer: Buffer): Promise<DetectedRegion[]> {
  try {
    const base64Url = bufferToBase64DataUrl(imageBuffer, "image/jpeg");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing scanned booklet pages and identifying visual content regions.
Detect all images, figures, photos, diagrams, and illustrations on the page.
For each detected region, provide normalized coordinates (0-1 scale where 0,0 is top-left and 1,1 is bottom-right).
Return a JSON array ONLY (no other text):
[{"x":0.1,"y":0.2,"width":0.3,"height":0.4,"type":"figure","confidence":0.95}]`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this scanned page and detect all image regions. Return only the JSON array." },
            { type: "image_url", image_url: { url: base64Url } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "detected_regions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              regions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    type: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["x", "y", "width", "height", "type", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["regions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);

    // Try parsing as object with regions key first (tool_use response)
    try {
      const parsed = JSON.parse(contentStr);
      if (parsed && Array.isArray(parsed.regions)) return parsed.regions;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to regex
    }

    const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const regions = JSON.parse(jsonMatch[0]);
    return Array.isArray(regions) ? regions : [];
  } catch (error) {
    console.error("[Image Processing] Error detecting regions:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function cropImageRegion(
  imageBuffer: Buffer,
  region: DetectedRegion
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine image dimensions");
  }

  const x = Math.max(0, Math.round(region.x * metadata.width));
  const y = Math.max(0, Math.round(region.y * metadata.height));
  const width = Math.min(Math.round(region.width * metadata.width), metadata.width - x);
  const height = Math.min(Math.round(region.height * metadata.height), metadata.height - y);

  if (width <= 0 || height <= 0) {
    throw new Error("Invalid crop dimensions");
  }

  return sharp(imageBuffer).extract({ left: x, top: y, width, height }).jpeg().toBuffer();
}

export async function generateImageDescription(
  croppedImageBuffer: Buffer,
  pageImageBuffer?: Buffer,
  pageText?: string
): Promise<{ description: string; contextSummary?: string }> {
  const croppedBase64 = bufferToBase64DataUrl(croppedImageBuffer, "image/jpeg");

  const userContent: any[] = [
    {
      type: "text",
      text: pageText
        ? `This image appears on a page with the following context:\n\n${pageText}\n\nDescribe this cropped image in detail, considering its relationship to the surrounding content.`
        : "Provide a detailed description of this image.",
    },
    { type: "image_url", image_url: { url: croppedBase64 } },
  ];

  if (pageImageBuffer) {
    const pageBase64 = bufferToBase64DataUrl(pageImageBuffer, "image/jpeg");
    userContent.push({ type: "text", text: "Here is the full page for context:" });
    userContent.push({ type: "image_url", image_url: { url: pageBase64 } });
  }

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert at analyzing and describing visual content from scanned documents. Write clear, professional descriptions suitable for archival and retrieval. Be specific about objects, people, charts, diagrams, visible text, colors, and composition.",
      },
      { role: "user", content: userContent },
    ],
  });

  const content = response.choices[0]?.message?.content;
  const description = typeof content === "string" ? content : JSON.stringify(content);
  const contextSummary = pageText ? `Context: ${pageText.substring(0, 200)}...` : undefined;

  return { description, contextSummary };
}

export async function extractPageText(imageBuffer: Buffer): Promise<string> {
  try {
    const base64Url = bufferToBase64DataUrl(imageBuffer, "image/jpeg");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an OCR expert. Extract all visible text from the image. Return only the extracted text, preserving layout where possible.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all text from this image." },
            { type: "image_url", image_url: { url: base64Url } },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === "string" ? content : "";
  } catch (error) {
    console.error("[Image Processing] Error extracting text:", error);
    return "";
  }
}
