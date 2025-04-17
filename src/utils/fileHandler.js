import fs from "fs";
import { ApiError } from "../utils/index.js";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";

export const emptyTempDir = async () => {
    try {
        const tempDir = path.join(
            path.dirname(fileURLToPath(import.meta.url)),
            "../../public/temp"
        );

        if (fs.existsSync(tempDir)) {
            const items = await fs.promises.readdir(tempDir);

            await Promise.all(
                items.map(async (item) => {
                    if (item === ".gitkeep") return;

                    const itemPath = path.join(tempDir, item);
                    const stats = await fs.promises.lstat(itemPath);

                    if (stats.isDirectory()) {
                        await fs.promises.rm(itemPath, {
                            recursive: true,
                            force: true,
                        });
                    } else {
                        await fs.promises.unlink(itemPath);
                    }
                })
            );
        }
    } catch (error) {
        throw new ApiError("Error while deleting local files", 500);
    }
};

export const uploadVideoSegment = async (segmentPath, folder, publicId) => {
    const { secure_url } = await cloudinary.uploader.upload(segmentPath, {
        resource_type: "video",
        folder,
        public_id: publicId,
        overwrite: true,
    });
    return secure_url;
};

export const generateModifiedPlaylist = (lines, urlMap) => {
    return lines
        .map((line) => {
            const trimmed = line.trim();
            return urlMap.has(trimmed) ? urlMap.get(trimmed) : line;
        })
        .join("\n");
};
