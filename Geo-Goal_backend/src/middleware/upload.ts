import multer from 'multer';
import path from 'path';

function createUpload(prefix: string) {
    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, 'public/uploads/');
        },
        filename: (_req, file, cb) => {
            cb(null, `${prefix}-${Date.now()}${path.extname(file.originalname)}`);
        },
    });
    return multer({ storage });
}

// Instancias exportadas por entidad
export const upload = createUpload('team');
export const uploadLeagueLogo = createUpload('league');
export const uploadAvatar = createUpload('avatar');
