export interface MapViewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
  style?: React.CSSProperties | object; // RN vs Web
  markers?: MarkerData[];
  showUserLocation: boolean;
}

export interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
}