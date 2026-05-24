import multer from "multer";
import path from "path";
import fs from "fs";

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

const VIDEO_DIR = path.resolve(__dirname, "..", "..", "..", "Geo-Goal_ai_service", "uploads");

function ensureVideoDir() {
    if (!fs.existsSync(VIDEO_DIR)) {
        fs.mkdirSync(VIDEO_DIR, { recursive: true });
    }
}

const videoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        ensureVideoDir();
        cb(null, VIDEO_DIR);
    },
    filename: (req, file, cb) => {
        const matchId = req.params.matchId ?? "unknown";
        const ts = Date.now();
        const ext = path.extname(file.originalname) || ".mp4";
        cb(null, `match-${matchId}-${ts}${ext}`);
    },
});

function createVideoUpload() {
    return multer({
        storage: videoStorage,
        limits: {
            fileSize: 2 * 1024 * 1024 * 1024, // 2 GB
        },
        fileFilter: (_req, file, cb) => {
            const allowed = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/x-matroska"];
            if (!allowed.includes(file.mimetype)) {
                cb(new Error("Formato de video no permitido. Usa MP4, MOV, AVI, WebM o MKV."));
                return;
            }
            cb(null, true);
        },
    });
}

export const upload = createUpload();
export const uploadLeagueLogo = createUpload();
export const uploadAvatar = createUpload();
export const uploadVideo = createVideoUpload();
