import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../logger/winston.logger";
import { PostgresConfig } from "../../databases/postgres.config";

@Injectable()
export class OrderTripModel{
  constructor(
    private readonly logger: AppLogger,
    private readonly pgConfig:PostgresConfig
  ) { };


  async createTable() {

    this.logger.warn(`Attempting to create trip table`);

    const query = `

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_trip_status') THEN
        CREATE TYPE order_trip_status AS ENUM ('pending_location', 'pending_contact', 'pending_delivery_type', 'pending_delivery', 'enroute', 'delivered');
        END IF;
      END
      $$;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'types_of_delivery') THEN
        CREATE TYPE types_of_delivery AS ENUM ('scheduled', 'immediate');
        END IF;
      END
      $$;

      CREATE TABLE IF NOT EXISTS order_trips(

        id SERIAL PRIMARY KEY,
        order_id  INTEGERS REFERENCES orders(id) ON DELETE CASCADE,
        status row_status DEFAULT 'active',

        is_rider_paid BOOLEAN DEFAULT FALSE,

        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),

        recepient_phone BIGINT,
        rider_phone BIGINT,

        delivery_status order_trip_status DEFAULT 'pending_location',
        delivery_cost NUMERIC(10,2),

        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `

  }
}
