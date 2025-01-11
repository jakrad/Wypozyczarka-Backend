// models/User.js

const { DataTypes } = require("sequelize");
const sequelize = require("./sequelize");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100], // min 8 characters
      },
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^\+?[\d\s-]{8,}$/, // phone number format
      },
    },
    lastLogin: {
      type: DataTypes.BIGINT, // Stores timestamp in milliseconds
      allowNull: true,
    },
  },
  {
    tableName: "user",
    timestamps: true,
    underscored: true,
  }
);

// Relationships are defined in index.js

module.exports = User;
