# Verwende ein Node.js-Image als Basis
FROM node:18

# Erstelle einen Arbeitsordner im Container
WORKDIR /app

# Kopiere die package.json und installiere Abhängigkeiten
COPY package.json .
RUN npm install

# Kopiere den Rest des Codes
COPY . .

# Installiere FFmpeg
USER root
RUN apt-get update && apt-get install -y ffmpeg

# Wechsel zurück zum Nicht-Root-Benutzer
USER node

# Starte den Service
CMD ["npm", "start"]
