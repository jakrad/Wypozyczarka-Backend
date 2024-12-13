// models/Tool.js
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const User = require('./User');

const Tool = sequelize.define('Tool', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { 
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  category: {
    type: DataTypes.STRING
  },
  pricePerDay: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'tool',
  timestamps: true,
  underscored: true
});

// Relacje w index.js

module.exports = Tool;
