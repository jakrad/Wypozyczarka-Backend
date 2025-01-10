// routes\users.js

const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const multer = require('multer');
const { uploadImage, deleteImage } = require('../utils/s3'); // remove s3 from here
const { s3 } = require('../utils/aws'); // add s3 from aws
const { ValidationError } = require('../middleware/errorHandler');

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
 *   name: Users
 *   description: API for user registration, authentication, and profile management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         password:
 *           type: string
 *           description: User's password
 *           example: StrongPassword123
 *         name:
 *           type: string
 *           description: User's full name
 *           example: Jan Kowalski
 *         phoneNumber:
 *           type: string
 *           description: User's phone number
 *           example: "+123456789"
 *         profileImage:
 *           type: string
 *           format: url
 *           nullable: true
 *           description: URL to the user's profile image
 *           example: http://example.com/images/jan.jpg
 *         role:
 *           type: string
 *           description: User's role
 *           example: user
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Użytkownik zarejestrowany pomyślnie
 *         userId:
 *           type: integer
 *           example: 1
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: user@example.com
 *         password:
 *           type: string
 *           description: User's password
 *           example: StrongPassword123
 *     LoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Zalogowano pomyślnie
 *         token:
 *           type: string
 *           description: JWT token for authenticated requests
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6...
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             name:
 *               type: string
 *               example: Jan Kowalski
 *             email:
 *               type: string
 *               format: email
 *               example: jan.kowalski@example.com
 *             profileImage:
 *               type: string
 *               format: url
 *               nullable: true
 *               example: http://example.com/images/jan.jpg
 *             role:
 *               type: string
 *               example: user
 *             phoneNumber:
 *               type: string
 *               example: "+123456789"
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: "2023-01-01T12:00:00Z"
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               example: "2023-06-01T12:00:00Z"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [error]
 *           example: error
 *         code:
 *           type: string
 *           example: VALIDATION_ERROR
 *         message:
 *           type: string
 *           example: Błąd serwera
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-04-27T10:20:30Z"
 *         path:
 *           type: string
 *           example: "/users/login"
 *         method:
 *           type: string
 *           example: "POST"
 *         ip:
 *           type: string
 *           example: "192.168.1.1"
 *         userId:
 *           type: integer
 *           example: 123
 *           nullable: true
 *         stack:
 *           type: string
 *           description: Error stack trace
 *           example: "Error: Something went wrong...\n    at ..."
 *           nullable: true
 *
 *
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
      { expiresIn: '7d' }
    );

    // **Update `lastLogin` Field**
    user.lastLogin = Date.now(); // Current timestamp in milliseconds
    await user.save();

    // Prepare user data to send (excluding sensitive information)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      role: user.role,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin // Include `lastLogin` in the response
    };

    logger.info(`Użytkownik zalogowany pomyślnie: ${email} (ID: ${user.id})`);
    res.json({ message: 'Zalogowano pomyślnie', token, user: userData });
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
 * /users/me/profile-image:
 *   post:
 *     summary: Upload or update profile image
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: Profile image file to upload
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file to upload
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddProfileImageResponse'
 *       400:
 *         description: Bad Request - No file provided or invalid file type/size
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.post('/me/profile-image', auth, upload.single('profileImage'), async (req, res) => {
  const file = req.file;
  const userId = req.user.userId;

  logger.info(`Upload profile image initiated for userID = ${userId}`);

  if (!file) {
    logger.warn(`Próba dodania obrazu bez pliku dla użytkownika ID: ${userId}`);
    return res.status(400).json({ message: 'Brak pliku obrazu' });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`User not found: userID = ${userId}`);
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    // Optional: Delete existing profile image from S3 if it exists
    if (user.profileImage) {
      logger.info(`Deleting existing profile image for userID = ${userId}: ${user.profileImage}`);
      await deleteImage(user.profileImage);
      logger.info(`Deleted existing profile image for userID = ${userId}`);
    }

    // Upload new profile image to S3
    logger.info(`Uploading new profile image to S3 for userID = ${userId}`);
    const imageUrl = await uploadImage(file.buffer, file.mimetype, 'profiles');
    logger.info(`Uploaded new profile image to S3: ${imageUrl} for userID = ${userId}`);

    // Update user's profile image URL in the database
    user.profileImage = imageUrl;
    await user.save();
    logger.info(`Updated profileImage in DB for userID = ${userId}`);

    res.json({ message: 'Profile image updated successfully', imageUrl });
  } catch (error) {
    logger.error('Error uploading profile image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /users/me/profile-image:
 *   delete:
 *     summary: Delete profile image
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteProfileImageResponse'
 *       400:
 *         description: Bad Request - No profile image to delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.delete('/me/profile-image', auth, async (req, res) => {
  const userId = req.user.userId;
  logger.info(`Delete profile image initiated for userID = ${userId}`);

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`User not found: userID = ${userId}`);
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    if (!user.profileImage) {
      logger.warn(`No profile image to delete for userID = ${userId}`);
      return res.status(400).json({ message: 'Brak obrazu profilowego do usunięcia' });
    }

    // Delete image from S3
    logger.info(`Deleting profile image from S3: ${user.profileImage} for userID = ${userId}`);
    await deleteImage(user.profileImage);
    logger.info(`Deleted profile image from S3 for userID = ${userId}`);

    // Remove image URL from the database
    user.profileImage = null;
    await user.save();
    logger.info(`Removed profileImage from DB for userID = ${userId}`);

    res.json({ message: 'Profile image deleted successfully' });
  } catch (error) {
    logger.error('Error deleting profile image:', error);
    res.status(500).json({ message: 'Server error' });
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
 *       description: User data to update (excluding profileImage)
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
 */
router.put('/me', auth, async (req, res) => {
  const userId = req.user.userId;
  const { name, phoneNumber } = req.body; // Removed profileImage from payload
  logger.info(`Próba aktualizacji profilu użytkownika ID: ${userId}`);

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      logger.info(`Nie znaleziono użytkownika do aktualizacji ID: ${userId}`);
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    user.name = name || user.name;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    // Removed profileImage update from here

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
 *               $ref: '#/components/schemas/DeleteProfileImageResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
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

    // Optional: Delete profile image from S3 if it exists
    if (user.profileImage) {
      logger.info(`Deleting profile image from S3: ${user.profileImage} for userID = ${userId}`);
      await deleteImage(user.profileImage);
      logger.info(`Deleted profile image from S3 for userID = ${userId}`);
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

module.exports = router;
