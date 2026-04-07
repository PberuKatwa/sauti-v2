# Error Handling Design Document

## Overview

This document outlines error handling patterns for controllers and models. Errors are thrown in models with clear messages, then categorized and transformed in controllers to return appropriate HTTP status codes.

## Error Categories

| Category | HTTP Status | Description | Example |
|----------|-------------|-------------|---------|
| Validation | 400 | Missing/invalid input | "Please provide a name" |
| Not Found | 404 | Resource doesn't exist | "Order not found" |
| Conflict | 409 | Business logic violation | "Order already delivered" |
| Unauthorized | 401 | Authentication required | "Invalid credentials" |
| Forbidden | 403 | Insufficient permissions | "Access denied" |
| Server Error | 500 | Unexpected technical errors | DB connection failed |

## Model Error Throwing

### Validation Errors (400)

```typescript
async createOrder(payload: CreateOrderPayload): Promise<OrderProfile> {
  if (!payload.clientId) throw new Error(`client_id is required`);
  if (!payload.items || payload.items.length === 0) throw new Error(`items are required`);
  // ... rest of method
}
```

### Not Found Errors (404)

```typescript
async fetchOrder(orderId: number): Promise<OrderProfile> {
  const query = `SELECT id, order_number, ... FROM orders WHERE id = $1;`;
  const result = await pool.query(query, [orderId]);

  if (result.rowCount === 0) {
    throw new Error(`Order with id ${orderId} not found`);
  }

  return result.rows[0];
}
```

### Conflict Errors (409)

```typescript
async updateStatus(payload: UpdateStatusPayload): Promise<void> {
  const { orderId, status } = payload;

  // Check current status
  const current = await this.getOrderStatus(orderId);
  if (current.status === 'delivered') {
    throw new Error(`Cannot update - order already delivered`);
  }
  // ... rest of method
}
```

## Error Message Prefix Convention

Use prefixes to categorize errors in controllers:

```typescript
// Validation errors
throw new Error(`VALIDATION: Please provide order_id`);
throw new Error(`VALIDATION: Invalid phone number format`);

// Not found errors
throw new Error(`NOT_FOUND: Order ${id} not found`);
throw new Error(`NOT_FOUND: Client ${id} does not exist`);

// Conflict errors
throw new Error(`CONFLICT: Order cannot be modified after delivery`);
throw new Error(`CONFLICT: Email already registered`);

// Auth errors
throw new Error(`AUTH: Invalid credentials`);
throw new Error(`AUTH: Session expired`);
```

## Controller Error Handling

### Pattern 1: Error Type Detection

```typescript
@Delete(':id')
async deleteResource(
  @Req() req: Request,
  @Res() res: Response
): Promise<Response> {
  try {
    const idParam = req.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    await this.resources.trash(parseInt(id));

    const response: ApiResponse = {
      success: true,
      message: `Successfully deleted resource`
    };

    return res.status(200).json(response);

  } catch (error: any) {
    const errorMessage = error.message || String(error);

    if (errorMessage.startsWith('NOT_FOUND:')) {
      const response: ApiResponse = {
        success: false,
        message: errorMessage.replace('NOT_FOUND: ', '')
      };
      return res.status(404).json(response);
    }

    if (errorMessage.startsWith('VALIDATION:')) {
      const response: ApiResponse = {
        success: false,
        message: errorMessage.replace('VALIDATION: ', '')
      };
      return res.status(400).json(response);
    }

    if (errorMessage.startsWith('CONFLICT:')) {
      const response: ApiResponse = {
        success: false,
        message: errorMessage.replace('CONFLICT: ', '')
      };
      return res.status(409).json(response);
    }

    if (errorMessage.startsWith('AUTH:')) {
      const response: ApiResponse = {
        success: false,
        message: errorMessage.replace('AUTH: ', '')
      };
      return res.status(401).json(response);
    }

    this.logger.error(`Error deleting resource`, error);

    const response: ApiResponse = {
      success: false,
      message: `Internal server error`
    };

    return res.status(500).json(response);
  }
}
```

### Pattern 2: Error Code Enum (Recommended)

```typescript
// src/types/errors.types.ts
export enum ErrorCode {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  AUTH = 'AUTH',
  FORBIDDEN = 'FORBIDDEN',
  SERVER = 'SERVER'
}

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
}

// Helper to create typed errors
export const createError = (code: ErrorCode, message: string, statusCode?: number): AppError => {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode || getStatusForCode(code);
  return error;
};

const getStatusForCode = (code: ErrorCode): number => {
  const map: Record<ErrorCode, number> = {
    [ErrorCode.VALIDATION]: 400,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.AUTH]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.SERVER]: 500
  };
  return map[code];
};
```

### Model with Typed Errors

```typescript
import { createError, ErrorCode } from "../../types/errors.types";

async fetchOrder(orderId: number): Promise<OrderProfile> {
  if (!orderId) throw createError(ErrorCode.VALIDATION, `order_id is required`);

  const query = `SELECT ... FROM orders WHERE id = $1;`;
  const result = await pool.query(query, [orderId]);

  if (result.rowCount === 0) {
    throw createError(ErrorCode.NOT_FOUND, `Order with id ${orderId} not found`);
  }

  return result.rows[0];
}
```

### Controller with Typed Errors

```typescript
import { ErrorCode, type AppError } from "../../types/errors.types";

@Delete(':id')
async deleteResource(
  @Req() req: Request,
  @Res() res: Response
): Promise<Response> {
  try {
    const idParam = req.params.id;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;

    await this.resources.trash(parseInt(id));

    return res.status(200).json({
      success: true,
      message: `Successfully deleted resource`
    });

  } catch (error: any) {
    const appError = error as AppError;

    if (appError.code) {
      return res.status(appError.statusCode).json({
        success: false,
        message: appError.message
      });
    }

    this.logger.error(`Error deleting resource`, error);

    return res.status(500).json({
      success: false,
      message: `Internal server error`
    });
  }
}
```

## Recommended File Structure

```
src/
  types/
    errors.types.ts    # Error codes, types, helper functions
    api.types.ts       # ApiResponse type
```

```typescript
// src/types/errors.types.ts
export enum ErrorCode {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  AUTH = 'AUTH',
  FORBIDDEN = 'FORBIDDEN',
  SERVER = 'SERVER'
}

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  isOperational: boolean;
}

export const createError = (
  code: ErrorCode,
  message: string
): AppError => {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCode.VALIDATION]: 400,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.AUTH]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.SERVER]: 500
  };

  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusMap[code];
  error.isOperational = true;

  return error;
};
```

## Quick Reference

| Error Type | Model Throw | Controller Catch | HTTP Status |
|------------|-------------|------------------|-------------|
| Validation | `VALIDATION: message` | `error.message.startsWith('VALIDATION')` | 400 |
| Not Found | `NOT_FOUND: message` | `error.message.startsWith('NOT_FOUND')` | 404 |
| Conflict | `CONFLICT: message` | `error.message.startsWith('CONFLICT')` | 409 |
| Auth | `AUTH: message` | `error.message.startsWith('AUTH')` | 401 |
| Forbidden | `AUTH: message` | `error.message.startsWith('AUTH')` | 403 |
| Server | (throw without prefix) | (catch all) | 500 |

## Benefits

1. **Clear messages**: Users get meaningful feedback
2. **Proper status codes**: UI can handle errors appropriately
3. **Consistent pattern**: All endpoints behave the same
4. **Debugging**: Easy to trace errors in logs
5. **Extensible**: Easy to add new error types
