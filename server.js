const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 3000;

// Damit wir JSON und Dateidaten empfangen können:
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Einfacher Endpunkt, der angibt, dass der Service läuft:
app.get('/', (req, res) => {
  res.send('FFmpeg-Service ist aktiv.');
});

// Endpunkt zum Erstellen eines Videos:
app.post('/create-video', (req, res) => {
  // Hier erwartest du, dass der Request ein Bild und eine Audiodatei enthält.
  // Für dieses einfache Beispiel nehmen wir an, dass die Dateien bereits als
  // Pfade (z. B. /data/image1.png und /data/audio1.mp3) vorliegen.
  // In einer echten Anwendung würden wir die Dateien speichern und dann verarbeiten.
  
  const command = `ffmpeg -loop 1 -i /data/image1.png -i /data/audio1.mp3 -c:v libx264 -c:a aac -b:a 192k -shortest -pix_fmt yuv420p /data/video1.mp4`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Fehler: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    // Senden Sie als Antwort einen Hinweis, dass das Video erstellt wurde.
    res.json({ message: 'Video wurde erstellt!', output: '/data/video1.mp4' });
  });
});

app.listen(port, () => {
  console.log(`FFmpeg-Service läuft auf Port ${port}`);
});
