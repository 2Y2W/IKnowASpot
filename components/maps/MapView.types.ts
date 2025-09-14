export interface MapViewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  style?: React.CSSProperties | object; // RN vs Web
}
