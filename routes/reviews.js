// routes/reviews.js
const express = require('express');
const router = express.Router();
const { Review, User } = require('../models');
const auth = require('../middleware/auth');

// Dodawanie nowej recenzji
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

// Pobieranie recenzji
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

// Aktualizacja recenzji (PUT /api/reviews/:id)
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

// Usuwanie recenzji (DELETE /api/reviews/:id)
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

module.exports = router;
