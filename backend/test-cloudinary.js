require("dotenv").config();
const cloudinary = require("./config/cloudinary");

async function testUpload() {
  try {
    const res = await cloudinary.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", {
      folder: 'campus_food'
    });
    console.log("Success:", res.secure_url);
  } catch (err) {
    console.error("Cloudinary Error:", err);
  }
}
testUpload();
