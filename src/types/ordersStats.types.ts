import { ApiResponse } from "./api.types";
import { OrderStatus } from "./orders.types";

export interface TotalOrdersStats {
  count: number;
  totalValue: number
}

export interface TotalOrdersStatsApiResponse extends ApiResponse {
  data: TotalOrdersStats;
}

export interface MonthlyOrderFilter {
  year?: number;
  status?: OrderStatus;
}

export interface MonthlyOrderStat {
  month: number;
  monthName: string;
  totalValue: number;
  orderCount: number;
}

export interface MonthlyOrdersStatsApiResponse extends ApiResponse {
  data: MonthlyOrderStat[];
}
