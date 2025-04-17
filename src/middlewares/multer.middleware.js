import path from "path";
import multer from "multer";

const upload = multer({
    dest: "./public/temp",
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    storage: multer.diskStorage({
        destination: "./public/temp",
        filename: (_req, file, cb) => {
            cb(null, file.originalname);
        },
    }),
    fileFilter: (_req, file, cb) => {
        let ext = path.extname(file.originalname);

        // Only allow video files
        if (ext !== ".mp4" && ext !== ".mov" && ext !== ".mkv") {
            cb(new Error(`Unsupported file type! ${ext}`), false);
            return;
        }

        cb(null, true);
    },
});

export default upload;
