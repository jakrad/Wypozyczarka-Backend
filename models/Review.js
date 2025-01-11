// models/Review.js
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const User = require('./User');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reviewerUserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reviewedUserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'review',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['reviewer_user_id', 'reviewed_user_id']
    }
  ]
});

// Relationships are defined in index.js

module.exports = Review;
