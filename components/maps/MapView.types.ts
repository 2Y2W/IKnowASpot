export interface MapViewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
  style?: React.CSSProperties | object; // RN vs Web
  markers?: MarkerData[];
  showUserLocation?: boolean;
  // 👇 NEW: allow map to trigger votes
  onVote?: (postId: string, nextVote: -1 | 0 | 1) => void;
}

export interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title?: string | null;
  description?: string | null;
  image?: string | null; // ✅ S3 URL (presigned image)
  username?: string | null;
  user_id: string | number;
  // 👇 NEW: voting info for each marker
  score?: number;
  user_vote?: -1 | 0 | 1;
}
