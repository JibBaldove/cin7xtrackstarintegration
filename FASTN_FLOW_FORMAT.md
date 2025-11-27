# FastN.ai Flow Configuration Format

## Overview
This document describes the JSON structure used by FastN.ai for flow configurations. This format defines workflows with multiple steps, data transformations, API calls, and conditional logic.

## Top-Level Structure

```json
{
  "clientId": "string (UUID)",
  "id": "string (flow identifier)",
  "newName": "string | null",
  "name": "string",
  "description": "string | null",
  "actionType": "CREATE | UPDATE | DELETE",
  "inputName": "string",
  "inputModelId": "string",
  "chatWelcomeMessage": "string | null",
  "outputModelId": "string",
  "errorModelId": "string",
  "headerModelId": "string",
  "apiPreview": { ... },
  "version": "string | null",
  "inputModel": { ... },
  "outputModel": { ... },
  "errorModel": { ... },
  "headerModel": { ... },
  "status": "CONNECT | DRAFT | DEPLOYED",
  "createdAt": "number (timestamp)",
  "updatedAt": "number (timestamp)",
  "deployedAt": "number (timestamp)",
  "resolver": { ... }
}
```

## Model Object Structure

Used for `inputModel`, `outputModel`, `errorModel`, and `headerModel`:

```json
{
  "createdAt": "number",
  "updatedAt": "number",
  "id": "string",
  "clientId": "string (UUID)",
  "name": "string",
  "type": "string | null",
  "version": "string",
  "preview": "any | null",
  "jsonSchema": {
    "type": "object",
    "description": "string",
    "title": "string",
    "properties": {
      "propertyName": {
        "type": "string | number | boolean | object | array"
      }
    },
    "required": ["array of required property names"]
  },
  "uiSchema": "any | null",
  "isReadOnly": "boolean",
  "imageUrl": "string | null",
  "groupId": "string | null",
  "resourceType": "string | null",
  "deleted": "boolean",
  "isCommunityCreated": "boolean",
  "dataModel": { /* same structure as jsonSchema */ }
}
```

## Resolver Structure

The resolver defines the workflow logic:

```json
{
  "id": "string",
  "label": "string | null",
  "clientId": "string (UUID)",
  "groupId": "string | null",
  "type": "string | null",
  "field": "string | null",
  "dependencies": "any | null",
  "start": "string (step ID to start from)",
  "nodeBased": "boolean",
  "steps": [
    /* Array of Step objects */
  ]
}
```

## Step Types

Each step has a common structure with type-specific properties.

### Common Step Properties

Every step includes these properties:

```json
{
  "type": "INLINE | VARIABLE | API | COMPOSITE | CONDITIONAL | LOGGER | ...",
  "id": "string (unique step identifier)",
  "actionId": "string | null",
  "next": "string | null (next step ID)",
  "prevStep": "string | null",
  "enableDebug": "boolean",
  "description": "string | null",
  "debugBreakAfter": "number | null",
  "outputSchema": "any | null",
  "configuredStepSetting": "any | null",
  "filter": "any | null",
  "limit": "any | null",
  "splitOut": "any | null",
  "aggregate": "any | null",
  "merge": "any | null",
  "warnings": "any | null",
  "settings": {
    "failureBehavior": "FAILURE | SUCCESS | SKIP",
    "skipStatus": "any | null",
    "errorMessage": "string | null",
    "stepNote": "string | null"
  },

  /* All possible type-specific properties (null if not used) */
  "inline": "object | null",
  "function": "object | null",
  "composite": "object | null",
  "loop": "object | null",
  "internalDatabase": "object | null",
  "aiAction": "object | null",
  "mcpClient": "object | null",
  "logger": "object | null",
  "downLoadFile": "object | null",
  "endLoop": "object | null",
  "trigger": "object | null",
  "converter": "object | null",
  "variables": "object | null",
  "state": "object | null",
  "conditional": "object | null",
  "lambdaFunction": "object | null",
  "ftp": "object | null",
  "summarizationChain": "object | null",
  "textClassifier": "object | null",
  "aiAgent": "object | null",
  "tenantSettings": "object | null"
}
```

### 1. INLINE Step

Used for data transformation using Jinja templates or JavaScript code.

```json
{
  "type": "INLINE",
  "id": "StepName",
  "inline": {
    "code": "string (Jinja template or JavaScript code)",
    "language": "JINJA | JAVASCRIPT",
    "fields": "array",
    "next": "string | null (next step ID)",
    "uiCode": "string (UI representation)",
    "hasResponse": "boolean",
    "isError": "boolean",
    "statusCode": "number",
    "outputSchema": "any | null",
    "queryExecutor": {
      "children": [/* query tree structure */],
      "returnLiteral": "boolean",
      "symbolOrIndex": {
        "type": "string (Java type)",
        "value": "any"
      },
      "version": "number"
    }
  },
  "next": "string | null"
}
```

**Language Examples:**

**Jinja:**
```jinja
{
  "message": {% if data.var.message is defined %}{{data.var.message | tojson}}{% else %}null{% endif %}
}
```

**JavaScript:**
```javascript
function handler(params) {
  params.data.headers['x-fastn-space-connection-id'] = params.data.var.connectionId;
  const saleCreate = params.data.steps.generateOrderRequestBody.output;
  return {
    "body": saleCreate?.body
  };
}
```

### 2. VARIABLE Step

Used for setting variables that can be referenced in subsequent steps.

```json
{
  "type": "VARIABLE",
  "id": "VariableName",
  "variables": {
    "next": "string (next step ID)",
    "variables": "array (legacy)",
    "code": "string (Jinja template for variable values)",
    "uiCode": "string (UI representation)",
    "queryExecutor": { /* query tree structure */ }
  }
}
```

**Example:**
```jinja
{
  "tenantId": {% if data.headers['x-fastn-space-tenantid'] is defined %}{{data.headers['x-fastn-space-tenantid'] | tojson}}{% else %}null{% endif %},
  "batchSize": 5,
  "referenceTable": {{("cin7_trackstar_reference:" ~ data.headers['x-fastn-space-tenantid'] ~ "") | tojson}},
  "saleId": "{{ data.input.SaleID | lower }}"
}
```

### 3. API Step

Used for making API calls to external services or internal functions.

```json
{
  "type": "API",
  "id": "ApiCallName",
  "function": {
    "id": "string (function ID)",
    "groupId": "string",
    "connectorId": "string (e.g., 'community')",
    "name": "string (function name)",
    "version": "string",
    "imageUrl": "string | null",
    "configuration": {
      "enableCache": "boolean",
      "cacheTtlInSeconds": "number",
      "required": "boolean",
      "validate": "boolean",
      "enableRetry": "boolean",
      "enableAuth": "boolean",
      "authType": "NO_AUTH | API_KEY | BEARER | OAUTH",
      "auth": {
        "identifier": "string",
        "authKey": "string | null",
        "enableMultiConnection": "boolean",
        "isWorkspaceIdentifier": "boolean",
        "defaultConnectionId": "string | null"
      },
      "retry": {
        "maxRetries": "number",
        "maxDelayMilliseconds": "number",
        "enableConnectionErrors": "boolean",
        "retryList": [
          {
            "delayMilliseconds": "number",
            "statusCode": "number",
            "body": "string | null"
          }
        ]
      },
      "requestSetting": "any | null"
    },
    "next": "string | null",
    "queryExecutor": "any | null"
  }
}
```

### 4. COMPOSITE Step

Groups multiple steps together as a reusable unit.

```json
{
  "type": "COMPOSITE",
  "id": "CompositeStepName",
  "composite": {
    "steps": [
      /* Array of nested steps (can be any type) */
    ]
  }
}
```

### 5. CONDITIONAL Step

Implements if/else logic for flow control.

```json
{
  "type": "CONDITIONAL",
  "id": "ConditionalName",
  "conditional": {
    "id": "string",
    "next": "string (default next step if no conditions match)",
    "expressions": [
      {
        "name": "string (condition name)",
        "logic": "AND | OR",
        "conditions": "any | null (for nested conditions)",
        "variable": "string (variable to evaluate)",
        "value": "any | null (value to compare against)",
        "operation": "EXISTS | EQUALS | NOT_EQUALS | GREATER_THAN | LESS_THAN | CONTAINS | ...",
        "next": "string (next step if condition is true)"
      }
    ],
    "queryExecutor": "any | null"
  }
}
```

**Operations:**
- `EXISTS` - Check if variable exists/is not null
- `EQUALS` - Variable equals value
- `NOT_EQUALS` - Variable does not equal value
- `GREATER_THAN` - Variable > value
- `LESS_THAN` - Variable < value
- `CONTAINS` - Variable contains value (for strings/arrays)

### 6. LOGGER Step

Used for logging information during flow execution.

```json
{
  "type": "LOGGER",
  "id": "LoggerName",
  "logger": {
    "next": "string (next step ID)",
    "context": "string (Jinja template for log context)",
    "message": "string (log message label)",
    "queryExecutor": { /* query tree structure */ }
  }
}
```

**Example:**
```json
{
  "type": "LOGGER",
  "id": "LogStatusCode",
  "logger": {
    "next": "NextStep",
    "context": "{{data.var.statusCode}}",
    "message": "statusCode"
  }
}
```

## Query Executor Structure

The `queryExecutor` is used to define data access paths:

```json
{
  "children": [
    {
      "key": {
        "type": "java.lang.String | java.math.BigInteger",
        "value": "string | number (property name or array index)"
      },
      "value": {
        "children": [/* nested children */],
        "returnLiteral": "boolean",
        "symbolOrIndex": {
          "type": "java.lang.String | java.math.BigInteger | null",
          "value": "string | number | null"
        },
        "version": "number"
      }
    }
  ],
  "returnLiteral": "boolean",
  "symbolOrIndex": {
    "type": "string | null",
    "value": "any | null"
  },
  "version": "number"
}
```

## Data Access Patterns

### Accessing Input Data
```jinja
{{data.input.propertyName}}
```

### Accessing Headers
```jinja
{{data.headers['header-name']}}
```

### Accessing Variables
```jinja
{{data.var.variableName}}
```

### Accessing Step Output
```jinja
{{data.steps.StepId.output}}
{{data.steps.StepId.output[0].property}}
```

## Common Jinja Filters

- `| tojson` - Convert to JSON string
- `| lower` - Convert to lowercase
- `| upper` - Convert to uppercase
- `| shape` - Parse JSON string (custom filter)
- `~` - String concatenation operator

## Example Flow Patterns

### Simple Variable Assignment + API Call
```json
{
  "steps": [
    {
      "type": "VARIABLE",
      "id": "SetParams",
      "variables": {
        "code": "{\"userId\": \"{{data.input.userId}}\"}",
        "next": "FetchUser"
      }
    },
    {
      "type": "API",
      "id": "FetchUser",
      "function": {
        "name": "getUser",
        "configuration": { /* API config */ }
      }
    }
  ]
}
```

### Conditional Flow
```json
{
  "steps": [
    {
      "type": "CONDITIONAL",
      "id": "CheckUser",
      "conditional": {
        "next": "UserNotFound",
        "expressions": [
          {
            "name": "User Exists",
            "variable": "{{data.var.userId}}",
            "operation": "EXISTS",
            "next": "ProcessUser"
          }
        ]
      }
    },
    {
      "type": "INLINE",
      "id": "ProcessUser",
      "inline": { /* process user */ }
    },
    {
      "type": "INLINE",
      "id": "UserNotFound",
      "inline": { /* error response */ }
    }
  ]
}
```

### Composite with Nested Steps
```json
{
  "type": "COMPOSITE",
  "id": "FetchAndProcess",
  "composite": {
    "steps": [
      {
        "type": "INLINE",
        "id": "PrepareParams",
        "inline": { /* map parameters */ }
      },
      {
        "type": "API",
        "id": "ApiCall",
        "function": { /* API call */ }
      }
    ]
  }
}
```

## Modifying Flows Programmatically

### Adding a New Step
```javascript
function addStep(flow, newStep, afterStepId) {
  const steps = flow.resolver.steps;
  const index = steps.findIndex(s => s.id === afterStepId);

  if (index !== -1) {
    // Update the previous step's next pointer
    steps[index].next = newStep.id;

    // Set new step's next to the old next
    newStep.next = steps[index + 1]?.id || null;

    // Insert the new step
    steps.splice(index + 1, 0, newStep);
  }

  return flow;
}
```

### Updating Variable Values
```javascript
function updateVariable(flow, stepId, newCode) {
  const step = flow.resolver.steps.find(s => s.id === stepId);

  if (step && step.type === 'VARIABLE') {
    step.variables.code = newCode;
  }

  return flow;
}
```

### Changing Conditional Logic
```javascript
function updateConditional(flow, stepId, newExpressions) {
  const step = flow.resolver.steps.find(s => s.id === stepId);

  if (step && step.type === 'CONDITIONAL') {
    step.conditional.expressions = newExpressions;
  }

  return flow;
}
```

### Updating API Configuration
```javascript
function updateApiConfig(flow, stepId, configUpdates) {
  const step = flow.resolver.steps.find(s => s.id === stepId);

  if (step && step.type === 'API' && step.function) {
    step.function.configuration = {
      ...step.function.configuration,
      ...configUpdates
    };
  }

  return flow;
}
```

## Best Practices

1. **Unique Step IDs**: Always use unique IDs for steps
2. **Next Pointers**: Ensure `next` properties form a valid flow graph
3. **Start Step**: The `resolver.start` must point to a valid step ID
4. **Error Handling**: Use `settings.failureBehavior` to control error behavior
5. **Type Safety**: Respect the `type` field and only populate corresponding type-specific properties
6. **Query Executors**: While optional for code execution, they help with visual flow representation
7. **UI Code**: Keep `uiCode` in sync with `code` for proper UI rendering
8. **Variable Scope**: Variables set in earlier steps are accessible via `data.var.*` in later steps
9. **Step Output**: Step outputs are accessible via `data.steps.StepId.output` in subsequent steps
10. **Null Safety**: Always check for undefined/null when accessing nested properties in Jinja

## Validation Rules

- `clientId` must be a valid UUID
- All step IDs must be unique within the flow
- `resolver.start` must reference an existing step ID
- All `next` references must point to existing step IDs or be null
- Step `type` must match the populated type-specific property
- API steps must have a valid `function` object
- CONDITIONAL steps must have at least one expression
- VARIABLE and INLINE steps must have valid `code`
