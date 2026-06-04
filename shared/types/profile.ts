export type Role = "cosplayer" | "photographer" | "workshop" | "shop" | "location" | "fan";

export interface SocialLink {
  id: number;
  platform: string;
  handle: string;
  is_connected: boolean;
}

export interface Profile {
  id: number;
  display_name: string;
  bio: string;
  roles: Role[];
  avatar: string | null;
  cover: string | null;
  available_for_work: boolean;
  experience: string;
  rating: number;
  accent_color: string;
  socials: SocialLink[];
  created_at: string;
}
