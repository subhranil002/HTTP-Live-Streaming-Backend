import ffmpeg from "fluent-ffmpeg";
import ApiError from "./ApiError.js";
import logger from "./logger.js";

export const hlSVideoTranscoding = async (videoPath, outputPath) => {
    try {
        logger.info(`Starting HLS video transcoding`);
        logger.info(`Input video path: ${videoPath}`);
        logger.info(`Output path: ${outputPath}`);
        const startTime = Date.now();

        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .on("start", (commandLine) => {
                    logger.info(`FFmpeg process started: ${commandLine}`);
                })
                .outputOptions([
                    "-filter_complex",
                    "[0:v]split=3[v1][v2][v3]",

                    // 360p
                    "-map",
                    "[v1]",
                    "-map",
                    "0:a",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-g",
                    "180",
                    "-b:v",
                    "800k",
                    "-s",
                    "640x360",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "128k",
                    "-ac",
                    "2",
                    "-ar",
                    "48000",
                    "-sc_threshold",
                    "0",

                    // 480p
                    "-map",
                    "[v2]",
                    "-map",
                    "0:a",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-g",
                    "180",
                    "-b:v",
                    "1200k",
                    "-s",
                    "854x480",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "128k",
                    "-ac",
                    "2",
                    "-ar",
                    "48000",
                    "-sc_threshold",
                    "0",

                    // 720p
                    "-map",
                    "[v3]",
                    "-map",
                    "0:a",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-g",
                    "180",
                    "-b:v",
                    "2200k",
                    "-s",
                    "1280x720",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "128k",
                    "-ac",
                    "2",
                    "-ar",
                    "48000",
                    "-sc_threshold",
                    "0",

                    // HLS options
                    "-hls_playlist_type",
                    "vod",
                    "-var_stream_map",
                    "v:0,a:0 v:1,a:1 v:2,a:2",
                    "-hls_time",
                    "6",
                    "-hls_segment_filename",
                    `${outputPath}/stream_%v/segment_%03d.ts`,
                ])
                .output(`${outputPath}/stream_%v/prog_index.m3u8`)
                .on("end", () => {
                    const duration = ((Date.now() - startTime) / 1000).toFixed(
                        2
                    );
                    logger.info(
                        `HLS video transcoding completed in ${duration} seconds.`
                    );
                    resolve();
                })
                .on("error", (err) => {
                    logger.error(
                        `[ERROR] FFmpeg processing error: ${err.message}`
                    );
                    reject(new ApiError(`FFmpeg error: ${err.message}`, 500));
                })
                .run();
        });
    } catch (error) {
        throw new ApiError(`HLS video transcoding error: ${error}`, 500);
    }
};

export const createMasterPlaylist = (playlists) => {
    return `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.64001e,mp4a.40.2"
${playlists["stream_0"]}

#EXT-X-STREAM-INF:BANDWIDTH=1200000,RESOLUTION=854x480,CODECS="avc1.64001f,mp4a.40.2"
${playlists["stream_1"]}

#EXT-X-STREAM-INF:BANDWIDTH=2200000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
${playlists["stream_2"]}`;
};
