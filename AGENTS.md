# AGENTS.md

## Commands
- `npm run build` - Build the NestJS app
- `npm run start` - Start production server
- `npm run start:dev` - Start dev server with watch mode
- `npm run migrate` - Run migrations (requires `.env`)
- `npm run migrate:up` / `npm run migrate:down` - Apply/revert migrations

## Architecture
- NestJS backend at `src/`
- Entry point: `src/main.ts`, main module: `src/app.module.ts`
- Modules live in `src/modules/{name}/` with `*.model.ts`, `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.handler.ts` patterns
- Types in `src/types/*.types.ts`
- Database: PostgreSQL with pg pool, migrations via node-pg-migrate
- No test suite configured

## Key Modules
- `src/modules/entryPoints/` - HTTP/webhook entry points
- `src/modules/whatsapp/` - WhatsApp message handling
- `src/modules/handler/` - Main request handler orchestration
- `src/modules/intent/` - Intent detection with Gemini
- `src/modules/orders/` - Order management
- `src/modules/client/` - Client/phone number management
- `src/modules/cache/` - In-memory cache for orders by phone

## Conventions
- TypeScript with strict typing
- Injectable services use `@Injectable()` decorator
- Models handle raw DB queries via `pg.Pool`
- Handlers contain business logic orchestration
- Controllers expose REST endpoints
- Phone numbers stored as `BIGINT` in DB

## Env Requirements
- `.env` file required for DB connection and WhatsApp credentials
- Run migrations before starting app: `npm run migrate`
- **Env key pattern**: keys suffixed with env (e.g., `PG_HOST_development`, `PG_HOST_production`)
- Required envs: `ENVIRONMENT`, `PG_*`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `GEMINI_API_KEY`

## WhatsApp Webhook Flow
1. Meta sends GET to `/api/whatsapp/webhook?hub.verify_token=` for verification
2. Meta sends POST to same endpoint with webhook payload
3. `HandlerService` processes: extracts message → detects intent via rules+Gemini → routes to entity handler
4. Intent entity map: `Products` → `ProductsHandler`, `Orders` → `OrdersHandler`, `Payments` → `PaymentsHandler`, `CustomerCare` → `CustomerCareHandler`
- Invalid intents fallback to `CustomerCareHandler.sendHelpMenu()`
