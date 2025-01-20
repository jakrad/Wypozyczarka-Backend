// routes/users.js

const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const multer = require('multer');
const { uploadImage, deleteImage } = require('../utils/s3'); // Removed s3 from here
const { s3 } = require('../utils/aws'); // Added s3 from aws
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

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
 *         description: Bad Request - Email already exists or validation error
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

    // Validate phone number format if provided
    if (phoneNumber && !/^\+?[\d\s-]{8,}$/.test(phoneNumber)) {
      throw new ValidationError('Nieprawidłowy format numeru telefonu');
    }

    // Hash the password
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
    if (error instanceof ValidationError) {
      logger.info(`Rejestracja nieudana - błąd walidacji: ${error.message}`);
      res.status(400).json({ message: error.message });
    } else {
      logger.error(`Błąd podczas rejestracji użytkownika: ${email}`, error);
      res.status(500).json({ message: 'Błąd serwera' });
    }
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

    // Update `lastLogin` Field
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
      attributes: ['id', 'email', 'name', 'phoneNumber', 'profileImage', 'role', 'createdAt', 'updatedAt', 'lastLogin']
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
    res.status(500).json({ message: 'Błąd serwera' });
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
 *       400:
 *         description: Bad Request - Validation error
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

    // Validate phone number format if provided
    if (phoneNumber && !/^\+?[\d\s-]{8,}$/.test(phoneNumber)) {
      throw new ValidationError('Nieprawidłowy format numeru telefonu');
    }

    user.name = name || user.name;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    // Removed profileImage update from here

    await user.save();
    logger.info(`Pomyślnie zaktualizowano profil użytkownika ID: ${userId}`);
    res.json({ message: 'Dane użytkownika zaktualizowane pomyślnie', user });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.info(`Aktualizacja profilu nieudana - błąd walidacji: ${error.message}`);
      res.status(400).json({ message: error.message });
    } else {
      logger.error(`Błąd podczas aktualizacji profilu użytkownika ID: ${userId}`, error);
      res.status(500).json({ message: 'Błąd serwera' });
    }
  }
});

/**
 * @swagger
 * /users/me/change-email:
 *   put:
 *     summary: Change logged-in user's email
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: New email and current password for verification
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *               - currentPassword
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *                 description: New email address
 *                 example: new.email@example.com
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification
 *                 example: StrongPassword123
 *     responses:
 *       200:
 *         description: Email updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email zaktualizowany pomyślnie
 *                 newEmail:
 *                   type: string
 *                   format: email
 *                   example: new.email@example.com
 *       400:
 *         description: Bad Request - Invalid input or email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Incorrect current password
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
router.put('/me/change-email', auth, async (req, res) => {
  const userId = req.user.userId;
  const { newEmail, currentPassword } = req.body;
  logger.info(`Próba zmiany emaila dla użytkownika ID: ${userId}`);

  try {
    // Validate input presence
    if (!newEmail || !currentPassword) {
      throw new ValidationError('Nowy email i aktualne hasło są wymagane');
    }

    // Validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new ValidationError('Nieprawidłowy format nowego emaila');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      logger.info(`Nie znaleziono użytkownika ID: ${userId}`);
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      logger.info(`Nieprawidłowe aktualne hasło dla użytkownika ID: ${userId}`);
      return res.status(401).json({ message: 'Nieprawidłowe aktualne hasło' });
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({ where: { email: newEmail } });
    if (existingUser && existingUser.id !== userId) {
      logger.info(`Zmiana emaila nieudana - email już w użyciu: ${newEmail}`);
      return res.status(400).json({ message: 'Nowy email jest już w użyciu' });
    }

    // Update email
    user.email = newEmail;
    await user.save();
    logger.info(`Email użytkownika ID: ${userId} zaktualizowany na: ${newEmail}`);

    res.json({ message: 'Email zaktualizowany pomyślnie', newEmail });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.info(`Zmiana emaila nieudana - błąd walidacji: ${error.message}`);
      res.status(400).json({ message: error.message });
    } else {
      logger.error(`Błąd podczas zmiany emaila użytkownika ID: ${userId}`, error);
      res.status(500).json({ message: 'Błąd serwera' });
    }
  }
});

/**
 * @swagger
 * /users/me/change-password:
 *   put:
 *     summary: Change logged-in user's password
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: Current password and new password for update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification
 *                 example: StrongPassword123
 *               newPassword:
 *                 type: string
 *                 description: New password to set
 *                 example: NewStrongPassword456!
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hasło zaktualizowane pomyślnie
 *       400:
 *         description: Bad Request - Invalid input or weak password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Incorrect current password
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
router.put('/me/change-password', auth, async (req, res) => {
  const userId = req.user.userId;
  const { currentPassword, newPassword } = req.body;
  logger.info(`Próba zmiany hasła dla użytkownika ID: ${userId}`);

  try {
    // Validate input presence
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Aktualne hasło i nowe hasło są wymagane');
    }

    // Validate new password strength
    // Example: Minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&^_-])[A-Za-z\d@$!%*?#&^_-]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new ValidationError('Nowe hasło musi zawierać co najmniej 8 znaków, w tym jedną dużą literę, jedną małą literę, jedną cyfrę i jeden znak specjalny');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      logger.info(`Nie znaleziono użytkownika ID: ${userId}`);
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      logger.info(`Nieprawidłowe aktualne hasło dla użytkownika ID: ${userId}`);
      return res.status(401).json({ message: 'Nieprawidłowe aktualne hasło' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedNewPassword;
    await user.save();
    logger.info(`Hasło użytkownika ID: ${userId} zostało zaktualizowane`);

    res.json({ message: 'Hasło zaktualizowane pomyślnie' });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.info(`Zmiana hasła nieudana - błąd walidacji: ${error.message}`);
      res.status(400).json({ message: error.message });
    } else {
      logger.error(`Błąd podczas zmiany hasła użytkownika ID: ${userId}`, error);
      res.status(500).json({ message: 'Błąd serwera' });
    }
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
      attributes: ['id', 'email', 'name', 'phoneNumber', 'profileImage', 'role', 'createdAt', 'updatedAt', 'lastLogin']
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
