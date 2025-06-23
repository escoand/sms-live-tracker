import {
  AddLayerObject,
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl";

export const iconColor = "#333";
export const iconTransform = "scale(0.6)";
export const iconViewBox = "0 0 24 24";

export const positionsSource = "positions";
export const routesSource = "routes";
export const routeLines = "route-lines";
export const routePoints = "route-points";
export const routeTexts = "route-text";

const routeFilter: FilterSpecification = [
  "!",
  [
    "any",
    ["in", ["get", "name"], ["global-state", "hidden"]],
    ["in", ["get", "group"], ["global-state", "hidden"]],
  ],
];

// see https://maplibre.org/maplibre-style-spec/

const colors: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["/", ["-", ["to-number", ["get", "name"]], 19], 15],
  0.0,
  "blue",
  0.1,
  "royalblue",
  0.3,
  "cyan",
  0.5,
  "lime",
  0.7,
  "yellow",
  1.0,
  "red",
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
      "line-opacity": ["case", ["boolean", ["get", "hidden"], false], 0, 0.75],
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
      "text-offset": [0, -0.5],
    },
    paint: {
      "text-color": ["get", "color"],
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
      "circle-stroke-color": colors,
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
    },
    paint: {
      "text-color": colors,
    },
  },
];
