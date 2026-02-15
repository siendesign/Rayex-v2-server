import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

console.log("Cloudinary Config Check:");
console.log("- Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "Present" : "Missing");
console.log("- API Key:", process.env.CLOUDINARY_API_KEY ? "Present" : "Missing");
console.log("- API Secret:", process.env.CLOUDINARY_API_SECRET ? "Present" : "Missing");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary from a base64 string or file buffer
 */
export const uploadImage = async (file: string, folder: string = "rayex/flags") => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "auto",
    });
    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

export default cloudinary;
