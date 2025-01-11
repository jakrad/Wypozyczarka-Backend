// models/index.js
const sequelize = require('./sequelize');
const User = require('./User');
const Tool = require('./Tool');
const Review = require('./Review');
const ToolImage = require('./ToolImage');
const Favorite = require('./Favorite');

// Defining relationships:

// User - Tool
User.hasMany(Tool, { foreignKey: 'userId', onDelete: 'CASCADE' });
Tool.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Review - relationships with User
User.hasMany(Review, { as: 'GivenReviews', foreignKey: 'reviewerUserId', onDelete: 'CASCADE' });
User.hasMany(Review, { as: 'ReceivedReviews', foreignKey: 'reviewedUserId', onDelete: 'CASCADE' });
Review.belongsTo(User, { as: 'Reviewer', foreignKey: 'reviewerUserId' });
Review.belongsTo(User, { as: 'Reviewed', foreignKey: 'reviewedUserId' });

// ToolImage - belongs to Tool
ToolImage.belongsTo(Tool, { foreignKey: 'toolId', onDelete: 'CASCADE' });
Tool.hasMany(ToolImage, { foreignKey: 'toolId', onDelete: 'CASCADE' });

// Favorite - Many-to-Many User <-> Tool
User.belongsToMany(Tool, { through: Favorite, foreignKey: 'userId', otherKey: 'toolId', as: 'FavoriteTools' });
Tool.belongsToMany(User, { through: Favorite, foreignKey: 'toolId', otherKey: 'userId', as: 'FavoritedByUsers' });

// Adding associations for Favorite
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'User' });
Favorite.belongsTo(Tool, { foreignKey: 'toolId', as: 'Tool' });
User.hasMany(Favorite, { foreignKey: 'userId', as: 'Favorites' });
Tool.hasMany(Favorite, { foreignKey: 'toolId', as: 'Favorites' });

async function initModels() {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');
    await sequelize.sync({ alter: true }); // Synchronize models with the database
    console.log('Models have been synchronized with the database.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
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
