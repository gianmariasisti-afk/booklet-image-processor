import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Processing() {
  const { uploadId } = useParams<{ uploadId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const uploadQuery = trpc.processing.getUpload.useQuery(
    { uploadId: parseInt(uploadId || "0") },
    { enabled: isAuthenticated && !!uploadId, refetchInterval: autoRefresh ? 2000 : false }
  );

  useEffect(() => {
    if (uploadQuery.data?.processingStatus === "completed") {
      setAutoRefresh(false);
    }
  }, [uploadQuery.data?.processingStatus]);

  if (!isAuthenticated) {
    return <div className="text-center py-8">Please log in</div>;
  }

  if (uploadQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-2 border-black border-t-red-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-black font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  const upload = uploadQuery.data;
  if (!upload) {
    return <div className="text-center py-8">Upload not found</div>;
  }

  const progress = upload.totalImagesDetected && upload.totalImagesProcessed
    ? Math.round(((upload.totalImagesProcessed || 0) / upload.totalImagesDetected) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-black">
        <div className="container py-12">
          <h1 className="text-5xl font-bold text-black mb-2">Processing</h1>
          <p className="text-lg text-gray-700">{upload.fileName}</p>
        </div>
      </div>

      <div className="container py-16">
        <div className="max-w-2xl mx-auto">
          <div className="border border-black p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-6">Processing Status</h2>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-black">
                  {upload.processingStatus === "processing" ? "Processing..." : "Complete"}
                </span>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 border border-black">
                <div
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="border-l-4 border-red-600 pl-4">
                <p className="text-xs text-gray-600 mb-1">DETECTED</p>
                <p className="text-3xl font-bold text-black">{upload.totalImagesDetected}</p>
              </div>
              <div className="border-l-4 border-red-600 pl-4">
                <p className="text-xs text-gray-600 mb-1">PROCESSED</p>
                <p className="text-3xl font-bold text-black">{upload.totalImagesProcessed}</p>
              </div>
            </div>

            {upload.processingStatus === "failed" && (
              <div className="bg-gray-100 border border-black p-4 mb-8">
                <p className="text-sm text-red-600 font-bold mb-2">ERROR</p>
                <p className="text-gray-700">{upload.errorMessage}</p>
              </div>
            )}

            <div className="text-sm text-gray-600">
              Status: <span className="font-bold text-black capitalize">{upload.processingStatus}</span>
            </div>
          </div>

          {upload.processingStatus === "completed" && (
            <div className="text-center">
              <Button
                onClick={() => setLocation(`/results/${uploadId}`)}
                className="bg-black text-white border border-black hover:bg-gray-900 px-8 py-3 font-bold"
              >
                View Results
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
