import multer from "multer";

function createUpload() {
    return multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.startsWith("image/")) {
                cb(new Error("Solo se permiten archivos de imagen"));
                return;
            }
            cb(null, true);
        },
    });
}

export const upload = createUpload();
export const uploadLeagueLogo = createUpload();
export const uploadAvatar = createUpload();
