// models/sequelize.js

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config(); // Ładowanie zmiennych środowiskowych z pliku .env

// Walidacja wymaganych zmiennych środowiskowych
const requiredEnvs = ['DB_NAME', 'DB_USERNAME', 'DB_PASSWORD', 'DB_HOST', 'NODE_ENV'];
const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length) {
  logger.error(`Brak wymaganych zmiennych środowiskowych: ${missingEnvs.join(', ')}`);
  process.exit(1);
}

// Inicjalizacja Sequelize bez opcji 'sync'
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.info(msg) : false,
  dialectOptions: process.env.DB_SSL === 'true' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  } : {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    max: 3,
    match: [
      /ER_LOCK_DEADLOCK/,
      /ER_LOCK_WAIT_TIMEOUT/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /EHOSTUNREACH/,
      /EPIPE/,
    ],
  },
});

// Usunięcie funkcji initDatabase i wywołania sequelize.sync()

module.exports = sequelize;
