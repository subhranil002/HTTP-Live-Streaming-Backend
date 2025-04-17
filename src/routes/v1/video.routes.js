import { Router } from "express";
import {
    deleteVideo,
    processAndUploadHLS,
} from "../../controllers/video.controller.js";
import upload from "../../middlewares/multer.middleware.js";
const videoRoutes = Router();

videoRoutes
    .route("/hls-upload")
    .post(upload.single("video"), processAndUploadHLS);

videoRoutes.route("/delete/:videoId").get(deleteVideo);

export default videoRoutes;
