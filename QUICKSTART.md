# Quick Start Guide

## What Was Created

Your monorepo now includes:

1. **Frontend Admin UI** (`/frontend`)
   - React + Vite application
   - Tenant login with API key authentication
   - Config editor for sync settings and location mappings
   - Built and ready to deploy

2. **Shared Types** (`/shared`)
   - TypeScript interfaces for tenant configurations
   - Shared between frontend and backend
   - Compiled and ready to use

3. **Backend Parser** (`tenantConfigParser.js`)
   - Lambda handler utilities
   - PostgreSQL integration
   - Config validation and parsing functions

4. **Documentation**
   - Comprehensive README.md
   - This quick start guide

## Running Locally

### 1. Start the Frontend

```bash
cd frontend
npm run dev
```

Visit: `http://localhost:5173`

### 2. Login Credentials

Use your tenant credentials:
- **Tenant ID**: Your tenant identifier (e.g., "earthbreeze")
- **API Key**: Your tenant's API key from the config

### 3. Test with Existing Config

The UI will load the config from your backend API and allow you to:
- View current sync configurations
- Add/edit/remove webhook configurations
- Manage location mappings
- Save changes back to the database

## Backend Integration

### PostgreSQL Setup

Create the tenant configs table:

```sql
CREATE TABLE tenant_configs (
  tenant_id VARCHAR(255) PRIMARY KEY,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenant_api_key ON tenant_configs ((config->>'apiKey'));
```

### Lambda Setup

1. Create two Lambda functions:
   - `getTenantConfig` - GET /tenants/{tenantId}/config
   - `updateTenantConfig` - PUT /tenants/{tenantId}/config

2. Use the handlers from `tenantConfigParser.js`:

```javascript
const { getTenantConfigHandler, updateTenantConfigHandler } = require('./tenantConfigParser');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

exports.handler = async (event, context) => {
  const client = await pool.connect();
  try {
    if (event.httpMethod === 'GET') {
      return await getTenantConfigHandler(event, context, client);
    } else if (event.httpMethod === 'PUT') {
      return await updateTenantConfigHandler(event, context, client);
    }
  } finally {
    client.release();
  }
};
```

3. Set up API Gateway to route:
   - `GET /tenants/{tenantId}/config` → getTenantConfig Lambda
   - `PUT /tenants/{tenantId}/config` → updateTenantConfig Lambda

### Migrate Existing Configs

You can migrate your existing JSON configs from `/tenantConfigs` to PostgreSQL:

```sql
-- Example for earthbreeze
INSERT INTO tenant_configs (tenant_id, config)
VALUES (
  'earthbreeze',
  '{"apiKey": "9e8a14d0-b3c6-4a47-b821-126c56cce6da", "syncConfig": [...], "locationMapping": [...]}'::jsonb
);
```

## Deployment

### Frontend Deployment

Build for production:
```bash
cd frontend
npm run build
```

Deploy the `dist/` folder to:
- **Vercel**: Connect your repo and deploy
- **Netlify**: Drag and drop the `dist/` folder
- **AWS S3 + CloudFront**: Upload to S3 and serve via CloudFront
- **Any static hosting**: The `dist/` folder contains all files

### Environment Variables

Set `VITE_API_BASE_URL` in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- CloudFront: Update the `.env` file before building

## Testing the UI

1. Start the frontend: `npm run dev`
2. Open browser to `http://localhost:5173`
3. You'll see the login page
4. Enter tenant ID and API key
5. After successful login, you'll see the dashboard with two tabs:
   - **Sync Configuration**: Manage entities and webhooks
   - **Location Mapping**: Manage warehouses and substitutions
6. Make changes and click "Save Changes"

## Features

### Sync Configuration Tab
- Add/remove sync entities (sale, purchase, inventory)
- Configure multiple webhooks per entity
- Set webhook URLs and events
- Toggle entity and webhook status (Active/Inactive)

### Location Mapping Tab
- Add/remove location connections
- Map warehouse names to IDs
- Set connection IDs for each location
- Create substitution lists for field transformations
- Add key-value mappings for field substitutions

## Next Steps

1. **Deploy Backend**: Set up Lambda functions and PostgreSQL
2. **Migrate Data**: Move existing configs to database
3. **Deploy Frontend**: Build and deploy to hosting service
4. **Test End-to-End**: Login and verify config management works
5. **Share with Team**: Provide tenant credentials to team members

## Support

See the main README.md for:
- Full documentation
- API reference
- Troubleshooting guide
- Configuration examples

## File Structure

```
cin7xtrackstarintegration/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # API client with auth
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx # Auth guard
│   │   │   ├── SyncConfigEditor.tsx
│   │   │   └── LocationMappingEditor.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # Auth state management
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── App.tsx                # Main app with routing
│   │   └── main.tsx               # Entry point
│   ├── .env                       # Environment config
│   └── package.json
├── shared/
│   └── src/
│       └── types.ts               # Shared TypeScript types
├── tenantConfigParser.js          # Backend Lambda handlers
├── tenantConfigs/
│   └── earthbreeze.json           # Example tenant config
└── README.md                      # Full documentation
```
