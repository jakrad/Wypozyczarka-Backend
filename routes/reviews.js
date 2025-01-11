// routes\reviews.js

const express = require('express');
const router = express.Router();
const { Review, User } = require('../models');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: API for managing user reviews
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Add a new review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: Review data to add
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddReviewRequest'
 *     responses:
 *       201:
 *         description: Review added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddReviewResponse'
 *       400:
 *         description: Bad Request - Invalid user or review already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.post('/', auth, async (req, res) => {
  const { reviewedUserId, rating, comment } = req.body;
  const reviewerUserId = req.user.userId;

  logger.info(`Próba dodania recenzji: użytkownik ${reviewerUserId} ocenia użytkownika ${reviewedUserId}`);

  try {
    const reviewer = await User.findByPk(reviewerUserId);
    const reviewed = await User.findByPk(reviewedUserId);

    if (!reviewer || !reviewed) {
      logger.info(`Nieprawidłowy użytkownik - recenzent: ${reviewerUserId}, oceniany: ${reviewedUserId}`);
      return res.status(400).json({ message: 'Nieprawidłowy użytkownik' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ where: { reviewerUserId, reviewedUserId } });
    if (existingReview) {
      logger.info(`Review already exists: reviewer ${reviewerUserId}, reviewed ${reviewedUserId}`);
      return res.status(400).json({ message: 'Recenzja już istnieje' });
    }

    const review = await Review.create({
      reviewerUserId,
      reviewedUserId,
      rating,
      comment
    });

    logger.info(`Successfully added review ID: ${review.id}`);
    res.status(201).json({ message: 'Recenzja dodana pomyślnie', reviewId: review.id });
  } catch (error) {
    logger.error(`Error adding review: ${error.message}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Get reviews
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: reviewedUserId
 *         schema:
 *           type: integer
 *         description: ID of the user being reviewed
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       500:
 *         description: Server Error
 */
router.get('/', async (req, res) => {
  const { reviewedUserId } = req.query;
  logger.info(`Fetching reviews${reviewedUserId ? ` for user ID: ${reviewedUserId}` : ''}`);

  try {
    if (reviewedUserId) {
      const reviews = await Review.findAll({
        where: { reviewedUserId },
        include: [{ model: User, as: 'Reviewer', attributes: ['id', 'name', 'email'] }]
      });
      res.json(reviews);
    } else {
      const reviews = await Review.findAll({
        include: [
          { model: User, as: 'Reviewer', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'Reviewed', attributes: ['id', 'name', 'email'] }
        ]
      });
      res.json(reviews);
    }
    logger.info('Successfully fetched reviews list');
  } catch (error) {
    logger.error(`Error fetching reviews: ${error.message}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the review to update
 *     requestBody:
 *       description: Updated review data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReviewRequest'
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Recenzja zaktualizowana pomyślnie
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *       403:
 *         description: Forbidden - No permission to update this review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.put('/:id', auth, async (req, res) => {
  const reviewId = req.params.id;
  const { rating, comment } = req.body;
  const reviewerUserId = req.user.userId;

  logger.info(`Attempting to update review ID: ${reviewId}`);

  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      logger.info(`Review not found ID: ${reviewId}`);
      return res.status(404).json({ message: 'Recenzja nie znaleziona' });
    }

    // Check if the review belongs to the logged-in user
    if (review.reviewerUserId !== reviewerUserId) {
      logger.info(`Unauthorized attempt to update review ID: ${reviewId}`);
      return res.status(403).json({ message: 'Brak uprawnień do aktualizacji tej recenzji' });
    }

    // Update rating and comment if provided
    if (rating !== undefined) {
      review.rating = rating;
      logger.info(`Updated rating for review ID: ${reviewId} to: ${rating}`);
    }
    if (comment !== undefined) {
      review.comment = comment;
      logger.info(`Updated comment for review ID: ${reviewId} to: "${comment}"`);
    }

    await review.save();

    logger.info(`Successfully updated review ID: ${reviewId}`);
    res.json({ message: 'Recenzja zaktualizowana pomyślnie', review });
  } catch (error) {
    logger.error(`Error updating review ID: ${reviewId}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the review to delete
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Recenzja usunięta pomyślnie
 *       403:
 *         description: Forbidden - No permission to delete this review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 */
router.delete('/:id', auth, async (req, res) => {
  const reviewId = req.params.id;
  const reviewerUserId = req.user.userId;

  logger.info(`Attempting to delete review ID: ${reviewId}`);

  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      logger.info(`Review not found ID: ${reviewId}`);
      return res.status(404).json({ message: 'Recenzja nie znaleziona' });
    }

    // Check if the review belongs to the logged-in user
    if (review.reviewerUserId !== reviewerUserId) {
      logger.info(`Unauthorized attempt to delete review ID: ${reviewId}`);
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia tej recenzji' });
    }

    await review.destroy();

    logger.info(`Successfully deleted review ID: ${reviewId}`);
    res.json({ message: 'Recenzja usunięta pomyślnie' });
  } catch (error) {
    logger.error(`Error deleting review ID: ${reviewId}`, error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

/**
 * @swagger
 * /reviews/reviewed/{userId}:
 *   get:
 *     summary: Get reviews for a user who has been reviewed
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user who has been reviewed
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Minimal rating of reviews
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Maximum rating of reviews
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for reviews
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for reviews
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, createdAt]
 *         description: Field to sort reviews by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Order of sorting
 *     responses:
 *       200:
 *         description: List of reviews for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Review'
 *                 filters:
 *                   type: object
 *                   properties:
 *                     minRating:
 *                       type: integer
 *                       example: 3
 *                     maxRating:
 *                       type: integer
 *                       example: 5
 *                     startDate:
 *                       type: string
 *                       format: date
 *                       example: '2023-01-01'
 *                     endDate:
 *                       type: string
 *                       format: date
 *                       example: '2023-12-31'
 *                     sortBy:
 *                       type: string
 *                       example: rating
 *                     order:
 *                       type: string
 *                       example: DESC
 *       400:
 *         description: Bad Request - Invalid query parameters
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
router.get('/reviewed/:userId', async (req, res) => {
  const { userId } = req.params;
  const { 
    minRating,
    maxRating,
    startDate,
    endDate,
    sortBy = 'createdAt',
    order = 'DESC'
  } = req.query;

  try {
    // Validate parameters
    if (minRating && (isNaN(minRating) || minRating < 1 || minRating > 5)) {
      throw new ValidationError('Nieprawidłowa wartość minRating (1-5)');
    }
    if (maxRating && (isNaN(maxRating) || maxRating < 1 || maxRating > 5)) {
      throw new ValidationError('Nieprawidłowa wartość maxRating (1-5)');
    }

    // Build filtering conditions
    const whereClause = { reviewedUserId: userId };
    
    if (minRating || maxRating) {
      whereClause.rating = {};
      if (minRating) whereClause.rating[Op.gte] = parseInt(minRating);
      if (maxRating) whereClause.rating[Op.lte] = parseInt(maxRating);
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const validSortFields = ['rating', 'createdAt'];
    if (!validSortFields.includes(sortBy)) {
      throw new ValidationError('Nieprawidłowe pole sortowania');
    }

    const reviews = await Review.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Reviewer', attributes: ['id', 'name', 'email'] }
      ],
      order: [[sortBy, order.toUpperCase()]]
    });

    logger.info(`Pobrano ${reviews.length} recenzji dla użytkownika ID: ${userId}`);
    res.json({
      status: 'success',
      data: { reviews },
      filters: { minRating, maxRating, startDate, endDate, sortBy, order }
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
      logger.error(`Błąd podczas pobierania recenzji: ${error.message}`, error);
      res.status(500).json({
        status: 'error',
        message: 'Wystąpił błąd podczas pobierania recenzji'
      });
    }
  }
});

module.exports = router;
