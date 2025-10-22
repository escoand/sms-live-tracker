import { Feature, LineString, MultiLineString, Point } from "geojson";
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
  ["to-rgba", ["to-color", ["get", "color"], "white"]],
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
    filter: ["all", ["==", ["geometry-type"], "LineString"], routeFilter],
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
  // tracker symbol
  {
    id: "tracker-symbol",
    source: positionsSource,
    type: "symbol",
    layout: {
      "icon-image": "marker",
      "icon-offset": [0, -6],
      "icon-overlap": "always",
      "icon-size": 3,
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Bold"],
      "text-offset": [0, -1.5],
      "text-overlap": "cooperative",
    },
    paint: {
      "icon-color": ["get", "color"],
      "text-color": blackWhiteForeground,
    },
  },
];

export const filterLineString = (
  feature: Feature
): feature is Feature<LineString | MultiLineString> =>
  (feature.geometry.type === "LineString" ||
    feature.geometry.type === "MultiLineString") &&
  feature.geometry.coordinates.length > 0;

export const filterPoint = (feature: Feature): feature is Feature<Point> =>
  feature.geometry.type === "Point" && feature.geometry.coordinates.length > 0;

export const filterPoi = (feature: Feature): feature is Feature<Point> =>
  filterPoint(feature) && feature.properties?.isDestination === true;

export const filterPoiRoutes = (
  feature: Feature
): feature is Feature<LineString | MultiLineString> =>
  filterLineString(feature) && feature.properties?.hasDestinations === true;
