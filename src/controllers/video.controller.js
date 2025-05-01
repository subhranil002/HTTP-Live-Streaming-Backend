import { ApiError, ApiResponse, asyncHandler, logger } from "../utils/index.js";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import {
    emptyTempDir,
    generateModifiedPlaylist,
    uploadVideoSegment,
} from "../utils/fileHandler.js";
import { createMasterPlaylist, hlSVideoTranscoding } from "../utils/ffmpeg.js";
import constants from "../constants.js";
ffmpeg.setFfmpegPath(ffmpegPath);

export const processAndUploadHLS = asyncHandler(async (req, res, next) => {
    try {
        await emptyTempDir();
        const videoPath = req.file?.path;
        if (!videoPath) {
            throw new ApiError("No video file found", 400);
        }

        logger.info("Received request to process and upload HLS video.");

        const videoId = uuidv4();
        const tempDir = "./public/temp";
        const outputPath = path.join(tempDir, videoId);
        fs.mkdirSync(outputPath, { recursive: true });

        logger.info(`Generated video ID: ${videoId}`);
        logger.info(`Temporary output path created at: ${outputPath}`);

        const baseCloudinaryUrl = `https://res.cloudinary.com/${constants.CLOUDINARY_CLOUD_NAME}/raw/upload`;
        const videoPathCloud = `${constants.CLOUDINARY_FOLDER_NAME}/${videoId}`;

        res.status(200).json(
            new ApiResponse(
                "HLS video will be processed and uploaded shortly",
                {
                    masterUrl: `${baseCloudinaryUrl}/${videoPathCloud}/master.m3u8`,
                    variantUrls: {
                        "360p": `${baseCloudinaryUrl}/${videoPathCloud}/stream_0/index.m3u8`,
                        "480p": `${baseCloudinaryUrl}/${videoPathCloud}/stream_1/index.m3u8`,
                        "720p": `${baseCloudinaryUrl}/${videoPathCloud}/stream_2/index.m3u8`,
                    },
                    videoId: videoId,
                    videoPath: videoPathCloud,
                }
            )
        );

        await hlSVideoTranscoding(videoPath, outputPath);

        const variantPlaylists = {};

        for (let resolutionIndex = 0; resolutionIndex <= 2; resolutionIndex++) {
            logger.info(`Processing variant stream_${resolutionIndex}`);

            const variantDir = path.join(
                outputPath,
                `stream_${resolutionIndex}`
            );
            const variantPlaylistPath = path.join(
                variantDir,
                "prog_index.m3u8"
            );

            let playlistContent = fs.readFileSync(variantPlaylistPath, "utf8");
            const lines = playlistContent.split("\n");

            const segmentLines = lines.filter((line) =>
                line.trim().endsWith(".ts")
            );

            const uploadResults = await Promise.all(
                segmentLines.map(async (segment) => {
                    const segmentFile = segment.trim();
                    const segmentPath = path.join(variantDir, segmentFile);

                    const secure_url = await uploadVideoSegment(
                        segmentPath,
                        `${constants.CLOUDINARY_FOLDER_NAME}/${videoId}/stream_${resolutionIndex}`,
                        `${segmentFile.replace(".ts", "")}`
                    );

                    return { segment: segmentFile, url: secure_url };
                })
            );

            const urlMap = new Map(
                uploadResults.map((r) => [r.segment, r.url])
            );

            const modifiedPlaylist = generateModifiedPlaylist(lines, urlMap);

            const modifiedPlaylistPath = path.join(variantDir, "modified.m3u8");
            fs.writeFileSync(modifiedPlaylistPath, modifiedPlaylist);

            const playlistUploadRes = await cloudinary.uploader.upload(
                modifiedPlaylistPath,
                {
                    resource_type: "raw",
                    folder: `${constants.CLOUDINARY_FOLDER_NAME}/${videoId}/stream_${resolutionIndex}`,
                    public_id: "index",
                    overwrite: true,
                }
            );

            variantPlaylists[`stream_${resolutionIndex}`] =
                playlistUploadRes.secure_url;

            logger.info(
                `Uploaded stream_${resolutionIndex} playlist and segments`
            );
        }

        const masterContent = createMasterPlaylist(variantPlaylists);
        const masterPath = path.join(outputPath, "master.m3u8");
        fs.writeFileSync(masterPath, masterContent);

        await cloudinary.uploader.upload(masterPath, {
            resource_type: "raw",
            folder: `${constants.CLOUDINARY_FOLDER_NAME}/${videoId}`,
            public_id: "master",
            overwrite: true,
        });

        logger.info(`Master playlist uploaded for video ID: ${videoId}`);

        await emptyTempDir();

        logger.info("Temporary directory cleaned up.");
    } catch (error) {
        logger.error(`Error in processAndUploadHLS: ${error}`);
        await emptyTempDir();
        return next(
            new ApiError(
                `video.controller :: processAndUploadHLS :: ${error}`,
                error.statusCode
            )
        );
    }
});

export const deleteVideo = asyncHandler(async (req, res, next) => {
    try {
        const videoId = req.params.videoId;
        if (!videoId) {
            throw new ApiError("No video ID found", 400);
        }

        const prefix = `${constants.CLOUDINARY_FOLDER_NAME}/${videoId}`;

        await cloudinary.api.delete_resources_by_prefix(prefix, {
            resource_type: "raw",
            type: "upload",
            invalidate: true,
        });
        await cloudinary.api.delete_resources_by_prefix(prefix, {
            resource_type: "video",
            type: "upload",
            invalidate: true,
        });
        await cloudinary.api.delete_folder(prefix);

        return res
            .status(200)
            .json(new ApiResponse("Video deleted successfully"));
    } catch (error) {
        logger.error(`Error deleting video: ${error.message}`);
        return next(
            new ApiError(
                `video.controller :: deleteVideo :: ${error}`,
                error.statusCode || 500
            )
        );
    }
});
