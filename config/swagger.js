const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Dermalyze API",
      version: "1.0.0",
      description: "AI-Powered Skin Monitoring Platform API",
    },
    servers: [{ url: "http://localhost:5050/api" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./routes/*.js"],
};

module.exports = swaggerJsdoc(options);
