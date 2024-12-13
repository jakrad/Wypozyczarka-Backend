// routes/favorites.js
const express = require('express');
const router = express.Router();
const { Favorite, User, Tool } = require('../models');
const auth = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: API for managing user favorite tools
 */

/**
 * @swagger
 * /favorites:
 *   post:
 *     summary: Add a tool to favorites
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: Tool ID to add to favorites
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddFavoriteRequest'
 *     responses:
 *       201:
 *         description: Favorite added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddFavoriteResponse'
 *       400:
 *         description: Bad Request - Tool does not exist or favorite already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Get all favorite tools of the authenticated user
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite tools
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const favorites = await Favorite.findAll({
      where: { userId },
      include: [Tool],
    });
    res.json(favorites);
  } catch (error) {
    console.error('Błąd podczas pobierania ulubionych:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /favorites/{id}:
 *   delete:
 *     summary: Remove a tool from favorites
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the favorite to remove
 *     responses:
 *       200:
 *         description: Favorite removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ulubione usunięte pomyślnie
 *       403:
 *         description: Forbidden - User does not have permission to delete this favorite
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Favorite not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
