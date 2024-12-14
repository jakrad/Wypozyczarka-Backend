// swagger.js
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
        // Existing Schemas
        Favorite: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the favorite',
              example: 1,
            },
            userId: {
              type: 'integer',
              description: 'ID of the user who favorited the tool',
              example: 123,
            },
            toolId: {
              type: 'integer',
              description: 'ID of the favorited tool',
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
        // New Schemas

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
            },
            role: {
              type: 'string',
              description: 'User role',
              example: 'user',
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
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Błąd serwera',
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
          },
        },
        AddToolRequest: {
          type: 'object',
          required: ['name', 'description', 'category', 'pricePerDay', 'location'],
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
            location: {
              type: 'string',
              description: 'Location where the tool is available',
              example: 'Warsaw',
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
            location: {
              type: 'string',
              description: 'Location where the tool is available',
              example: 'Krakow',
            },
          },
        },
        AddToolImageRequest: {
          type: 'object',
          required: ['imageUrl'],
          properties: {
            imageUrl: {
              type: 'string',
              format: 'url',
              description: 'URL of the tool image',
              example: 'http://example.com/images/tool1.jpg',
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
