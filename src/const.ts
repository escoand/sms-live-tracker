import { Feature, FeatureCollection, LineString, Point } from "geojson";
import {
  AddLayerObject,
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl/dist/maplibre-gl";

export const iconColor = "#333";
export const iconTransform = "scale(0.6)";
export const iconViewBox = "0 0 24 24";

export const positionsSource = "positions";
export const routesSource = "routes";
export const routeLines = "route-lines";
export const routePoints = "route-points";
export const routeTexts = "route-text";

export const styles = [
  `https://api.maptiler.com/maps/topo-v2/style.json?key={apiKey}`,
  `https://api.maptiler.com/maps/hybrid/style.json?key={apiKey}`,
];

export const routeFilter: FilterSpecification = [
  "!",
  [
    "any",
    ["in", ["get", "name"], ["global-state", "hidden"]],
    ["in", ["get", "group"], ["global-state", "hidden"]],
  ],
];

// see https://maplibre.org/maplibre-style-spec/

const brightness: ExpressionSpecification = [
  "let",
  "rgba",
  ["to-rgba", ["to-color", ["get", "color"]]],
  // https://www.w3.org/TR/AERT/#color-contrast
  [
    "+",
    ["*", ["at", 1, ["var", "rgba"]], 0.299],
    ["*", ["at", 2, ["var", "rgba"]], 0.587],
    ["*", ["at", 3, ["var", "rgba"]], 0.114],
  ],
];

export const blackWhiteForeground: ExpressionSpecification = [
  "step",
  brightness,
  "black",
  125,
  "white",
];

export const layers: AddLayerObject[] = [
  // route lines
  {
    id: routeLines,
    source: routesSource,
    type: "line",
    filter: routeFilter,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": ["get", "color"],
      "line-opacity": 0.75,
      "line-width": 5,
    },
  },
  // route points
  {
    id: routePoints,
    source: routesSource,
    type: "circle",
    filter: ["all", ["==", ["geometry-type"], "Point"], routeFilter],
    paint: {
      "circle-color": ["get", "color"],
      "circle-opacity": 0.75,
      "circle-stroke-color": "white",
      "circle-stroke-width": 1,
    },
  },
  // route text
  {
    id: routeTexts,
    source: routesSource,
    type: "symbol",
    filter: ["all", ["==", ["geometry-type"], "Point"], routeFilter],
    layout: {
      "text-anchor": "bottom",
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Bold"],
      "text-offset": [0, -0.5],
    },
    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": "white",
      "text-halo-width": 1,
    },
  },
  // tracker icons
  {
    id: "tracker-icon",
    source: positionsSource,
    type: "circle",
    paint: {
      "circle-color": "transparent",
      "circle-radius": 12,
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-width": 2,
    },
  },
  // tracker text
  {
    id: "tracker-text",
    source: positionsSource,
    type: "symbol",
    layout: {
      "text-anchor": "center",
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Bold"],
    },
    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": blackWhiteForeground,
      "text-halo-width": 1,
    },
  },
];

export const getFeatures = (data: GeoJSON.GeoJSON): Feature[] => {
  switch (data.type) {
    case "Feature":
      return [data];
    case "FeatureCollection":
      return data.features.flatMap(getFeatures);
    case "GeometryCollection":
      return data.geometries.map((geometry) => ({
        type: "Feature",
        properties: {},
        geometry,
      }));
    default:
      return [
        {
          type: "Feature",
          properties: {},
          geometry: data,
        },
      ];
  }
};

export const filterLineString = (
  feature: Feature
): feature is Feature<LineString> =>
  feature.geometry.type === "LineString" &&
  feature.geometry.coordinates.length > 0;

export const filterPoint = (feature: Feature): feature is Feature<Point> =>
  feature.geometry.type === "Point" && feature.geometry.coordinates.length > 0;
