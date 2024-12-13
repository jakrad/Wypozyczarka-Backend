// routes/favorites.js
const express = require('express');
const router = express.Router();
const { Favorite, User, Tool } = require('../models');
const auth = require('../middleware/auth');

// Dodawanie ulubionego narzędzia
router.post('/', auth, async (req, res) => {
  const { toolId } = req.body;
  const userId = req.user.userId;

  try {
    // Sprawdź czy tool istnieje
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      return res.status(400).json({ message: 'Narzędzie nie istnieje' });
    }

    // Sprawdź czy już jest w ulubionych
    const existingFavorite = await Favorite.findOne({ where: { userId, toolId } });
    if (existingFavorite) {
      return res.status(400).json({ message: 'Ulubione już istnieje' });
    }

    const favorite = await Favorite.create({ userId, toolId });
    res.status(201).json({ message: 'Ulubione dodane pomyślnie', favoriteId: favorite.id });
  } catch (error) {
    console.error('Błąd podczas dodawania ulubionego narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Pobieranie wszystkich ulubionych narzędzi użytkownika
router.get('/', auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const favorites = await Favorite.findAll({
      where: { userId },
      include: [Tool]
    });
    res.json(favorites);
  } catch (error) {
    console.error('Błąd podczas pobierania ulubionych:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Usuwanie ulubionego narzędzia
router.delete('/:id', auth, async (req, res) => {
  const favoriteId = req.params.id;
  const userId = req.user.userId;

  try {
    const favorite = await Favorite.findByPk(favoriteId);
    if (!favorite) {
      return res.status(404).json({ message: 'Ulubione nie znalezione' });
    }
    if (favorite.userId !== userId) {
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego ulubionego narzędzia' });
    }

    await favorite.destroy();
    res.json({ message: 'Ulubione usunięte pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania ulubionego narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;
