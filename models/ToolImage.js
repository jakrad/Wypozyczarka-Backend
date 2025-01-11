// models/ToolImage.js
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const ToolImage = sequelize.define('ToolImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  toolId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'tool_image',
  timestamps: true,
  underscored: true
});

// Relationships are defined in index.js

module.exports = ToolImage;
