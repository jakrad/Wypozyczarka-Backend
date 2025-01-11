// config/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wypozyczarka API',
      version: '1.0.0',
      description: 'API for managing tools, reviews, favorites, and user accounts',
    },
    servers: [
      {
        url: 'https://localhost:3000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format **Bearer <token>**',
        },
      },
      schemas: {
        // User Schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the user',
              example: 123,
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number',
              example: '+123456789',
            },
            profileImage: {
              type: 'string',
              format: 'url',
              description: 'URL to the user profile image',
              example: 'http://example.com/images/profile.jpg',
              nullable: true,
            },
            role: {
              type: 'string',
              description: 'User role',
              example: 'user',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the user was created',
              example: '2024-04-27T10:20:30Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the user was last updated',
              example: '2024-04-27T10:20:30Z',
            },
            lastLogin: {
              type: 'integer',
              description: 'Timestamp of the last user login in milliseconds',
              example: 1682582400000,
              nullable: true,
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password',
              example: 'SecurePass123!',
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            phoneNumber: {
              type: 'string',
              description: 'User phone number',
              example: '+123456789',
            },
            profileImage: {
              type: 'string',
              format: 'url',
              description: 'URL to the user profile image',
              example: 'http://example.com/images/profile.jpg',
              nullable: true,
            },
            role: {
              type: 'string',
              description: 'User role',
              example: 'user',
              nullable: true,
            },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Użytkownik zarejestrowany pomyślnie',
            },
            userId: {
              type: 'integer',
              example: 123,
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password',
              example: 'SecurePass123!',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Zalogowano pomyślnie',
            },
            token: {
              type: 'string',
              description: 'JWT token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['error'],
              example: 'error',
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR',
            },
            message: {
              type: 'string',
              example: 'Błąd serwera',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-04-27T10:20:30Z',
            },
            path: {
              type: 'string',
              example: '/users/login',
            },
            method: {
              type: 'string',
              example: 'POST',
            },
            ip: {
              type: 'string',
              example: '192.168.1.1',
            },
            userId: {
              type: 'integer',
              example: 123,
              nullable: true,
            },
            stack: {
              type: 'string',
              description: 'Error stack trace',
              example: 'Error: Something went wrong...\n    at ...',
              nullable: true,
            },
          },
        },

        // Tool Schemas
        Tool: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the tool',
              example: 456,
            },
            userId: {
              type: 'integer',
              description: 'ID of the user who owns the tool',
              example: 123,
            },
            name: {
              type: 'string',
              description: 'Name of the tool',
              example: 'Hammer',
            },
            description: {
              type: 'string',
              description: 'Description of the tool',
              example: 'A tool for hitting nails',
            },
            category: {
              type: 'string',
              description: 'Category of the tool',
              example: 'Construction',
            },
            pricePerDay: {
              type: 'number',
              format: 'float',
              description: 'Rental price per day',
              example: 10.5,
            },
            location: {
              type: 'string',
              description: 'Location where the tool is available',
              example: 'Warsaw',
            },
            latitude: {
              type: 'number',
              description: 'Latitude of the tool location',
              example: 52.2297,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the tool location',
              example: 21.0122,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the tool was created',
              example: '2024-04-27T10:20:30Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the tool was last updated',
              example: '2024-04-27T10:20:30Z',
            },
            User: {
              $ref: '#/components/schemas/User',
            },
            ToolImages: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ToolImage',
              },
            },
          },
        },
        AddToolRequest: {
          type: 'object',
          required: ['name', 'description', 'category', 'pricePerDay', 'latitude', 'longitude'],
          properties: {
            name: {
              type: 'string',
              description: 'Name of the tool',
              example: 'Hammer',
            },
            description: {
              type: 'string',
              description: 'Description of the tool',
              example: 'A tool for hitting nails',
            },
            category: {
              type: 'string',
              description: 'Category of the tool',
              example: 'Construction',
            },
            pricePerDay: {
              type: 'number',
              format: 'float',
              description: 'Rental price per day',
              example: 10.5,
            },
            latitude: {
              type: 'number',
              description: 'Latitude of the tool location',
              example: 52.2297,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the tool location',
              example: 21.0122,
            },
          },
        },
        AddToolResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Narzędzie dodane pomyślnie',
            },
            toolId: {
              type: 'integer',
              example: 789,
            },
          },
        },
        UpdateToolRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the tool',
              example: 'Hammer',
            },
            description: {
              type: 'string',
              description: 'Description of the tool',
              example: 'A tool for hitting nails',
            },
            category: {
              type: 'string',
              description: 'Category of the tool',
              example: 'Construction',
            },
            pricePerDay: {
              type: 'number',
              format: 'float',
              description: 'Rental price per day',
              example: 12.0,
            },
            latitude: {
              type: 'number',
              description: 'Latitude of the tool location',
              example: 50.0647,
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the tool location',
              example: 19.9450,
            },
          },
        },
        AddToolImageRequest: {
          type: 'object',
          required: ['image'],
          properties: {
            image: {
              type: 'string',
              format: 'binary',
              description: 'Image file to upload',
            },
          },
        },
        AddToolImageResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Obraz dodany pomyślnie',
            },
            toolImageId: {
              type: 'integer',
              example: 101,
            },
          },
        },
        ToolImage: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the tool image',
              example: 101,
            },
            toolId: {
              type: 'integer',
              description: 'ID of the tool',
              example: 456,
            },
            imageUrl: {
              type: 'string',
              format: 'url',
              description: 'URL of the tool image',
              example: 'http://example.com/images/tool1.jpg',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the image was added',
              example: '2024-04-27T10:20:30Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the image was last updated',
              example: '2024-04-27T10:20:30Z',
            },
          },
        },

        // Review Schemas
        Review: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the review',
              example: 202,
            },
            reviewerUserId: {
              type: 'integer',
              description: 'ID of the user who wrote the review',
              example: 123,
            },
            reviewedUserId: {
              type: 'integer',
              description: 'ID of the user being reviewed',
              example: 456,
            },
            rating: {
              type: 'integer',
              description: 'Rating given by the reviewer',
              example: 5,
              minimum: 1,
              maximum: 5,
            },
            comment: {
              type: 'string',
              description: 'Comment provided by the reviewer',
              example: 'Great experience!',
            },
            Reviewer: {
              $ref: '#/components/schemas/User',
            },
            Reviewed: {
              $ref: '#/components/schemas/User',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the review was created',
              example: '2024-04-27T10:20:30Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the review was last updated',
              example: '2024-04-27T10:20:30Z',
            },
          },
        },
        AddReviewRequest: {
          type: 'object',
          required: ['reviewedUserId', 'rating', 'comment'],
          properties: {
            reviewedUserId: {
              type: 'integer',
              description: 'ID of the user to be reviewed',
              example: 456,
            },
            rating: {
              type: 'integer',
              description: 'Rating given by the reviewer',
              example: 5,
              minimum: 1,
              maximum: 5,
            },
            comment: {
              type: 'string',
              description: 'Comment provided by the reviewer',
              example: 'Great experience!',
            },
          },
        },
        AddReviewResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Recenzja dodana pomyślnie',
            },
            reviewId: {
              type: 'integer',
              example: 202,
            },
          },
        },
        UpdateReviewRequest: {
          type: 'object',
          properties: {
            rating: {
              type: 'integer',
              description: 'Updated rating',
              example: 4,
              minimum: 1,
              maximum: 5,
            },
            comment: {
              type: 'string',
              description: 'Updated comment',
              example: 'Good experience overall.',
            },
          },
        },

        // Profile Image Schemas
        AddProfileImageResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Profile image updated successfully',
            },
            imageUrl: {
              type: 'string',
              format: 'url',
              example: 'http://example.com/images/profile123.jpeg',
            },
          },
        },
        DeleteProfileImageResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Profile image deleted successfully',
            },
          },
        },

        // Favorite Schemas
        AddFavoriteRequest: {
          type: 'object',
          required: ['toolId'],
          properties: {
            toolId: {
              type: 'integer',
              description: 'ID of the tool to add to favorites',
              example: 456,
            },
          },
        },
        AddFavoriteResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Ulubione dodane pomyślnie',
            },
            favoriteId: {
              type: 'integer',
              example: 789,
            },
          },
        },
        Favorite: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the favorite',
              example: 789,
            },
            userId: {
              type: 'integer',
              description: 'ID of the user who favorited the tool',
              example: 123,
            },
            toolId: {
              type: 'integer',
              description: 'ID of the tool that was favorited',
              example: 456,
            },
            Tool: {
              $ref: '#/components/schemas/Tool',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the favorite was created',
              example: '2024-04-27T10:20:30Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the favorite was last updated',
              example: '2024-04-27T10:20:30Z',
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Favorites',
        description: 'API for managing user favorite tools',
      },
      {
        name: 'Reviews',
        description: 'API for managing user reviews',
      },
      {
        name: 'Tools',
        description: 'API for managing tools and their images',
      },
      {
        name: 'Users',
        description: 'API for user registration, authentication, and profile management',
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;