import React, { useEffect, useRef } from "react";
import { MapViewProps } from "./MapView.types";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Circle, Fill, Stroke } from "ol/style";

export default function MapView({
  latitude,
  longitude,
  zoom = 14,
  className,
  markers = [],
  showUserLocation = true,
}: MapViewProps & { showUserLocation?: boolean }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    console.log("Initializing OL Map at:", { latitude, longitude, zoom });

    // Vector source for markers
    const vectorSource = new VectorSource();

    // Base map
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: vectorSource }), // ✅ attach marker layer right away
      ],
      view: new View({
        center: fromLonLat([longitude, latitude]), // 👈 careful: [lon, lat]
        zoom,
      }),
    });

    // Add custom markers
    markers.forEach((m) => {
      console.log("Adding marker:", m);
      const feature = new Feature({
        geometry: new Point(fromLonLat([m.longitude, m.latitude])),
      });

      feature.setStyle(
        new Style({
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: "red" }),
            stroke: new Stroke({ color: "white", width: 2 }),
          }),
        })
      );

      vectorSource.addFeature(feature);
    });

    // Add user location as blue dot
    if (showUserLocation) {
      console.log("Adding user location dot:", { latitude, longitude });
      const userFeature = new Feature({
        geometry: new Point(fromLonLat([longitude, latitude])),
      });

      userFeature.setStyle(
        new Style({
          image: new Circle({
            radius: 8,
            fill: new Fill({ color: "#4285F4" }), // blue
            stroke: new Stroke({ color: "white", width: 2 }),
          }),
        })
      );

      vectorSource.addFeature(userFeature);
    }

    return () => {
      console.log("Cleaning up OL map");
      map.setTarget(undefined);
    };
  }, [latitude, longitude, zoom, markers, showUserLocation]);

  return <div ref={mapRef} className={`w-full h-full ${className ?? ""}`} />;
}
