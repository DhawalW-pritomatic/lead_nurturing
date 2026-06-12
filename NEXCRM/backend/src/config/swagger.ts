import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from '../config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NexCRM API Documentation',
      version: '1.0.0',
      description: 'Multi-tenant CRM platform for vertical-specific lead management and outreach automation',
      contact: {
        name: 'NexCRM Support',
        email: 'support@nexcrm.io',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: config.baseUrl,
        description: 'Development server',
      },
      {
        url: 'https://api.nexcrm.io',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization header using the Bearer scheme',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Refresh token stored in HTTP-only cookie',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code',
            },
          },
        },
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            company: { type: 'string', nullable: true },
            city: { type: 'string', nullable: true },
            source: { type: 'string' },
            status: {
              type: 'string',
              enum: ['NEW', 'ACTIVE', 'ENGAGED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST', 'OPTED_OUT', 'FAILED'],
            },
            lead_type: {
              type: 'string',
              enum: ['COLD', 'WARM', 'HOT', 'FAILED', 'CONVERTED', 'LOST'],
            },
            score: { type: 'integer', minimum: 0, maximum: 200 },
            opted_out: { type: 'boolean' },
            gdpr_consent: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['super_admin', 'tenant_admin', 'sales_manager', 'senior_sales_rep', 'sales_rep'],
            },
            phone: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Template: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' },
            category: {
              type: 'string',
              enum: ['welcome', 'onboarding', 'follow_up', 'discount', 'post_purchase', 'reengagement'],
            },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Sequence: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            trigger_type: {
              type: 'string',
              enum: ['enrollment', 'score_change', 'failed', 'conversion'],
            },
            lead_type_target: {
              type: 'string',
              enum: ['COLD', 'WARM', 'HOT', 'FAILED', 'CONVERTED'],
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'archived'],
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'integer' },
                  channel: { type: 'string' },
                  template_category: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have required permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests - rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Leads', description: 'Lead management' },
      { name: 'Outreach', description: 'Email outreach and tracking' },
      { name: 'Templates', description: 'Email template management' },
      { name: 'Sequences', description: 'Automated email sequences' },
      { name: 'Routing', description: 'Lead routing rules' },
      { name: 'Scoring', description: 'Lead scoring system' },
      { name: 'Assets', description: 'Asset library management' },
      { name: 'Users', description: 'User management' },
      { name: 'Dashboard', description: 'Analytics and reporting' },
      { name: 'Tenants', description: 'Multi-tenant management' },
      { name: 'Admin', description: 'Super admin operations' },
      { name: 'Bulk Import', description: 'CSV bulk import' },
      { name: 'Notifications', description: 'System notifications' },
    ],
  },
  apis: [
    './src/modules/*/routes.ts',
    './src/modules/*/controllers/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'NexCRM API Documentation',
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
};

export default swaggerSpec;
