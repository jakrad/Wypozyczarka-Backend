// routes/reviews.js
const express = require('express');
const router = express.Router();
const { Review, User } = require('../models');
const auth = require('../middleware/auth');

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', auth, async (req, res) => {
  const { reviewedUserId, rating, comment } = req.body;
  const reviewerUserId = req.user.userId;

  try {
    const reviewer = await User.findByPk(reviewerUserId);
    const reviewed = await User.findByPk(reviewedUserId);

    if (!reviewer || !reviewed) {
      return res.status(400).json({ message: 'Nieprawidłowy użytkownik' });
    }

    // Sprawdź czy recenzja już istnieje
    const existingReview = await Review.findOne({ where: { reviewerUserId, reviewedUserId } });
    if (existingReview) {
      return res.status(400).json({ message: 'Recenzja już istnieje' });
    }

    const review = await Review.create({
      reviewerUserId,
      reviewedUserId,
      rating,
      comment
    });

    res.status(201).json({ message: 'Recenzja dodana pomyślnie', reviewId: review.id });
  } catch (error) {
    console.error('Błąd podczas dodawania recenzji:', error);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res) => {
  const { reviewedUserId } = req.query;

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
  } catch (error) {
    console.error('Błąd podczas pobierania recenzji:', error);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', auth, async (req, res) => {
  const reviewId = req.params.id;
  const { rating, comment } = req.body;
  const reviewerUserId = req.user.userId;

  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Recenzja nie znaleziona' });
    }

    // Sprawdź czy recenzja należy do zalogowanego użytkownika
    if (review.reviewerUserId !== reviewerUserId) {
      return res.status(403).json({ message: 'Brak uprawnień do aktualizacji tej recenzji' });
    }

    // Aktualizacja pola rating i comment jeśli podane
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    res.json({ message: 'Recenzja zaktualizowana pomyślnie', review });
  } catch (error) {
    console.error('Błąd podczas aktualizacji recenzji:', error);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', auth, async (req, res) => {
  const reviewId = req.params.id;
  const reviewerUserId = req.user.userId;

  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Recenzja nie znaleziona' });
    }

    // Sprawdź czy recenzja należy do zalogowanego użytkownika
    if (review.reviewerUserId !== reviewerUserId) {
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia tej recenzji' });
    }

    await review.destroy();

    res.json({ message: 'Recenzja usunięta pomyślnie' });
  } catch (error) {
    console.error('Błąd podczas usuwania recenzji:', error);
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
 *     responses:
 *       200:
 *         description: List of reviews for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
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
router.get('/reviewed/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    const reviews = await Review.findAll({
      where: { reviewedUserId: userId },
      include: [
        { model: User, as: 'Reviewer', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json(reviews);
  } catch (error) {
    console.error('Błąd podczas pobierania recenzji:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});


module.exports = router;
