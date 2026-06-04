export type OrderStatus = "request" | "accepted" | "in_work" | "shipped" | "done" | "cancelled";

export interface Order {
  id: number;
  workshop: number;
  workshop_name: string;
  description: string;
  budget: number | null;
  deadline: string | null;
  status: OrderStatus;
  created_at: string;
}
