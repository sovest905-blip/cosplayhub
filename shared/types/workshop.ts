export type WorkshopType = "print3d" | "eva" | "sewing" | "wigs";

export interface Service {
  id: number;
  name: string;
  description: string;
  price_from: number;
}

export interface Workshop {
  id: number;
  name: string;
  type: WorkshopType;
  city: string;
  about: string;
  cover: string | null;
  eta: string;
  rating: number;
  orders_count: number;
  is_pro: boolean;
  services: Service[];
  created_at: string;
}
