const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Lege den Upload-Ordner fest
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// Konfiguriere Multer: erwarte Felder "images" und "audios"
const upload = multer({ dest: uploadFolder }).fields([
  { name: 'images', maxCount: 6 },
  { name: 'audios', maxCount: 6 }
]);

// Test-Endpunkt
app.get('/', (req, res) => {
  res.send('FFmpeg-Service ist aktiv. Nutze POST /create-video, um ein Video zu erstellen.');
});

// POST-Endpunkt zur Videoerstellung
app.post('/create-video', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Upload-Fehler:', err);
      return res.status(500).json({ error: err.message });
    }

    // Überprüfe, ob genau 6 Bilder und 6 Audios hochgeladen wurden
    if (
      !req.files.images || !req.files.audios ||
      req.files.images.length !== 6 || req.files.audios.length !== 6
    ) {
      return res.status(400).json({
        error: 'Es müssen genau 6 Bilder (images) und 6 Audios (audios) hochgeladen werden.'
      });
    }

    // Hole die Dateipfade
    const imagePaths = req.files.images.map(file => file.path);
    const audioPaths = req.files.audios.map(file => file.path);
    const videoParts = [];

    // Für jedes Bild-Audio-Paar: Erstelle ein kurzes Video
    for (let i = 0; i < 6; i++) {
      const outputVideo = path.join(uploadFolder, `video${i + 1}.mp4`);
      videoParts.push(outputVideo);

      // FFmpeg-Befehl für ein Teilvideo
      const cmd = `ffmpeg -y -loop 1 -i ${imagePaths[i]} -i ${audioPaths[i]} -c:v libx264 -c:a aac -b:a 192k -shortest -pix_fmt yuv420p ${outputVideo}`;
      try {
        await execPromise(cmd);
      } catch (error) {
        console.error(`Fehler beim Erstellen von video${i + 1}.mp4:`, error);
        return res.status(500).json({ error: error.message });
      }
    }

    // Erstelle eine Liste der Videos zum Zusammenfügen
    const listFile = path.join(uploadFolder, 'list.txt');
    fs.writeFileSync(listFile, videoParts.map(v => `file '${v}'`).join('\n'));

    // Füge alle Teilvideos zu einem finalen Video zusammen
    const finalVideo = path.join(uploadFolder, 'final_video.mp4');
    const concatCmd = `ffmpeg -y -f concat -safe 0 -i ${listFile} -c copy ${finalVideo}`;
    try {
      await execPromise(concatCmd);
    } catch (error) {
      console.error('Fehler beim Zusammenfügen der Videos:', error);
      return res.status(500).json({ error: error.message });
    }

    // Sende das finale Video als Download zurück
    res.download(finalVideo, 'final_video.mp4', (downloadErr) => {
      if (downloadErr) {
        console.error('Fehler beim Senden des Videos:', downloadErr);
      }
      // Aufräumen: Alle Dateien löschen (optional)
      [...imagePaths, ...audioPaths, ...videoParts, listFile, finalVideo].forEach(filePath => {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.warn('Konnte Datei nicht löschen:', filePath, err);
          }
        });
      });
    });
  });
});

// Route zum Überprüfen der FFmpeg-Version
app.get('/ffmpeg-version', (req, res) => {
  exec('ffmpeg -version', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Fehler: ${error.message}`);
    }
    // Sende die FFmpeg-Version als Text
    res.type('text/plain').send(stdout);
  });
});

// Hilfsfunktion, um exec als Promise zu verwenden
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(stdout || stderr);
    });
  });
}

app.listen(port, () => {
  console.log(`FFmpeg-Service läuft auf Port ${port}`);
});
