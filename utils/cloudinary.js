const cloudinary = require('cloudinary').v2;
const fs = require('fs');


cloudinary.config({ 
    cloud_name: process.env.cloud_name, 
    api_key: process.env.api_key, 
    api_secret: process.env.api_secret 
});


const uploadOnCloudinary = async (localPath) => {
    try {
        if (!localPath) {
            return null; // Return null if no file path is provided
        }

        const res = await cloudinary.uploader.upload(localPath, { resource_type: "auto" }); 
        console.log("File has been uploaded successfully:", res); 
        return res;
    } catch (error) {
        console.error("Error while uploading file to Cloudinary:", error);

        // Delete the local file only if it exists
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }
        return null;
    }
};


const streamUpload = (buffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "uploads" }, // Upload to Cloudinary folder
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer); // Send the file buffer directly to Cloudinary
    });
  };
  


module.exports = {uploadOnCloudinary, streamUpload};