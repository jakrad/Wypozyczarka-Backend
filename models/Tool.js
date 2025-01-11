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
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false, 
    validate: {
      min: -180,
      max: 180
    }
  }
}, {
  tableName: 'tool',
  timestamps: true,
  underscored: true
});

module.exports = Tool;
