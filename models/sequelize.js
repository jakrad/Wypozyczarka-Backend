// models/sequelize.js
const { Sequelize } = require('sequelize');
require('dotenv').config(); // Ładowanie zmiennych środowiskowych z pliku .env

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: false // Opcjonalnie, wyłącza logowanie SQL
});

// Testowanie połączenia
sequelize.authenticate()
  .then(() => {
    console.log('sequelize.js: Połączenie z bazą danych zostało nawiązane pomyślnie.');
  })
  .catch(err => {
    console.error('sequelize.js: Błąd podczas łączenia z bazą danych:', err);
  });

module.exports = sequelize;
