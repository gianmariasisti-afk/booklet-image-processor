import { describe, it, expect } from "vitest";
import { detectImageRegions, generateImageDescription } from "./imageProcessing";

describe("Image Processing Pipeline", () => {
  describe("detectImageRegions", () => {
    it("should return array of detected regions", async () => {
      const mockImageUrl = "https://example.com/image.jpg";
      const regions = await detectImageRegions(mockImageUrl);

      expect(Array.isArray(regions)).toBe(true);
      regions.forEach((region) => {
        expect(region).toHaveProperty("x");
        expect(region).toHaveProperty("y");
        expect(region).toHaveProperty("width");
        expect(region).toHaveProperty("height");
        expect(region).toHaveProperty("type");
        expect(region).toHaveProperty("confidence");
      });
    });

    it("should validate region coordinates are within bounds", async () => {
      const mockImageUrl = "https://example.com/image.jpg";
      const regions = await detectImageRegions(mockImageUrl);

      regions.forEach((region) => {
        expect(region.x).toBeGreaterThanOrEqual(0);
        expect(region.y).toBeGreaterThanOrEqual(0);
        expect(region.width).toBeGreaterThan(0);
        expect(region.height).toBeGreaterThan(0);
        expect(region.confidence).toBeGreaterThan(0);
        expect(region.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("should handle empty detection results", async () => {
      const mockImageUrl = "https://example.com/blank.jpg";
      const regions = await detectImageRegions(mockImageUrl);

      expect(Array.isArray(regions)).toBe(true);
    });
  });

  describe("generateImageDescription", () => {
    it(
      "should return description object with required fields",
      async () => {
        const mockImageUrl = "https://example.com/cropped.jpg";
        const mockContext = "This is a technical diagram showing system architecture";

        const description = await generateImageDescription(mockImageUrl, undefined, mockContext);

        expect(description).toHaveProperty("description");
        expect(typeof description.description).toBe("string");
        expect(description.description.length).toBeGreaterThan(0);
      },
      { timeout: 15000 }
    );

    it(
      "should generate descriptions with context awareness",
      async () => {
        const mockImageUrl = "https://example.com/cropped.jpg";
        const mockContext = "Figure 3: Network topology diagram";

        const description = await generateImageDescription(mockImageUrl, undefined, mockContext);

        expect(description.description).toBeDefined();
      },
      { timeout: 15000 }
    );

    it(
      "should handle missing context gracefully",
      async () => {
        const mockImageUrl = "https://example.com/cropped.jpg";

        const description = await generateImageDescription(mockImageUrl, undefined, "");

        expect(description).toHaveProperty("description");
        expect(description.description.length).toBeGreaterThan(0);
      },
      { timeout: 15000 }
    );
  });
});
