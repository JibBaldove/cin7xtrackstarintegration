# Cin7 x Trackstar Integration

A monorepo containing the integration between Cin7 and Trackstar, including an admin UI for tenant configuration management.

## Project Structure

```
cin7xtrackstarintegration/
├── frontend/              # React + Vite admin UI
├── shared/                # Shared TypeScript types
├── playwright-tests/      # API integration tests
├── tenantConfigs/         # Tenant configuration JSON files
├── tenantConfigParser.js  # Lambda handler utilities for config management
└── *.js                   # Integration mapping scripts
```

## Components

### Frontend (Admin UI)

A React application built with Vite that allows tenants to view and manage their integration configurations.

**Features:**
- Tenant login with tenant ID and API key
- View and edit sync configurations
- Manage webhook URLs and events
- Configure location mappings and warehouse connections
- Manage substitution lists for field mappings

**Tech Stack:**
- React 19
- TypeScript
- Vite
- React Router
- Axios
- TanStack Query

### Shared Types

TypeScript type definitions shared between frontend and backend, including:
- `TenantConfig` - Main configuration structure
- `SyncConfig` - Sync entity and webhook configuration
- `LocationMapping` - Warehouse and connection mappings
- `SubstitutionList` - Field value substitution rules

### Backend (AWS Lambda)

Lambda handler utilities for managing tenant configurations stored in PostgreSQL.

**Available Functions:**
- `parseTenantConfig()` - Parse config from database
- `prepareTenantConfigForDB()` - Prepare config for storage
- `validateTenantConfig()` - Validate configuration structure
- `getTenantConfigHandler()` - Lambda handler for GET requests
- `updateTenantConfigHandler()` - Lambda handler for UPDATE requests

## Getting Started

### Prerequisites

- Node.js 22.x or higher
- npm or yarn
- PostgreSQL database (for backend)
- AWS Lambda setup (for backend)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cin7xtrackstarintegration
```

2. Install root dependencies:
```bash
npm install
```

3. Install all workspace dependencies:
```bash
cd frontend && npm install
cd ../shared && npm install
cd ../playwright-tests && npm install
```

### Frontend Setup

1. Copy the environment example file:
```bash
cd frontend
cp .env.example .env
```

2. Update `.env` with your API configuration:
```env
VITE_API_BASE_URL=https://live.fastn.ai/api/v1
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Shared Types

Build the shared types package:
```bash
cd shared
npm run build
```

### Backend Setup

The backend handler code is in `tenantConfigParser.js`. To use it:

1. Deploy the Lambda functions to AWS
2. Configure PostgreSQL connection
3. Set up API Gateway endpoints:
   - `GET /tenants/{tenantId}/config` - Get tenant configuration
   - `PUT /tenants/{tenantId}/config` - Update tenant configuration

**Database Schema Example:**
```sql
CREATE TABLE tenant_configs (
  tenant_id VARCHAR(255) PRIMARY KEY,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenant_api_key ON tenant_configs ((config->>'apiKey'));
```

## Usage

### Admin UI Workflow

1. **Login:**
   - Navigate to the login page
   - Enter your tenant ID (e.g., "earthbreeze")
   - Enter your API key
   - Click "Login"

2. **Manage Sync Configuration:**
   - Add/remove sync entities (sale, purchase, inventory)
   - Configure webhooks for each entity
   - Set webhook URLs and events
   - Enable/disable sync configurations

3. **Manage Location Mappings:**
   - Add/remove location connections
   - Map warehouses to connection IDs
   - Configure substitution lists for field transformations
   - Add key-value mappings for field substitutions

4. **Save Changes:**
   - Review your changes
   - Click "Save Changes"
   - Changes are immediately applied to your tenant configuration

### Backend API Usage

```javascript
const { apiClient } = require('./path/to/client');

// Authenticate
apiClient.setAuth('earthbreeze', 'your-api-key');

// Get tenant config
const config = await apiClient.getTenantConfig();

// Update tenant config
const updatedConfig = {
  apiKey: 'your-api-key',
  syncConfig: [...],
  locationMapping: [...]
};
await apiClient.updateTenantConfig(updatedConfig);
```

### Lambda Handler Integration

```javascript
const { getTenantConfigHandler, updateTenantConfigHandler } = require('./tenantConfigParser');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// GET handler
exports.getTenantConfig = async (event, context) => {
  const client = await pool.connect();
  try {
    return await getTenantConfigHandler(event, context, client);
  } finally {
    client.release();
  }
};

// UPDATE handler
exports.updateTenantConfig = async (event, context) => {
  const client = await pool.connect();
  try {
    return await updateTenantConfigHandler(event, context, client);
  } finally {
    client.release();
  }
};
```

## Development

### Running All Components

From the root directory:

```bash
# Run frontend and backend in parallel
npm run dev

# Run only frontend
npm run dev:frontend

# Run only backend
npm run dev:backend

# Build all components
npm run build

# Run tests
npm run test
```

### Project Scripts

**Root:**
- `npm run dev` - Run frontend and backend concurrently
- `npm run build` - Build shared types and frontend
- `npm test` - Run Playwright tests

**Frontend:**
- `npm run dev` - Start Vite dev server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build

**Shared:**
- `npm run build` - Compile TypeScript types
- `npm run watch` - Watch mode for development

## Configuration

### Tenant Config Structure

```typescript
interface TenantConfig {
  apiKey: string;
  syncConfig: SyncConfig[];
  locationMapping: LocationMapping[];
}

interface SyncConfig {
  entity: 'sale' | 'purchase' | 'inventory';
  status: 'Active' | 'Inactive';
  webhook: Webhook[];
}

interface Webhook {
  url: string;
  event: string;
  status: 'Active' | 'Inactive';
}

interface LocationMapping {
  warehouses: { [warehouseName: string]: string };
  connectionId: string;
  substitutionList?: SubstitutionList[];
}

interface SubstitutionList {
  listName: string;
  mapping: { [key: string]: string };
}
```

### Example Configuration

```json
{
  "apiKey": "9e8a14d0-b3c6-4a47-b821-126c56cce6da",
  "syncConfig": [
    {
      "entity": "sale",
      "status": "Active",
      "webhook": [
        {
          "url": "https://live.fastn.ai/api/v1/webhooks/sync_salesorder",
          "event": "Sale/PickAuthorised",
          "status": "Active"
        }
      ]
    }
  ],
  "locationMapping": [
    {
      "warehouses": {
        "US Warehouse": "944fc263-a8e9-4e89-9cbf-bdd5ad3afa04"
      },
      "connectionId": "earthbreeze-us",
      "substitutionList": [
        {
          "listName": "country",
          "mapping": {
            "United States": "US",
            "Canada": "CA"
          }
        }
      ]
    }
  ]
}
```

## Security

- **Authentication:** Tenant ID and API key required for all operations
- **Authorization:** Each tenant can only access their own configuration
- **API Keys:** Stored securely in PostgreSQL, validated on every request
- **HTTPS:** All API communication over HTTPS
- **Environment Variables:** Sensitive configuration stored in `.env` files (not committed)

## Testing

Run the Playwright API tests:

```bash
cd playwright-tests
npm test

# Run specific test suites
npm run test:sales
npm run test:purchase

# Debug mode
npm run test:debug
```

## Deployment

### Frontend

Build and deploy the frontend:

```bash
cd frontend
npm run build
```

Deploy the `dist/` folder to your hosting service (Vercel, Netlify, S3, etc.)

### Backend

1. Package the Lambda functions with dependencies
2. Deploy to AWS Lambda
3. Configure API Gateway
4. Set up PostgreSQL database
5. Configure environment variables

## Troubleshooting

### Frontend won't start
- Ensure Node.js version is 22.x or higher
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check `.env` file exists and has correct API URL

### Can't login
- Verify tenant ID matches database record
- Verify API key is correct
- Check backend API is running and accessible
- Check browser console for errors

### Changes not saving
- Check network tab for failed API requests
- Verify tenant has permission to update config
- Check backend logs for validation errors

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

ISC
