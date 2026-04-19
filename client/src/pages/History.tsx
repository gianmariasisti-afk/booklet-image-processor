import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function History() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const uploadsQuery = trpc.processing.listUploads.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black mb-4">Archive</h1>
          <p className="text-lg text-gray-600 mb-8">Please log in to view your archive</p>
        </div>
      </div>
    );
  }

  if (uploadsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-2 border-black border-t-red-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-black font-bold">Loading archive...</p>
        </div>
      </div>
    );
  }

  const uploads = uploadsQuery.data || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-black">
        <div className="container py-12">
          <h1 className="text-5xl font-bold text-black mb-2">Archive</h1>
          <p className="text-lg text-gray-700">Your processed booklets</p>
        </div>
      </div>

      <div className="container py-16">
        {uploads.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-16">
            <p className="text-lg text-gray-600 mb-8">No booklets processed yet</p>
            <Button
              onClick={() => setLocation("/upload")}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 border-0"
            >
              Upload Your First Booklet
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="border border-black p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/results/${upload.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-black mb-2">{upload.fileName}</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">STATUS</p>
                          <p className="font-bold text-black capitalize">{upload.processingStatus}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">DETECTED</p>
                          <p className="font-bold text-black">{upload.totalImagesDetected || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">PROCESSED</p>
                          <p className="font-bold text-black">{upload.totalImagesProcessed || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-600 mb-2">UPLOADED</p>
                      <p className="text-sm text-black">
                        {new Date(upload.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
