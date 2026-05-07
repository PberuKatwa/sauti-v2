import { Injectable } from "@nestjs/common";
import { OrdersModel } from "./orders.model";
import { PostgresConfig } from "../../databases/postgres.config";
import { AppLogger } from "../../logger/winston.logger";
import { BaseOrderFilters, OrderStatus } from "../../types/orders.types";
import { MonthlyOrderFilter, MonthlyOrderStat, TotalOrdersStats } from "../../types/ordersStats.types";


@Injectable()
export class OrdersStats extends OrdersModel{

  constructor(
    logger: AppLogger,
    pgConfig: PostgresConfig,
  ) {
    super(logger, pgConfig);
  };

  async getTotalOrdersStats(filters: BaseOrderFilters): Promise<TotalOrdersStats> {
    this.logger.warn(`Attempting to fetch total orders stats`);

    const conditions: string[] = [];
    const params: (string | OrderStatus[])[] = [];
    let paramIndex = 1;

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters.statuses && filters.statuses.length > 0) {
      conditions.push(`delivery_status = ANY($${paramIndex})`);
      params.push(filters.statuses as any);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(total), 0) AS total_value
      FROM orders
      ${whereClause};
    `;

    const result = await this.pool.query(query, params);

    return {
      count: parseInt(result.rows[0].count),
      totalValue: parseFloat(result.rows[0].total_value),
    };
  }

  async getMonthlyOrderTotals(filters: MonthlyOrderFilter): Promise<MonthlyOrderStat[]> {
    const year = filters?.year || new Date().getFullYear();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    this.logger.warn(`Attempting to fetch monthly order totals for year: ${year}`);

    const conditions: string[] = [`EXTRACT(YEAR FROM created_at) = $1`];
    const params: (string | number | OrderStatus)[] = [year];
    let paramIndex = 2;

    if (filters?.status) {
      conditions.push(`delivery_status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT
        EXTRACT(MONTH FROM created_at) AS month,
        COALESCE(SUM(total), 0) AS total_value,
        COUNT(*) AS order_count
      FROM orders
      ${whereClause}
      GROUP BY EXTRACT(MONTH FROM created_at);
    `;

    const result = await this.pool.query(query, params);

    const monthlyMap = new Map<number, { totalValue: number; orderCount: number }>();
    for (const row of result.rows) {
      monthlyMap.set(parseInt(row.month), {
        totalValue: parseFloat(row.total_value),
        orderCount: parseInt(row.order_count)
      });
    }

    const monthlyStats: MonthlyOrderStat[] = [];
    for (let m = 1; m <= 12; m++) {
      const data = monthlyMap.get(m);
      monthlyStats.push({
        month: m,
        monthName: monthNames[m - 1],
        totalValue: data ? data.totalValue : 0,
        orderCount: data ? data.orderCount : 0
      });
    }

    return monthlyStats;
  }


}
