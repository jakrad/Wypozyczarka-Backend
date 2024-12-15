// routes/users.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API for user registration, authentication, and profile management
 */

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       description: User registration data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Bad Request - Email already exists
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
router.post('/register', async (req, res) => {
  const { email, password, name, phoneNumber, profileImage, role } = req.body;
  logger.info(`Próba rejestracji użytkownika: ${email}`);

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.info(`Rejestracja nieudana - email już istnieje: ${email}`);
      return res.status(400).json({ message: 'Email już istnieje' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      phoneNumber,
      profileImage,
      role: role || 'user'
    });

    logger.info(`Użytkownik zarejestrowany pomyślnie: ${email} (ID: ${user.id})`);
    res.status(201).json({ message: 'Użytkownik zarejestrowany pomyślnie', userId: user.id });
  } catch (error) {
    logger.error(`Błąd podczas rejestracji użytkownika: ${email}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       description: User login credentials
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Bad Request - Invalid credentials
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
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  logger.info(`Próba logowania użytkownika: ${email}`);

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.info(`Logowanie nieudane - nieprawidłowy email: ${email}`);
      return res.status(400).json({ message: 'Nieprawidłowe dane logowania' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.info(`Logowanie nieudane - nieprawidłowe hasło dla: ${email}`);
      return res.status(400).json({ message: 'Nieprawidłowe dane logowania' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'TwojSekretnyToken',
      { expiresIn: '1h' }
    );

    logger.info(`Użytkownik zalogowany pomyślnie: ${email} (ID: ${user.id})`);
    res.json({ message: 'Zalogowano pomyślnie', token });
  } catch (error) {
    logger.error(`Błąd podczas logowania użytkownika: ${email}`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      status: 'error',
      message: 'Błąd serwera'
    });
  }
});

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get information about the logged-in user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
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
router.get('/me', auth, async (req, res) => {
  const userId = req.user.userId;
  logger.info(`Pobieranie profilu użytkownika ID: ${userId}`);

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'name', 'phoneNumber', 'profileImage', 'role', 'createdAt', 'updatedAt']
    });

    if (!user) {
      logger.info(`Nie znaleziono profilu użytkownika ID: ${userId}`);
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    logger.info(`Pomyślnie pobrano profil użytkownika ID: ${userId}`);
    res.json(user);
  } catch (error) {
    logger.error(`Błąd podczas pobierania profilu użytkownika ID: ${userId}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update logged-in user's data
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: User data to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated name
 *                 example: Jan Kowalski
 *               phoneNumber:
 *                 type: string
 *                 description: Updated phone number
 *                 example: +987654321
 *               profileImage:
 *                 type: string
 *                 format: url
 *                 description: Updated profile image URL
 *                 example: http://example.com/images/new-profile.jpg
 *     responses:
 *       200:
 *         description: User data updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Dane użytkownika zaktualizowane pomyślnie
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
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
router.put('/me', auth, async (req, res) => {
  const userId = req.user.userId;
  const { name, phoneNumber, profileImage } = req.body;
  logger.info(`Próba aktualizacji profilu użytkownika ID: ${userId}`);

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.info(`Nie znaleziono użytkownika do aktualizacji ID: ${userId}`);
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    user.name = name || user.name;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.profileImage = profileImage || user.profileImage;

    await user.save();
    logger.info(`Pomyślnie zaktualizowano profil użytkownika ID: ${userId}`);
    res.json({ message: 'Dane użytkownika zaktualizowane pomyślnie', user });
  } catch (error) {
    logger.error(`Błąd podczas aktualizacji profilu użytkownika ID: ${userId}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /users/me:
 *   delete:
 *     summary: Delete the logged-in user's account
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Konto użytkownika usunięte pomyślnie
 *       404:
 *         description: User not found
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
router.delete('/me', auth, async (req, res) => {
  const userId = req.user.userId;
  logger.info(`Próba usunięcia konta użytkownika ID: ${userId}`);

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.info(`Nie znaleziono użytkownika do usunięcia ID: ${userId}`);
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    await user.destroy();
    logger.info(`Pomyślnie usunięto konto użytkownika ID: ${userId}`);
    res.json({ message: 'Konto użytkownika usunięte pomyślnie' });
  } catch (error) {
    logger.error(`Błąd podczas usuwania konta użytkownika ID: ${userId}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to retrieve
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
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
router.get('/:id', auth, async (req, res) => {
  const userId = req.params.id;
  logger.info(`Próba pobrania danych użytkownika ID: ${userId}`);

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'name', 'phoneNumber', 'profileImage', 'role', 'createdAt', 'updatedAt']
    });

    if (!user) {
      logger.info(`Nie znaleziono użytkownika ID: ${userId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Użytkownik nie znaleziony'
      });
    }

    logger.info(`Pomyślnie pobrano dane użytkownika ID: ${userId}`);
    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    logger.error(`Błąd podczas pobierania danych użytkownika ID: ${userId}`, error);
    res.status(500).json({
      status: 'error',
      message: 'Błąd serwera'
    });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, error]
 *         message:
 *           type: string
 *         data:
 *           type: object
 */

module.exports = router;
