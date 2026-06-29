export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "PharmaFlow API",
    description:
      "REST API for the PharmaFlow pharmaceutical inventory management and ordering system.\n\n" +
      "## Authentication\n" +
      "Most endpoints require a session cookie obtained via `POST /api/auth/callback/credentials`.\n" +
      "Staff/Admin endpoints additionally require the `ADMIN` or `STAFF` role.\n\n" +
      "## Roles\n" +
      "- **ADMIN** — full access\n" +
      "- **STAFF** — inventory and order management\n" +
      "- **CUSTOMER** — ordering portal only",
    version: "1.0.0",
    contact: {
      name: "PharmaFlow Support",
    },
  },
  servers: [
    {
      url: "/api",
      description: "Current server",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication endpoints (NextAuth.js)" },
    { name: "Inventory", description: "Product catalog and stock management" },
    { name: "Import", description: "Stock import via CSV / Excel upload" },
    { name: "Orders", description: "Order placement and management" },
    { name: "CRM", description: "Companies and contacts" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "Session token set after login",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Unauthorized" },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxyz1234" },
          sku: { type: "string", example: "AMX500-CAP" },
          name: { type: "string", example: "Amoxicillin 500mg Capsules" },
          genericName: { type: "string", nullable: true, example: "Amoxicillin" },
          manufacturer: { type: "string", nullable: true, example: "Pharma Corp" },
          category: { type: "string", nullable: true, example: "Antibiotics" },
          unit: { type: "string", example: "box" },
          unitPrice: { type: "string", example: "12.50" },
          requiresPrescription: { type: "boolean", example: false },
          isActive: { type: "boolean", example: true },
          stockAvailable: { type: "integer", example: 200 },
          nearestExpiry: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ImportJob: {
        type: "object",
        properties: {
          id: { type: "string" },
          fileName: { type: "string", example: "stock-jan-2026.csv" },
          status: {
            type: "string",
            enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "PARTIAL"],
          },
          totalRows: { type: "integer" },
          importedRows: { type: "integer" },
          failedRows: { type: "integer" },
          errors: {
            type: "array",
            nullable: true,
            items: {
              type: "object",
              properties: {
                row: { type: "integer" },
                message: { type: "string" },
              },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          orderNumber: { type: "string", example: "ORD-2026-0001" },
          status: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
          },
          totalAmount: { type: "string", example: "1250.00" },
          notes: { type: "string", nullable: true },
          companyId: { type: "string", nullable: true },
          contactId: { type: "string", nullable: true },
          placedAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          fulfilledAt: { type: "string", format: "date-time", nullable: true },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                productId: { type: "string" },
                quantity: { type: "integer" },
                unitPrice: { type: "string" },
              },
            },
          },
        },
      },
      Company: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "HealthCare Distributors Inc." },
          industry: { type: "string", nullable: true },
          address: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          country: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          website: { type: "string", nullable: true },
          taxId: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Contact: {
        type: "object",
        properties: {
          id: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string", nullable: true },
          title: { type: "string", nullable: true },
          department: { type: "string", nullable: true },
          companyId: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/inventory/products": {
      get: {
        tags: ["Inventory"],
        summary: "List products",
        description: "Returns paginated product catalog with current stock levels.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "search",
            in: "query",
            description: "Search by name, SKU, or generic name",
            schema: { type: "string" },
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Product list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    products: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Product" },
                    },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pages: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/inventory/import": {
      post: {
        tags: ["Import"],
        summary: "Import stock from CSV or Excel",
        description:
          "Upload a CSV or Excel file to bulk-import product batches. " +
          "Required columns: `sku`, `name`, `batch_number`, `expiry_date`, `quantity`, `unit_price`.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "CSV, XLSX, or XLS file",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Import result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobId: { type: "string" },
                    importedRows: { type: "integer" },
                    failedRows: { type: "integer" },
                    errors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          row: { type: "integer" },
                          message: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Missing or invalid file" },
          "401": { description: "Unauthorized (ADMIN or STAFF only)" },
          "422": { description: "File could not be parsed" },
        },
      },
      get: {
        tags: ["Import"],
        summary: "List import jobs",
        description: "Returns history of all stock import jobs.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Import job list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ImportJob" },
                    },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pages: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "List orders",
        description: "Returns all orders. Staff/Admin see all; Customers see their own.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
            },
          },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          "200": {
            description: "Order list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    orders: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Order" },
                    },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pages: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Place an order",
        description: "Customer places an order. Notifies pharma staff via system alert.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  notes: { type: "string" },
                  items: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: { type: "string" },
                        quantity: { type: "integer", minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Order created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "400": { description: "Validation error or insufficient stock" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order by ID",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Order detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "404": { description: "Not found" },
        },
      },
      patch: {
        tags: ["Orders"],
        summary: "Update order status",
        description: "Staff/Admin only — update order status.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated order",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
    },
    "/crm/companies": {
      get: {
        tags: ["CRM"],
        summary: "List companies",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          "200": {
            description: "Company list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    companies: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Company" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["CRM"],
        summary: "Create company",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  industry: { type: "string" },
                  address: { type: "string" },
                  city: { type: "string" },
                  country: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string", format: "email" },
                  website: { type: "string" },
                  taxId: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Company created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Company" },
              },
            },
          },
        },
      },
    },
    "/crm/contacts": {
      get: {
        tags: ["CRM"],
        summary: "List contacts",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "companyId", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          "200": {
            description: "Contact list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    contacts: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Contact" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["CRM"],
        summary: "Create contact",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["firstName", "lastName", "email"],
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string" },
                  title: { type: "string" },
                  department: { type: "string" },
                  companyId: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Contact created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Contact" },
              },
            },
          },
        },
      },
    },
  },
};
