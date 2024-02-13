const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const ffprobe = require('@ffprobe-installer/ffprobe');
const ffprobePath = ffprobe.path;
const { spawn } = require('child_process');



const app = express();
app.use(cors());

//Retorna Imagenes

app.get('/img/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    const imgDirectory = path.join(__dirname, 'assets', 'img');

    // Buscar archivos en el directorio de imágenes
    fs.readdir(imgDirectory, (err, files) => {
        if (err) {
            // Manejar el error si ocurre al leer el directorio
            console.error('Error reading image directory:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Buscar el archivo con el nombre proporcionado
        const matchingFile = files.find(file => file.toLowerCase().startsWith(imageName.toLowerCase()));

        if (matchingFile) {
            // Si se encuentra un archivo coincidente, enviarlo
            const imagePath = path.join(imgDirectory, matchingFile);
            res.sendFile(imagePath);
        } else {
            // Si no se encuentra ningún archivo coincidente, devolver un error 404
            res.status(404).send('Image Not Found');
        }
    });
});


//Retorna Peliculas 

app.get('/movies/:category', (req, res) => {
    const category = req.params.category;
    const moviesFolder = path.join(__dirname, '/assets/movies/');
    const movies = getFromFolder(moviesFolder, category);
    const sortedMovies = movies.sort((a, b) => a.name.localeCompare(b.name));
    res.json(sortedMovies);
});

app.get('/videos', (req, res) => {
    const videosFolder = path.join(__dirname, '/assets/videos/');
    const videos = getVideosFromFolder(videosFolder);
    const sortedVideos = videos.sort((a, b) => a.name.localeCompare(b.name));
    res.json(sortedVideos);
});

// Ruta para obtener el listado de temas
app.get('/themes', (req, res) => {
    const themeFolder = path.join(__dirname, '/assets/theme/');
    const themes = getFilesFromFolder(themeFolder);
    res.json(themes);
});

app.get('/music', (req, res) => {
    const musicFolder = path.join(__dirname, '/assets/music/');
    const music = getFromFolder(musicFolder, 'All');
    const sortedMusic = music.sort((a, b) => a.name.localeCompare(b.name));
    res.json(sortedMusic);
});


app.get('/ads', (req, res) => {
    const adsFolder = path.join(__dirname, '/assets/ads');
    const videoContent = getRandomAd(adsFolder);
    res.set('Content-Type', 'video/mp4'); // Establece el tipo de contenido del video
    res.send(videoContent);
})

app.get('/apk', (req, res) =>{
    const apkFilePath = path.join(__dirname, 'assets', 'apk', 'veotrans.apk');
    
    // Verificar si el archivo existe
    fs.access(apkFilePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('El archivo APK no existe:', err);
            return res.status(404).send('APK Not Found');
        }

        // Enviar el archivo APK
        res.sendFile(apkFilePath);
    });
});

app.get('/movie/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const moviesFolder = path.join(__dirname, '/assets/movies/');
    const movies = getFromFolder(moviesFolder, 'all'); // Obtener todas las películas
    const selectedMovie = movies.find(movie => movie.id === id);

    if (!selectedMovie) {
        return res.status(404).send('Movie Not Found');
    }

    const videoPath = selectedMovie.path;

   serveVideoFile(videoPath, req, res)
});

app.get('/music/:id',(req, res) =>{
    const id = parseInt(req.params.id, 10);
    const musicFolder = path.join(__dirname, '/assets/music/');
    const music = getFromFolder(musicFolder, 'All');
    const selectedMusic = music.find(music => music.id === id);
  
    if (!selectedMusic) {
        return res.status(404).send('Music Not Found');
    }

    const musicPath = selectedMusic.path;

    serveMusicFile(musicPath, req, res); 
});

app.get('/video/:id', (req, res) => {
    const id = req.params.id;
    const videosFolder = path.join(__dirname, '/assets/videos/');
    const video = getVideoById(videosFolder, id);

    if (!video) {
        return res.status(404).send('Video Not Found');
    }

    const videoPath = video.path;
    serveVideoFile(videoPath, req, res)
});

// Ruta para obtener el contenido de un tema específico por su ID
app.get('/theme/:id', (req, res) => {
    const id = req.params.id;
    const themeFolder = path.join(__dirname, '/assets/theme/');
    const theme = getFileById(themeFolder, id);

    if (!theme) {
        return res.status(404).send('Theme Not Found');
    }

    // Aquí servirías el contenido del tema según su tipo
    // Por ejemplo, si es un video, puedes usar res.sendFile() para enviar el archivo
    res.sendFile(theme.path);
});



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


function getVideoById(folderPath, id) {
    const videos = getVideosFromFolder(folderPath);
    return videos.find(video => video.id === parseInt(id));
}

function getFromFolder(folderPath, category) {
    const videos = [];
    const subfolders = fs.readdirSync(folderPath, { withFileTypes: true });
    let id = 0;
    let CategoryName = '';

    subfolders.forEach(subfolder => {
        if (subfolder.isDirectory() && subfolder.name.toLowerCase() <= 'g' && subfolder.name.toLowerCase() >= 'a') {
            const subfolderPath = path.join(folderPath, subfolder.name);
            const files = fs.readdirSync(subfolderPath);

            files.forEach(file => {
                const filePath = path.join(subfolderPath, file);
                const stat = fs.statSync(filePath);
                switch (subfolder.name) {
                    case 'A':
                        CategoryName = 'Accion';
                        break;
                    case 'B':
                        CategoryName = 'Estreno';
                        break;
                    case 'C':
                        CategoryName = 'Comedia';
                        break;
                    case 'D':
                        CategoryName = 'Drama';
                        break;
                    case 'E':
                        CategoryName = 'Romance';
                        break;
                    case 'F':
                        CategoryName = 'Animacion';
                        break;
                    case 'G':
                        CategoryName = 'Documental'
                }
                if (stat.isFile()) {
                    const fileName = path.parse(file).name;
                    const video = {
                        id: id++,
                        name: fileName,
                        category: CategoryName,
                        path: filePath,
                        cover: `/img/${fileName}`
                    };
                    if (category.toLowerCase() === 'all' || category.toLowerCase() === subfolder.name.toLowerCase()) {
                        videos.push(video);
                    }
                }
            });
        }
    });

    return videos;
}

function getFileById(folderPath, id) {
    const files = getFilesFromFolder(folderPath);
    return files.find(file => file.id === parseInt(id));
}

function getRandomAd(folderPath) {
    const files = fs.readdirSync(folderPath);
    const randomIndex = Math.floor(Math.random() * files.length);
    const randomFile = files[randomIndex];
    const filePath = path.join(folderPath, randomFile);

    // Lee el contenido del archivo de video
    const videoContent = fs.readFileSync(filePath);

    return videoContent; // Devuelve el contenido del archivo de video
}

function getVideosFromFolder(folderPath) {
    const videos = [];
    const files = fs.readdirSync(folderPath);
    let id = 0;

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            const fileName = path.parse(file).name;
            const video = {
                id: id++,
                name: fileName,
                path: filePath
            };
            videos.push(video);
        }
    });

    return videos;
}

// Función para servir archivos de video con streaming
function serveVideoFile(videoPath, req, res) {
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Range': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4'
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
}

// Función para servir archivos de música con streaming
function serveMusicFile(musicPath, req, res) {
    const stat = fs.statSync(musicPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(musicPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Range': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'audio/mpeg' // Cambiado a 'audio/mpeg' para archivos de música
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'audio/mpeg', // Cambiado a 'audio/mpeg' para archivos de música
        };
        res.writeHead(200, head);
        fs.createReadStream(musicPath).pipe(res);
    }
}

function getFilesFromFolder(folderPath) {
    const files = [];
    const items = fs.readdirSync(folderPath);

    items.forEach(item => {
        const itemPath = path.join(folderPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isFile()) {
            const fileName = path.parse(item).name;
            const fileExtension = path.extname(item).toLowerCase();

            if (fileExtension === '.mp4' || fileExtension === '.mov' || fileExtension === '.avi') {
                files.push({
                    id: files.length,
                    name: fileName,
                    type: 'video',
                    path: itemPath
                });
            } else if (fileExtension === '.jpg' || fileExtension === '.png' || fileExtension === '.gif') {
                files.push({
                    id: files.length,
                    name: fileName,
                    type: 'image',
                    path: itemPath
                });
            }
        }
    });

    return files;
}


