const cloudinary = require("../config/cloudinary");

/**
 * Uploads a buffer to Cloudinary.
 * @param {Buffer} buffer - The file buffer to upload
 * @param {string} folder - The Cloudinary folder path
 * @param {object} options - Additional Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadToCloudinary(buffer, folder, options = {}, mimetype = "image/jpeg") {
  // If credentials are placeholders, return a mock URL for local testing
  if (
    !process.env.CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_API_KEY.includes("xxxx") ||
    !process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME.includes("xxxx")
  ) {
    console.log("⚠️ Cloudinary placeholder keys detected. Returning mock upload URL for testing.");
    return Promise.resolve({
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1234567890/sample.png",
    });
  }

  const resourceType = mimetype.startsWith("audio/") || mimetype.startsWith("video/") ? "video" : "image";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation: resourceType === "image" ? [{ width: 1024, height: 1024, crop: "limit" }] : undefined,
        ...options
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

module.exports = { uploadToCloudinary };
