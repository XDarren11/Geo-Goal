import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Asegúrate de que esta carpeta exista en tu proyecto
        cb(null, 'public/uploads/') 
    },
    filename: function (req, file, cb) {
        // Generamos un nombre único: "team-123123123.jpg"
        cb(null, 'team-' + Date.now() + path.extname(file.originalname))
    }
});

export const upload = multer({ storage: storage });