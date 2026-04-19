import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-black">
        <div className="container py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Booklet Processor</h1>
          {isAuthenticated ? (
            <Button
              onClick={() => setLocation("/upload")}
              className="bg-black text-white border border-black hover:bg-gray-900 px-6 py-2 font-bold"
            >
              Upload
            </Button>
          ) : (
            <a href={getLoginUrl()}>
              <Button className="bg-black text-white border border-black hover:bg-gray-900 px-6 py-2 font-bold">
                Sign In
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="container py-24">
        <div className="grid grid-cols-12 gap-16 items-center">
          <div className="col-span-12 lg:col-span-6">
            <div className="mb-8">
              <div className="inline-block w-4 h-12 bg-red-600 mb-6"></div>
            </div>
            <h2 className="text-6xl font-bold text-black leading-tight mb-6">
              Extract and Archive Visual Content
            </h2>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Intelligently process scanned booklet images. Our AI automatically detects, crops, and describes all visual content.
            </p>
            {isAuthenticated ? (
              <Button
                onClick={() => setLocation("/upload")}
                className="bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 px-8 py-4 font-bold text-lg"
              >
                Start Processing
              </Button>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 px-8 py-4 font-bold text-lg">
                  Get Started
                </Button>
              </a>
            )}
          </div>

          <div className="col-span-12 lg:col-span-6">
            <div className="space-y-8">
              <div className="border-l-4 border-red-600 pl-6">
                <h3 className="text-xl font-bold text-black mb-2">AI Detection</h3>
                <p className="text-gray-700">Automatically identify figures, photos, diagrams, and illustrations</p>
              </div>
              <div className="border-l-4 border-red-600 pl-6">
                <h3 className="text-xl font-bold text-black mb-2">Auto Cropping</h3>
                <p className="text-gray-700">Precise extraction of detected image regions</p>
              </div>
              <div className="border-l-4 border-red-600 pl-6">
                <h3 className="text-xl font-bold text-black mb-2">AI Descriptions</h3>
                <p className="text-gray-700">Generate comprehensive descriptions with context</p>
              </div>
              <div className="border-l-4 border-red-600 pl-6">
                <h3 className="text-xl font-bold text-black mb-2">Full Archive</h3>
                <p className="text-gray-700">Store and retrieve all processed images</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-black"></div>

      <div className="container py-24">
        <h2 className="text-4xl font-bold text-black mb-16">How It Works</h2>
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="border border-black p-6">
              <div className="text-4xl font-bold text-red-600 mb-4">1</div>
              <h3 className="text-lg font-bold text-black mb-2">Upload</h3>
              <p className="text-gray-700 text-sm">Select a scanned booklet page</p>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="border border-black p-6">
              <div className="text-4xl font-bold text-red-600 mb-4">2</div>
              <h3 className="text-lg font-bold text-black mb-2">Detect</h3>
              <p className="text-gray-700 text-sm">AI identifies visual regions</p>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="border border-black p-6">
              <div className="text-4xl font-bold text-red-600 mb-4">3</div>
              <h3 className="text-lg font-bold text-black mb-2">Crop</h3>
              <p className="text-gray-700 text-sm">Extract image regions</p>
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="border border-black p-6">
              <div className="text-4xl font-bold text-red-600 mb-4">4</div>
              <h3 className="text-lg font-bold text-black mb-2">Describe</h3>
              <p className="text-gray-700 text-sm">Generate descriptions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 border-t border-b border-black">
        <div className="container py-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-black mb-6">Ready to start?</h2>
            <p className="text-xl text-gray-700 mb-8">Begin processing your booklets today</p>
            {isAuthenticated ? (
              <Button
                onClick={() => setLocation("/upload")}
                className="bg-black text-white border border-black hover:bg-gray-900 px-8 py-3 font-bold text-lg"
              >
                Upload Booklet
              </Button>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="bg-black text-white border border-black hover:bg-gray-900 px-8 py-3 font-bold text-lg">
                  Sign In to Start
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-black">
        <div className="container py-8">
          <p className="text-sm text-gray-600 text-center">Booklet Image Processor - Powered by AI Vision</p>
        </div>
      </div>
    </div>
  );
}
