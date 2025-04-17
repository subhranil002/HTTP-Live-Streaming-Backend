import "dotenv/config";

const constants = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_SECRET_KEY: process.env.CLOUDINARY_SECRET_KEY,
    CLOUDINARY_FOLDER_NAME: process.env.CLOUDINARY_FOLDER_NAME,
    FRONTEND_URL: process.env.FRONTEND_URL,
};

export default constants;
