import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// This directory will be created by the 'npm run build' command
const buildDir = path.join(__dirname, 'dist');

// Serve static files from the 'dist' directory
app.use(express.static(buildDir));

// For any other request, serve the index.html file.
// This is crucial for single-page applications with client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
