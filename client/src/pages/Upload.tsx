import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Upload() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.processing.uploadBooklet.useMutation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black mb-4">Booklet Image Processor</h1>
          <p className="text-lg text-gray-600 mb-8">Please log in to continue</p>
        </div>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = (e.target?.result as string).split(",")[1];
        try {
          const result = await uploadMutation.mutateAsync({
            fileName: file.name,
            imageBase64: base64String,
            mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
          });
          toast.success("Booklet uploaded successfully! Processing started.");
          setLocation(`/processing/${result.uploadId}`);
        } catch (error) {
          toast.error("Failed to upload booklet. Please try again.");
          console.error("Upload error:", error);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Error processing file");
      setIsUploading(false);
    }
  };

  const bgClass = isDragging ? "bg-gray-100" : "bg-white";

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-black">
        <div className="container py-12">
          <h1 className="text-5xl font-bold text-black mb-2">Upload Booklet</h1>
          <p className="text-lg text-gray-700">Scan and process your booklet pages</p>
        </div>
      </div>

      <div className="container py-16">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8">
             <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-black p-16 text-center transition-colors ${bgClass}`}
            >
              <div className="mb-6">
                <div className="inline-block w-16 h-16 bg-red-600 mb-4"></div>
              </div>
              <h2 className="text-2xl font-bold text-black mb-2">Drag and drop your image</h2>
              <p className="text-gray-700 mb-6">or click to select a file</p>
              <p className="text-sm text-gray-600 mb-8">JPG, PNG, or WebP • Max 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-black text-white border border-black hover:bg-gray-900 px-8 py-3 font-bold"
              >
                {isUploading ? "Uploading..." : "Select File"}
              </Button>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="border-l-4 border-red-600 pl-6">
              <h3 className="text-xl font-bold text-black mb-4">How it works</h3>
              <ol className="space-y-4 text-gray-700">
                <li className="flex gap-3">
                  <span className="font-bold text-red-600 flex-shrink-0">1</span>
                  <span>Upload a scanned booklet page</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-red-600 flex-shrink-0">2</span>
                  <span>AI detects all images and diagrams</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-red-600 flex-shrink-0">3</span>
                  <span>Images are automatically cropped</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-red-600 flex-shrink-0">4</span>
                  <span>AI generates detailed descriptions</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
