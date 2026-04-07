# Controller Design Document

## Overview

This document outlines the standard pattern for writing controllers in this NestJS application. All controllers should follow consistent formatting, imports, and error handling.

## File Structure

- Controllers are located in `src/modules/{module}/{module}.controller.ts`
- Route prefix defined via `@Controller('prefix')` decorator

## Standard Imports

```typescript
import { Controller, Post, Get, Req, Res, ... } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import { [ModelName]Model } from "./[module].model";
import type { [Type]ApiResponse, ... } from "../../types/[module].types";
```

## Class Structure

```typescript
@Controller('route-prefix')
export class [Name]Controller {

  constructor(
    private readonly logger: AppLogger,
    private readonly [service]: [ServiceName]Model
  ) { }

  @Post('endpoint')
  async handlerName(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      // 1. Extract and validate input
      const { param1, param2 } = req.body;

      // 2. Build payload (if needed)
      const payload: PayloadType = { param1, param2 };

      // 3. Call service/model
      const result = await this.service.method(payload);

      // 4. Build success response
      const response: SuccessResponseType = {
        success: true,
        message: `Successfully [action]`,
        data: result
      };

      return res.status(200).json(response);

    } catch (error) {
      this.logger.error(`Error [action]`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }
}
```

## RESTful Route Patterns

| Method | Decorator | Endpoint | Usage |
|--------|-----------|----------|-------|
| Create | `@Post('')` | `/resources` | Create new resource |
| Replace | `@Put(':id')` | `/resources/:id` | Full resource replacement |
| Update | `@Patch(':id')` | `/resources/:id` | Partial update |
| Get One | `@Get(':id')` | `/resources/:id` | Fetch by ID |
| Get All | `@Get('')` | `/resources` | List with pagination |
| Delete | `@Delete(':id')` | `/resources/:id` | Soft delete (default) |

## HTTP Method Semantics

- **POST**: Create new resources (201 Created)
- **PUT**: Replace entire resource (idempotent) - use when sending full payload
- **PATCH**: Partial update (not idempotent) - use when sending only changed fields
- **GET**: Retrieve resources (safe, idempotent)
- **DELETE**: Remove resources (idempotent)

## Parameter Handling

### Path Parameters
```typescript
const idParam = req.params.id;
const id = Array.isArray(idParam) ? idParam[0] : idParam;
const result = await this.service.method(parseInt(id));
```

### Query Parameters
```typescript
const page = pageQuery ? parseInt(pageQuery) : 1;
const limit = limitQuery ? parseInt(limitQuery) : 10;
```

### Body Parameters
```typescript
const { field1, field2 } = req.body;
```

## Error Handling Pattern

```typescript
} catch (error) {
  this.logger.error(`Error [action description]`, error);

  const response: ApiResponse = {
    success: false,
    message: `${error}`
  };

  return res.status(500).json(response);
}
```

### Status Code Guidelines

| Status | Usage |
|--------|-------|
| 200 | Success |
| 201 | Created (new resource) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Server Error |

## Response Types

### Single Resource
```typescript
const response: Single[X]ApiResponse = {
  success: true,
  message: `Successfully fetched [resource]`,
  data: result
};
return res.status(200).json(response);
```

### Multiple Resources
```typescript
const response: All[X]ApiResponse = {
  success: true,
  message: `Successfully fetched [resources]`,
  data: result
};
return res.status(200).json(response);
```

### Simple Success
```typescript
const response: ApiResponse = {
  success: true,
  message: `Successfully [action]`
};
return res.status(200).json(response);
```

## Guards (Optional)

Apply at class level for protected routes:
```typescript
@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController { ... }
```

Or at method level for specific protection.

## Current User (When Needed)

```typescript
async handler(
  @Req() req: Request,
  @Res() res: Response,
  @CurrentUser() currentUser: any
): Promise<Response> {
  // currentUser.userId available
}
```

## File Upload Pattern

For multipart file uploads, see `src/modules/files/files.controller.ts` for busboy implementation with sharp image processing.

## Example: Complete RESTful CRUD Controller

```typescript
import { Controller, Post, Get, Put, Patch, Delete, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../../logger/winston.logger";
import type { ApiResponse } from "../../types/api.types";
import type { SingleResourceApiResponse, AllResourcesApiResponse } from "../../types/resource.types";
import { ResourceModel } from "./resource.model";
import type { CreateResourcePayload, UpdateResourcePayload } from "../../types/resource.types";

@Controller('resources')
export class ResourcesController {

  constructor(
    private readonly logger: AppLogger,
    private readonly resources: ResourceModel
  ) { }

  // CREATE - POST /resources
  @Post('')
  async createResource(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const { field1, field2 } = req.body;

      const payload: CreateResourcePayload = { field1, field2 };
      const resource = await this.resources.create(payload);

      const response: SingleResourceApiResponse = {
        success: true,
        message: `Successfully created resource`,
        data: resource
      };

      return res.status(201).json(response);

    } catch (error) {
      this.logger.error(`Error creating resource`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  // GET ONE - GET /resources/:id
  @Get(':id')
  async fetchResource(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const resource = await this.resources.fetch(parseInt(id));

      const response: SingleResourceApiResponse = {
        success: true,
        message: `Successfully fetched resource`,
        data: resource
      };

      return res.status(200).json(response);

    } catch (error) {
      this.logger.error(`Error fetching resource`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  // UPDATE (Partial) - PATCH /resources/:id
  @Patch(':id')
  async updateResource(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const payload: UpdateResourcePayload = { ...req.body, id: parseInt(id) };
      await this.resources.update(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully updated resource`
      };

      return res.status(200).json(response);

    } catch (error) {
      this.logger.error(`Error updating resource`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  // REPLACE (Full) - PUT /resources/:id
  @Put(':id')
  async replaceResource(
    @Req() req: Request,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const idParam = req.params.id;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const payload: UpdateResourcePayload = { ...req.body, id: parseInt(id) };
      await this.resources.replace(payload);

      const response: ApiResponse = {
        success: true,
        message: `Successfully replaced resource`
      };

      return res.status(200).json(response);

    } catch (error) {
      this.logger.error(`Error replacing resource`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }

  // DELETE - DELETE /resources/:id (soft delete)
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

    } catch (error) {
      this.logger.error(`Error deleting resource`, error);

      const response: ApiResponse = {
        success: false,
        message: `${error}`
      };

      return res.status(500).json(response);
    }
  }
}
```
