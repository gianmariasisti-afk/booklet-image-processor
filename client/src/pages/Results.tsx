import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type Region = { x: number; y: number; width: number; height: number };

function parseRegion(raw: unknown): Region {
  if (!raw) return { x: 0, y: 0, width: 1, height: 1 };
  if (typeof raw === "string") {
    try {
      return parseRegion(JSON.parse(raw));
    } catch {
      return { x: 0, y: 0, width: 1, height: 1 };
    }
  }
  const r = raw as Partial<Region>;
  return {
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    width: Number(r.width ?? 1),
    height: Number(r.height ?? 1),
  };
}

export default function Results() {
  const { uploadId } = useParams<{ uploadId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

  const uploadQuery = trpc.processing.getUpload.useQuery(
    { uploadId: parseInt(uploadId || "0") },
    { enabled: isAuthenticated && !!uploadId }
  );

  const utils = trpc.useUtils();
  const updateCaption = trpc.processing.updateCaption.useMutation({
    onSuccess: () => utils.processing.getUpload.invalidate({ uploadId: parseInt(uploadId || "0") }),
  });
  const updateCropRegion = trpc.processing.updateCropRegion.useMutation({
    onSuccess: () => utils.processing.getUpload.invalidate({ uploadId: parseInt(uploadId || "0") }),
  });

  const [captionDraft, setCaptionDraft] = useState("");
  const [regionDraft, setRegionDraft] = useState<Region>({ x: 0, y: 0, width: 1, height: 1 });

  if (!isAuthenticated) {
    return <div className="text-center py-8">Please log in</div>;
  }

  if (uploadQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-lg text-black font-bold">Loading results...</p>
      </div>
    );
  }

  const upload = uploadQuery.data;
  if (!upload) {
    return <div className="text-center py-8">Upload not found</div>;
  }

  const selectedImage = selectedImageId
    ? upload.croppedImages?.find((img) => img.id === selectedImageId)
    : null;

  const selectImage = (image: NonNullable<typeof selectedImage>) => {
    setSelectedImageId(image.id);
    setCaptionDraft(image.caption ?? "");
    setRegionDraft(parseRegion(image.regionCoordinates));
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-black">
        <div className="container py-12 flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-gray-100 border border-black"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-5xl font-bold text-black mb-2">Results</h1>
            <p className="text-lg text-gray-700">{upload.fileName}</p>
          </div>
        </div>
      </div>

      <div className="container py-16">
        {!upload.croppedImages || upload.croppedImages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-gray-600 mb-4">No images detected</p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-black text-white border border-black hover:bg-gray-900 px-8 py-3 font-bold"
            >
              Upload Another
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* Original Image */}
            <div className="col-span-12 lg:col-span-6 border border-black p-6">
              <h2 className="text-xl font-bold text-black mb-4">Original Page</h2>
              <img
                src={upload.originalImageUrl}
                alt="Original booklet page"
                className="w-full border border-black"
              />
            </div>

            {/* Thumbnails Grid */}
            <div className="col-span-12 lg:col-span-6">
              <h2 className="text-xl font-bold text-black mb-4">
                Detected Images ({upload.croppedImages.length})
              </h2>
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {upload.croppedImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => selectImage(image)}
                    className={`border-2 p-2 transition-colors text-left ${
                      selectedImageId === image.id
                        ? "border-red-600 bg-gray-100"
                        : "border-black hover:bg-gray-50"
                    }`}
                  >
                    <img
                      src={image.croppedImageUrl}
                      alt={`Cropped ${image.imageType}`}
                      className="w-full aspect-square object-cover"
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center capitalize">
                      {image.imageType}
                    </p>
                    {image.caption && (
                      <p className="text-xs text-gray-700 mt-1 italic line-clamp-2">
                        {image.caption}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail View */}
            {selectedImage && (
              <div className="col-span-12 border-2 border-red-600 p-8">
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-12 md:col-span-5">
                    <img
                      src={selectedImage.croppedImageUrl}
                      alt={`Cropped ${selectedImage.imageType}`}
                      className="w-full border border-black"
                    />
                    <p className="text-xs text-gray-600 mt-4">
                      Confidence: {Math.round(parseFloat(selectedImage.detectionConfidence) * 100)}%
                    </p>

                    {/* Crop region editor */}
                    <div className="mt-6 border border-black p-4">
                      <h4 className="text-sm font-bold text-black mb-3 uppercase">
                        Adjust Crop Region
                      </h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Normalized coordinates (0–1). Apply to re-crop from the original page.
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {(["x", "y", "width", "height"] as const).map((k) => (
                          <label key={k} className="text-xs text-black">
                            <span className="block mb-1 uppercase">{k}</span>
                            <input
                              type="number"
                              step={0.01}
                              min={0}
                              max={1}
                              value={regionDraft[k]}
                              onChange={(e) =>
                                setRegionDraft((r) => ({ ...r, [k]: Number(e.target.value) }))
                              }
                              className="w-full border border-black px-2 py-1 text-sm"
                            />
                          </label>
                        ))}
                      </div>
                      <Button
                        disabled={updateCropRegion.isPending}
                        onClick={() =>
                          updateCropRegion.mutate({
                            croppedImageId: selectedImage.id,
                            region: regionDraft,
                          })
                        }
                        className="bg-black text-white border border-black hover:bg-gray-900 px-4 py-2 font-bold text-xs w-full"
                      >
                        {updateCropRegion.isPending ? "Re-cropping..." : "Apply & Re-crop"}
                      </Button>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-7">
                    <h3 className="text-2xl font-bold text-black mb-4 capitalize">
                      {selectedImage.imageType}
                    </h3>

                    {/* Caption editor */}
                    <h4 className="text-sm font-bold text-black mb-2 uppercase">Caption</h4>
                    <textarea
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      rows={3}
                      placeholder="No caption detected. Add one here."
                      className="w-full border border-black p-3 mb-2 text-sm leading-relaxed italic"
                    />
                    <div className="flex gap-2 mb-6">
                      <Button
                        disabled={updateCaption.isPending}
                        onClick={() =>
                          updateCaption.mutate({
                            croppedImageId: selectedImage.id,
                            caption: captionDraft,
                          })
                        }
                        className="bg-black text-white border border-black hover:bg-gray-900 px-4 py-2 font-bold text-xs"
                      >
                        {updateCaption.isPending ? "Saving..." : "Save Caption"}
                      </Button>
                      <Button
                        onClick={() => setCaptionDraft(selectedImage.caption ?? "")}
                        className="bg-white text-black border border-black hover:bg-gray-100 px-4 py-2 font-bold text-xs"
                      >
                        Reset
                      </Button>
                    </div>

                    {selectedImage.description && (
                      <>
                        <h4 className="text-sm font-bold text-black mb-2 uppercase">Description</h4>
                        <p className="text-gray-700 mb-6 leading-relaxed">
                          {selectedImage.description.description}
                        </p>
                      </>
                    )}
                    {selectedImage.description?.contextSummary && (
                      <>
                        <h4 className="text-sm font-bold text-black mb-2 uppercase">Context</h4>
                        <p className="text-gray-600 text-sm mb-6">
                          {selectedImage.description.contextSummary}
                        </p>
                      </>
                    )}
                    <Button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = selectedImage.croppedImageUrl;
                        link.download = `${selectedImage.imageType}-${selectedImage.id}.jpg`;
                        link.click();
                      }}
                      className="bg-black text-white border border-black hover:bg-gray-900 px-6 py-2 font-bold text-sm"
                    >
                      Download Image
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="col-span-12 flex gap-4 justify-center pt-8">
              <Button
                onClick={() => setLocation("/")}
                className="bg-white text-black border-2 border-black hover:bg-gray-100 px-8 py-3 font-bold"
              >
                Upload Another
              </Button>
              <Button
                onClick={() => setLocation("/history")}
                className="bg-black text-white border border-black hover:bg-gray-900 px-8 py-3 font-bold"
              >
                View History
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
