import React, { useEffect, useRef } from "react";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import { MapViewProps } from "./MapView.types";

export default function MapView({
  latitude,
  longitude,
  zoom = 14,
  style,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({
        center: fromLonLat([longitude, latitude]),
        zoom,
      }),
    });
  }, [latitude, longitude, zoom]);

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%", ...style }} />
  );
}
