// index.js

// Load environment variables first
require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger'); // Swagger configuration
const bodyParser = require('body-parser');
const cors = require('cors');
const { initModels } = require('./models');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const toolRoutes = require('./routes/tools');
const favoriteRoutes = require('./routes/favorites');

const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// HTTPS configuration
const httpsOptions = {
  key: fs.readFileSync('./keys/key.pem'),
  cert: fs.readFileSync('./keys/cert.pem'),
};

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
console.log(`Swagger UI dostępny pod adresem: https://localhost:${PORT}/api-docs`);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/favorites', favoriteRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Server is running! Visit /api-docs for API documentation.');
});

// Error Handling Middleware
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Initialize models and start the HTTPS server
initModels()
  .then(() => {
    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`Serwer działa na porcie https://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Błąd podczas inicjalizacji modeli:', err);
  });
