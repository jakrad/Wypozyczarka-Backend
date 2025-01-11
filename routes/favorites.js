// routes/favorites.js

const express = require('express');
const router = express.Router();
const { Favorite, User, Tool, ToolImage } = require('../models'); // Added ToolImage
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { NotFoundError, AuthorizationError, ConflictError } = require('../middleware/errorHandler');

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
 *             type: object
 *             required:
 *               - toolId
 *             properties:
 *               toolId:
 *                 type: integer
 *                 description: ID of the tool to add to favorites
 *                 example: 456
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
 *       403:
 *         description: Forbidden - Not authorized to add this favorite
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.post('/', auth, async (req, res) => {
  const { toolId } = req.body;
  const userId = req.user.userId;

  logger.info(`Próba dodania narzędzia ID: ${toolId} do ulubionych użytkownika ID: ${userId}`);

  try {
    // Check if tool exists
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      logger.info(`Narzędzie ID: ${toolId} nie istnieje`);
      return res.status(400).json({ message: 'Narzędzie nie istnieje' });
    }

    // Check if already in favorites
    const existingFavorite = await Favorite.findOne({ where: { userId, toolId } });
    if (existingFavorite) {
      logger.info(`Narzędzie ID: ${toolId} jest już w ulubionych użytkownika ID: ${userId}`);
      return res.status(400).json({ message: 'Ulubione już istnieje' });
    }

    const favorite = await Favorite.create({ userId, toolId });
    logger.info(`Pomyślnie dodano narzędzie ID: ${toolId} do ulubionych użytkownika ID: ${userId}`);
    res.status(201).json({ message: 'Ulubione dodane pomyślnie', favoriteId: favorite.id });
  } catch (error) {
    logger.error(`Błąd podczas dodawania do ulubionych: ${error.message}`, error);
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
 *       403:
 *         description: Forbidden - Not authorized to access favorites
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.get('/', auth, async (req, res) => {
  const userId = req.user.userId;
  logger.info(`Pobieranie ulubionych dla użytkownika ID: ${userId}`);

  try {
    const favorites = await Favorite.findAll({
      where: { userId },
      include: [{
        model: Tool,
        as: 'Tool', // Ensure the alias matches Sequelize associations
        include: [{
          model: ToolImage,
          as: 'ToolImages' // Include ToolImages
        }]
      }],
    });
    logger.info(`Pomyślnie pobrano ulubione dla użytkownika ID: ${userId}`);
    res.json(favorites);
  } catch (error) {
    logger.error(`Błąd podczas pobierania ulubionych: ${error.message}`, error);
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
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Ulubione usunięte pomyślnie
 *                 data:
 *                   type: object
 *                   properties:
 *                     favoriteId:
 *                       type: integer
 *                       example: 789
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
 */
router.delete('/:id', auth, async (req, res) => {
  const favoriteId = req.params.id;
  const userId = req.user.userId;

  logger.info(`Próba usunięcia ulubionego ID: ${favoriteId} przez użytkownika ID: ${userId}`);

  try {
    const favorite = await Favorite.findByPk(favoriteId);
    
    if (!favorite) {
      logger.info(`Nie znaleziono ulubionego ID: ${favoriteId}`);
      throw new NotFoundError('Ulubione nie znalezione');
    }
    
    if (favorite.userId !== userId) {
      logger.info(`Odmowa dostępu: Użytkownik ${userId} próbował usunąć ulubione ${favoriteId}`);
      throw new AuthorizationError('Brak uprawnień do usunięcia tego ulubionego');
    }

    await favorite.destroy();
    
    logger.info(`Pomyślnie usunięto ulubione ID: ${favoriteId} użytkownika ID: ${userId}`);
    res.json({ 
      status: 'success',
      message: 'Ulubione usunięte pomyślnie',
      data: { favoriteId }
    });
    
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      logger.info(`Błąd walidacji: ${error.message} (${error.name}) - ID: ${favoriteId}, UserID: ${userId}`);
      res.status(error instanceof NotFoundError ? 404 : 403).json({
        status: 'error',
        message: error.message
      });
    } else {
      logger.error(`Krytyczny błąd podczas usuwania ulubionego: ${error.message}`, error);
      res.status(500).json({ 
        status: 'error',
        message: 'Wystąpił błąd podczas usuwania ulubionego'
      });
    }
  }
});

module.exports = router;
