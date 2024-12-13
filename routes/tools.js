// routes/tools.js
const express = require('express');
const router = express.Router();
const { Tool, User, ToolImage } = require('../models');
const auth = require('../middleware/auth');

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', auth, async (req, res) => {
  const { name, description, category, pricePerDay, location } = req.body;
  const userId = req.user.userId;

  console.log('Dodawanie narzędzia dla użytkownika ID:', userId);

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('Użytkownik nie znaleziony:', userId);
      return res.status(400).json({ message: 'Użytkownik nie istnieje' });
    }

    console.log('Znaleziono użytkownika:', user.email);

    const tool = await Tool.create({
      userId,
      name,
      description,
      category,
      pricePerDay,
      location
    });

    res.status(201).json({ message: 'Narzędzie dodane pomyślnie', toolId: tool.id });
  } catch (error) {
    console.error('Błąd podczas dodawania narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools:
 *   get:
 *     summary: Get all tools
 *     tags: [Tools]
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res) => {
  try {
    const tools = await Tool.findAll({
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: ToolImage }
      ]
    });
    res.json(tools);
  } catch (error) {
    console.error('Błąd podczas pobierania narzędzi:', error);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', async (req, res) => {
  const toolId = req.params.id;

  try {
    const tool = await Tool.findByPk(toolId, {
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        { model: ToolImage }
      ]
    });

    if (!tool) {
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    res.json(tool);
  } catch (error) {
    console.error('Błąd podczas pobierania narzędzia:', error);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', auth, async (req, res) => {
  const toolId = req.params.id;
  const { name, description, category, pricePerDay, location } = req.body;
  const userId = req.user.userId;

  console.log('Aktualizacja narzędzia ID:', toolId, 'dla użytkownika ID:', userId);

  try {
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    if (tool.userId !== userId) {
      return res.status(403).json({ message: 'Brak uprawnień do aktualizacji tego narzędzia' });
    }

    tool.name = name || tool.name;
    tool.description = description || tool.description;
    tool.category = category || tool.category;
    tool.pricePerDay = pricePerDay !== undefined ? pricePerDay : tool.pricePerDay;
    tool.location = location || tool.location;

    await tool.save();

    res.json({ message: 'Narzędzie zaktualizowane pomyślnie', tool });
  } catch (error) {
    console.error('Błąd podczas aktualizacji narzędzia:', error);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', auth, async (req, res) => {
  const toolId = req.params.id;
  const userId = req.user.userId;

  console.log('Usuwanie narzędzia ID:', toolId, 'dla użytkownika ID:', userId);

  try {
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    if (tool.userId !== userId) {
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego narzędzia' });
    }

    await tool.destroy();

    res.json({ message: 'Narzędzie usunięte pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools/{toolId}/images:
 *   post:
 *     summary: Add an image to a tool
 *     tags: [Tools]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: toolId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the tool to add an image to
 *     requestBody:
 *       description: Image URL to add
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToolImageRequest'
 *     responses:
 *       201:
 *         description: Image added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddToolImageResponse'
 *       403:
 *         description: Forbidden - No permission to add image to this tool
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tool not found or image not found
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
router.post('/:toolId/images', auth, async (req, res) => {
  const toolId = req.params.toolId;
  const userId = req.user.userId;
  const { imageUrl } = req.body;

  console.log('Dodawanie obrazu do narzędzia ID:', toolId, 'dla użytkownika ID:', userId);

  try {
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    if (tool.userId !== userId) {
      return res.status(403).json({ message: 'Brak uprawnień do dodania obrazu do tego narzędzia' });
    }

    const toolImage = await ToolImage.create({
      toolId: toolId,
      imageUrl: imageUrl
    });

    res.status(201).json({ message: 'Obraz dodany pomyślnie', toolImageId: toolImage.id });
  } catch (error) {
    console.error('Błąd podczas dodawania obrazu narzędzia:', error);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:toolId/images', async (req, res) => {
  const toolId = req.params.toolId;

  try {
    const images = await ToolImage.findAll({ where: { toolId } });
    res.json(images);
  } catch (error) {
    console.error('Błąd podczas pobierania obrazów narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /tools/{toolId}/images/{imageId}:
 *   delete:
 *     summary: Delete an image from a tool
 *     tags: [Tools]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: toolId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the tool
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the image to delete
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Obraz usunięty pomyślnie
 *       403:
 *         description: Forbidden - No permission to delete image from this tool
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Tool or Image not found
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
router.delete('/:toolId/images/:imageId', auth, async (req, res) => {
  const toolId = req.params.toolId;
  const imageId = req.params.imageId;
  const userId = req.user.userId;

  console.log('Usuwanie obrazu ID:', imageId, 'z narzędzia ID:', toolId, 'dla użytkownika ID:', userId);

  try {
    const tool = await Tool.findByPk(toolId);
    if (!tool) {
      return res.status(404).json({ message: 'Narzędzie nie znalezione' });
    }

    if (tool.userId !== userId) {
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia obrazu z tego narzędzia' });
    }

    const toolImage = await ToolImage.findByPk(imageId);
    if (!toolImage || toolImage.toolId !== parseInt(toolId)) {
      return res.status(404).json({ message: 'Obraz nie znaleziony' });
    }

    await toolImage.destroy();

    res.json({ message: 'Obraz usunięty pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania obrazu narzędzia:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;
