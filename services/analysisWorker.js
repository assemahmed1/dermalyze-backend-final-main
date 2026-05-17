const { parentPort, workerData } = require("worker_threads");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary inside the worker
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "dermalyze/analyses", transformation: [{ width: 1024, height: 1024, crop: "limit" }] },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function analyzeSkin(imageBuffer) {
  const token = process.env.HF_API_TOKEN;
  if (!token) throw new Error("API configuration missing");
  
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/Anwarkh1/Skin_Cancer-Image_Classification",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/octet-stream"
      },
      body: imageBuffer
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) throw new Error("Invalid API token");
    if (response.status === 503) throw new Error("Model loading, please wait...");
    throw new Error(`Analysis error (${response.status})`);
  }
  
  const data = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    const top = data[0];
    return `${top.label} (${(top.score * 100).toFixed(1)}% confidence)`;
  }
  throw new Error("Unable to analyze image");
}

async function run() {
  try {
    const buffer = Buffer.from(workerData.imageBuffer);
    
    const [uploadResult, aiResult] = await Promise.all([
      uploadToCloudinary(buffer),
      analyzeSkin(buffer)
    ]);
    
    parentPort.postMessage({
      success: true,
      imageUrl: uploadResult.secure_url,
      result: aiResult
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message || "Unknown worker error"
    });
  }
}

run();
