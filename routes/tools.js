// routes/tools.js
const express = require('express');
const router = express.Router();
const { Tool, User, ToolImage } = require('../models');
const auth = require('../middleware/auth');

/**
 * Dodawanie nowego narzędzia (chronione)
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
 * Pobieranie wszystkich narzędzi (publiczne)
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
 * Pobieranie pojedynczego narzędzia (publiczne)
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
 * Aktualizacja narzędzia (chronione)
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
 * Usuwanie narzędzia (chronione)
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
 * Dodawanie obrazu do narzędzia (chronione)
 * POST /api/tools/:toolId/images
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
 * Pobieranie obrazów narzędzia (publiczne)
 * GET /api/tools/:toolId/images
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
 * Usuwanie obrazu z narzędzia (chronione)
 * DELETE /api/tools/:toolId/images/:imageId
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
