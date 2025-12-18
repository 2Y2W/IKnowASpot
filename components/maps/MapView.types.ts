export interface MapViewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
  style?: React.CSSProperties | object; // RN vs Web
  markers?: MarkerData[];
  showUserLocation?: boolean;
  onVote?: (postId: string, nextVote: -1 | 0 | 1) => void;
  tags?: string[];
}

export interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  username?: string | null;
  user_id: string | number;
  created_at?: string | null;
  score?: number;
  user_vote?: -1 | 0 | 1;
  tags?: string[];
}
