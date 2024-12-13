// models/index.js
const sequelize = require('./sequelize');
const User = require('./User');
const Tool = require('./Tool');
const Review = require('./Review');
const ToolImage = require('./ToolImage');
const Favorite = require('./Favorite');

// Definiowanie relacji:

// User - Tool
User.hasMany(Tool, { foreignKey: 'userId', onDelete: 'CASCADE' });
Tool.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Review - relacje z User
User.hasMany(Review, { as: 'GivenReviews', foreignKey: 'reviewerUserId', onDelete: 'CASCADE' });
User.hasMany(Review, { as: 'ReceivedReviews', foreignKey: 'reviewedUserId', onDelete: 'CASCADE' });
Review.belongsTo(User, { as: 'Reviewer', foreignKey: 'reviewerUserId' });
Review.belongsTo(User, { as: 'Reviewed', foreignKey: 'reviewedUserId' });

// ToolImage - należy do Tool
ToolImage.belongsTo(Tool, { foreignKey: 'toolId', onDelete: 'CASCADE' });
Tool.hasMany(ToolImage, { foreignKey: 'toolId', onDelete: 'CASCADE' });

// Favorite - relacja Many-to-Many User <-> Tool
User.belongsToMany(Tool, { through: Favorite, foreignKey: 'userId', otherKey: 'toolId' });
Tool.belongsToMany(User, { through: Favorite, foreignKey: 'toolId', otherKey: 'userId' });

// Dodanie asocjacji dla Favorite
Favorite.belongsTo(User, { foreignKey: 'userId' });
Favorite.belongsTo(Tool, { foreignKey: 'toolId' });
User.hasMany(Favorite, { foreignKey: 'userId' });
Tool.hasMany(Favorite, { foreignKey: 'toolId' });

async function initModels() {
  try {
    await sequelize.authenticate();
    console.log('Połączenie z bazą danych zostało nawiązane pomyślnie.');
    await sequelize.sync({ alter: true }); // Synchronizacja modeli z bazą danych
    console.log('Modele zostały zsynchronizowane z bazą danych.');
  } catch (error) {
    console.error('Błąd podczas inicjalizacji modeli:', error);
  }
}

module.exports = { 
  User,
  Tool,
  Review,
  ToolImage,
  Favorite,
  initModels
};
