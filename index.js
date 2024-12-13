// index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { initModels } = require('./models');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const toolRoutes = require('./routes/tools');
const favoriteRoutes = require('./routes/favorites');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Route'y
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/favorites', favoriteRoutes);

// Inicjalizacja modeli i uruchomienie serwera
initModels().then(() => {
  app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
  });
}).catch(err => {
  console.error('Błąd podczas inicjalizacji modeli:', err);
});
