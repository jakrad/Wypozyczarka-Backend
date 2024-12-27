// routes\tools.js

const express = require('express');
const router = express.Router();
const { Tool, User, ToolImage } = require('../models');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const multer = require('multer');
const { uploadImage, deleteImage } = require('../utils/s3');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Configure multer storage (in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    logger.info(`Multer fileFilter: Checking file ${file.originalname}, mimetype=${file.mimetype}`);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      logger.warn(`Multer fileFilter: Rejected file ${file.originalname} due to invalid mimetype=${file.mimetype}`);
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: Tools
 *   description: API for managing tools and their images
 */

/**
 * @swagger
 * /tools:
 *   post:
 *     summary: Add a new tool
 *     tags: [Tools]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: Tool data to add
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToolRequest'
 *     responses:
 *       201:
 *         description: Tool added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddToolResponse'
 *       400:
 *         description: Bad Request - User does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.post('/', auth, async (req, res) => {
  const { name, description, category, pricePerDay, location } = req.body;
  const userId = req.user.userId;

  logger.info(`Dodawanie narzędzia dla użytkownika ID: ${userId}`);

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.info(`Użytkownik nie znaleziony: ${userId}`);
      return res.status(400).json({ message: 'Użytkownik nie istnieje' });
    }

    logger.info(`Znaleziono użytkownika: ${user.email}`);

    const tool = await Tool.create({
      userId,
      name,
      description,
      category,
      pricePerDay,
      location
    });

    logger.info(`Narzędzie dodane pomyślnie: ToolID=${tool.id} przez UserID=${userId}`);
    res.status(201).json({ message: 'Narzędzie dodane pomyślnie', toolId: tool.id });
  } catch (error) {
    logger.error('Błąd podczas dodawania narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools:
 *   get:
 *     summary: Get all tools
 *     tags: [Tools]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter tools by category
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name_asc, name_desc, price_asc, price_desc, createdAt_asc, createdAt_desc]
 *         description: Sort tools by name or price or creation date
 *     responses:
 *       200:
 *         description: List of tools
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tool'
 *       500:
 *         description: Server Error
 */
router.get('/', async (req, res) => {
  logger.info('Próba pobrania wszystkich narzędzi');

  const { category, sort } = req.query;

  let whereClause = {};
  if (category) {
    whereClause.category = category;
  }

  let order = [];
  if (sort) {
    const [field, direction] = sort.split('_');
    const validFields = ['name', 'pricePerDay', 'createdAt'];
    const validDirections = ['asc', 'desc'];

    if (validFields.includes(field) && validDirections.includes(direction.toLowerCase())) {
      order.push([field, direction.toUpperCase()]);
    }
  }

  try {
    const tools = await Tool.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: ToolImage }
      ],
      order: order
    });

    logger.info(`Pomyślnie pobrano ${tools.length} narzędzi`);
    res.json(tools);
  } catch (error) {
    logger.error('Błąd podczas pobierania wszystkich narzędzi:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools/{id}:
 *   get:
 *     summary: Get a single tool by ID
 *     tags: [Tools]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the tool to retrieve
 *     responses:
 *       200:
 *         description: Tool details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tool'
 *       404:
 *         description: Tool not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.get('/:id', async (req, res) => {
  const toolId = req.params.id;
  logger.info(`Próba pobrania narzędzia ID: ${toolId}`);

  try {
    const tool = await Tool.findByPk(toolId, {
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: ToolImage }
      ]
    });

    if (!tool) {
      logger.info(`Nie znaleziono narzędzia ID: ${toolId}`);
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    logger.info(`Pomyślnie pobrano narzędzie ID: ${toolId}`);
    res.json(tool);
  } catch (error) {
    logger.error(`Błąd podczas pobierania narzędzia ID: ${toolId}:`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools/{id}:
 *   put:
 *     summary: Update a tool
 *     tags: [Tools]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the tool to update
 *     requestBody:
 *       description: Updated tool data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateToolRequest'
 *     responses:
 *       200:
 *         description: Tool updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Narzędzie zaktualizowane pomyślnie
 *                 tool:
 *                   $ref: '#/components/schemas/Tool'
 *       403:
 *         description: Forbidden - No permission to update this tool
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tool not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.put('/:id', auth, async (req, res) => {
  const toolId = req.params.id;
  const { name, description, category, pricePerDay, location } = req.body;
  const userId = req.user.userId;

  logger.info(`Aktualizacja narzędzia ID: ${toolId} dla użytkownika ID: ${userId}`);

  try {
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      logger.info(`Próba aktualizacji nieistniejącego narzędzia ID: ${toolId}`);
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    if (tool.userId !== userId) {
      logger.info(
        `Odmowa dostępu: Użytkownik ${userId} próbował zaktualizować narzędzie ${toolId} należące do użytkownika ${tool.userId}`
      );
      return res.status(403).json({ message: 'Brak uprawnień do aktualizacji tego narzędzia' });
    }

    tool.name = name || tool.name;
    tool.description = description || tool.description;
    tool.category = category || tool.category;
    tool.pricePerDay = pricePerDay !== undefined ? pricePerDay : tool.pricePerDay;
    tool.location = location || tool.location;

    await tool.save();

    logger.info(`Pomyślnie zaktualizowano narzędzie ID: ${toolId}`);
    res.json({ message: 'Narzędzie zaktualizowane pomyślnie', tool });
  } catch (error) {
    logger.error('Błąd podczas aktualizacji narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools/{id}:
 *   delete:
 *     summary: Delete a tool
 *     tags: [Tools]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the tool to delete
 *     responses:
 *       200:
 *         description: Tool deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Narzędzie usunięte pomyślnie
 *       403:
 *         description: Forbidden - No permission to delete this tool
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tool not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.delete('/:id', auth, async (req, res) => {
  const toolId = req.params.id;
  const userId = req.user.userId;

  logger.info(`Rozpoczęto proces usuwania narzędzia ID: ${toolId} przez użytkownika ID: ${userId}`);

  try {
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      logger.info(`Próba usunięcia nieistniejącego narzędzia ID: ${toolId}`);
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    if (tool.userId !== userId) {
      logger.info(
        `Odmowa dostępu: Użytkownik ${userId} próbował usunąć narzędzie ${toolId} należące do użytkownika ${tool.userId}`
      );
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego narzędzia' });
    }

    // Optional: Delete all associated images from S3
    const toolImages = await ToolImage.findAll({ where: { toolId } });
    for (const image of toolImages) {
      logger.info(`Usuwanie obrazu z S3: ${image.imageUrl} dla narzędzia ID: ${toolId}`);
      await deleteImage(image.imageUrl);
      logger.info(`Usunięto obraz z S3: ${image.imageUrl}`);
    }

    await tool.destroy();
    logger.info(`Pomyślnie usunięto narzędzie ID: ${toolId} przez użytkownika ID: ${userId}`);
    res.json({ message: 'Narzędzie usunięte pomyślnie' });
  } catch (error) {
    logger.error(`Błąd podczas usuwania narzędzia ID: ${toolId}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools/{toolId}/images:
 *   get:
 *     summary: Get images of a tool
 *     tags: [Tools]
 *     parameters:
 *       - in: path
 *         name: toolId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the tool to retrieve images for
 *     responses:
 *       200:
 *         description: List of tool images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ToolImage'
 *       404:
 *         description: Tool not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.get('/:toolId/images', async (req, res) => {
  const toolId = req.params.toolId;

  logger.info(`Próba pobrania obrazów narzędzia ID: ${toolId}`);

  try {
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      logger.info(`Nie znaleziono narzędzia ID: ${toolId}`);
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    const images = await ToolImage.findAll({ where: { toolId } });
    logger.info(`Pomyślnie pobrano ${images.length} obrazów dla narzędzia ID: ${toolId}`);
    res.json(images);
  } catch (error) {
    logger.error('Błąd podczas pobierania obrazów narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools/user/{userId}:
 *   get:
 *     summary: Get tools by user ID
 *     tags: [Tools]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose tools to retrieve
 *     responses:
 *       200:
 *         description: List of tools by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tool'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const {
    category,
    minPrice,
    maxPrice,
    search,
    sortBy = 'createdAt',
    order = 'DESC'
  } = req.query;

  logger.info(`Próba pobrania narzędzi dla użytkownika ID: ${userId} z filtrami: ${JSON.stringify(req.query)}`);

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`Nie znaleziono użytkownika ID: ${userId}`);
      throw new NotFoundError('Użytkownik nie znaleziony');
    }

    const whereClause = { userId };

    if (category) {
      whereClause.category = category;
      logger.info(`Filtracja narzędzi po kategorii: ${category}`);
    }

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
      logger.info(`Filtracja narzędzi po nazwie zawierającej: ${search}`);
    }

    if (minPrice || maxPrice) {
      whereClause.pricePerDay = {};
      if (minPrice) {
        whereClause.pricePerDay[Op.gte] = parseFloat(minPrice);
        logger.info(`Filtracja narzędzi po minimalnej cenie: ${minPrice}`);
      }
      if (maxPrice) {
        whereClause.pricePerDay[Op.lte] = parseFloat(maxPrice);
        logger.info(`Filtracja narzędzi po maksymalnej cenie: ${maxPrice}`);
      }
    }

    const validSortFields = ['createdAt', 'pricePerDay', 'name'];
    if (!validSortFields.includes(sortBy)) {
      logger.warn(`Nieprawidłowe pole sortowania: ${sortBy}`);
      throw new ValidationError('Nieprawidłowe pole sortowania');
    }

    const tools = await Tool.findAll({
      where: whereClause,
      include: [
        { model: ToolImage },
        { model: User, attributes: ['id', 'name', 'email'] }
      ],
      order: [[sortBy, order.toUpperCase()]]
    });

    logger.info(`Pobrano ${tools.length} narzędzi dla użytkownika ID: ${userId}`);
    res.json({
      status: 'success',
      data: { tools },
      filters: {
        category,
        minPrice,
        maxPrice,
        search,
        sortBy,
        order
      }
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      logger.info(`Błąd walidacji: ${error.message}`);
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    } else if (error instanceof NotFoundError) {
      logger.info(`Nie znaleziono użytkownika ID: ${userId}`);
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    } else {
      logger.error(`Błąd podczas pobierania narzędzi użytkownika ID: ${userId}:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Wystąpił błąd podczas pobierania narzędzi'
      });
    }
  }
});

/**
 * @swagger
 * /tools/{toolId}/images:
 *   post:
 *     summary: Upload one or more images for a tool (multipart form data)
 *     tags: [Tools]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: toolId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the tool to which images belong
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: One or more image files
 *     responses:
 *       200:
 *         description: List of newly uploaded images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ToolImage'
 *       400:
 *         description: Tool not found or no images provided
 *       403:
 *         description: Forbidden - The tool doesn’t belong to the logged user
 *       500:
 *         description: Server Error
 */
router.post('/:toolId/images', auth, upload.array('images', 3), async (req, res) => {
  const toolId = parseInt(req.params.toolId, 10);
  const userId = req.user.userId;

  logger.info(`Upload images initiated for toolID = ${toolId}, userID = ${userId}`);

  try {
    // Inspect the request
    logger.info(`Received ${req.files?.length || 0} files for toolID = ${toolId}`);

    if (!req.files || req.files.length === 0) {
      logger.warn(`No images provided for toolID = ${toolId}`);
      return res.status(400).json({ message: 'No images provided' });
    }

    req.files.forEach((file, idx) => {
      logger.info(`Processing File[${idx}]: originalname=${file.originalname}, mimetype=${file.mimetype}, size=${file.size} bytes`);
    });

    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      logger.warn(`Tool not found: toolID = ${toolId}`);
      return res.status(400).json({ message: 'Tool does not exist' });
    }

    if (tool.userId !== userId) {
      logger.warn(`UserID = ${userId} does not own toolID = ${toolId}`);
      return res.status(403).json({ message: 'No permission to add images to this tool' });
    }

    const results = [];
    for (const file of req.files) {
      logger.info(`Uploading image: ${file.originalname}`);

      // Upload to S3
      const imageUrl = await uploadImage(file.buffer, file.mimetype, 'tools');
      logger.info(`Image uploaded to S3: ${imageUrl}`);

      // Insert row in DB
      const newImage = await ToolImage.create({
        toolId: toolId,
        imageUrl: imageUrl
      });
      logger.info(`ToolImage record created: ${newImage.id}`);

      results.push(newImage);
    }

    res.status(200).json(results);
  } catch (error) {
    logger.error('Błąd podczas uploadu obrazów:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;
