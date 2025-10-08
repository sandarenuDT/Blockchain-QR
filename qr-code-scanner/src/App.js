import { useState, useRef, useEffect } from "react";
import { Camera, X, CheckCircle, AlertCircle } from "lucide-react";

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [detectionFeedback, setDetectionFeedback] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const callApiWithHash = async (hash) => {
    try {
      setLoading(true);
      setError("");

      // Replace with your actual API endpoint
      const response = await fetch(`YOUR_API_ENDPOINT_HERE/${hash}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Add any auth headers if needed
          // 'Authorization': 'Bearer YOUR_TOKEN'
        },
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      setApiResponse(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch data from API: " + err.message);
      setLoading(false);
    }
  };

  const startScanning = async () => {
    try {
      setError("");
      setVideoReady(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      console.log("Stream obtained:", stream);
      console.log("Video tracks:", stream.getVideoTracks());

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);

        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          console.log(
            "Video dimensions:",
            videoRef.current.videoWidth,
            "x",
            videoRef.current.videoHeight
          );

          videoRef.current
            .play()
            .then(() => {
              console.log("Video playing");
              setVideoReady(true);
              scanIntervalRef.current = setInterval(scanQRCode, 300);
            })
            .catch((err) => {
              console.error("Play error:", err);
              setError("Failed to play video: " + err.message);
            });
        };

        videoRef.current.onerror = (e) => {
          console.error("Video error:", e);
          setError("Video element error");
        };
      }
    } catch (err) {
      console.error("getUserMedia error:", err);
      setError("Camera access denied or not available: " + err.message);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Check if jsQR is loaded
    if (typeof window.jsQR === "undefined") {
      return;
    }

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      const hash = code.data;
      setResult(hash);
      setHistory((prev) => {
        const newEntry = {
          data: hash,
          timestamp: new Date().toLocaleString(),
        };
        return [newEntry, ...prev.slice(0, 9)];
      });
      stopScanning();

      // Call API with the hash
      callApiWithHash(hash);
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      stopScanning();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <style>{`
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(400%);
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Camera size={32} />
              QR Code Scanner
            </h1>
            <p className="mt-2 opacity-90">
              Scan QR codes and fetch data from API
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5" size={20} />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Always show reserved video preview area */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 mb-6">
              <div className="relative w-full max-w-md aspect-[3/4] rounded-lg overflow-hidden border-4 border-blue-600 bg-black">
                {/* ✅ Video element (shows camera when scanning) */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                  style={{ backgroundColor: "#000" }}
                />

                {/* Hidden canvas for jsQR processing */}
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* If not scanning yet → Show placeholder */}
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-50">
                    <Camera size={64} className="text-blue-400 mb-4" />
                    <p className="text-lg font-semibold">
                      Camera preview will appear here
                    </p>
                  </div>
                )}

                {/* Overlay when scanning */}
                {scanning && videoReady && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Dark transparent mask */}
                    <div className="absolute inset-0 bg-black bg-opacity-25" />
                    {/* Border frame */}
                    <div className="absolute inset-8 border-4 border-blue-400 rounded-xl" />
                    {/* Animated scan line */}
                    <div className="absolute inset-8 overflow-hidden rounded-xl">
                      <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-scan shadow-lg shadow-blue-400"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons below preview */}
              <div className="mt-6 flex gap-4">
                {!scanning ? (
                  <button
                    onClick={startScanning}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Start Scanning
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="bg-red-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-600 transition-all"
                  >
                    Stop Scanning
                  </button>
                )}
              </div>
            </div>

            {result && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle className="text-green-500 mt-1" size={24} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-2">
                        QR Code Scanned!
                      </h3>
                      <div className="bg-white p-4 rounded border border-green-200 break-all font-mono text-sm">
                        {result}
                      </div>
                    </div>
                  </div>

                  {loading && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                        <p className="text-blue-700">
                          Loading data from API...
                        </p>
                      </div>
                    </div>
                  )}

                  {apiResponse && (
                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        API Response:
                      </h4>
                      <pre className="text-sm overflow-auto max-h-64 bg-gray-50 p-3 rounded">
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => copyToClipboard(result)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Copy Hash
                    </button>
                    <button
                      onClick={() => {
                        setResult("");
                        setApiResponse(null);
                        setError("");
                        startScanning();
                      }}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Scan Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-lg">Scan History</span>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                    {history.length}
                  </span>
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => copyToClipboard(item.data)}
                    >
                      <div className="text-sm text-gray-600 mb-1">
                        {item.timestamp}
                      </div>
                      <div className="text-sm font-mono break-all text-gray-800">
                        {item.data}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
