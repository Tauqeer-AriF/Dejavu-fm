export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image_url: string;
  content: string;
  link_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  imageUrl?: string;
  imageName?: string;
  audioUrl?: string;
  audioName?: string;
  videoUrl?: string;
  videoName?: string;
  recipient?: string;
  source?: string;
  platform?: string;
}
