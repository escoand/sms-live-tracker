import {
  Feature,
  FeatureCollection,
  GeoJSON,
  GeoJsonProperties,
  MultiLineString,
  MultiPoint,
  Position,
} from "geojson";

const gpxNsPattern = /^http:\/\/www\.topografix\.com\/GPX\/\d+\/\d+$/;
const gpxNs = "http://www.topografix.com/GPX/1/1";

type gpxTypes =
  | "degreesType"
  | "dgpsStationType:integer"
  | "fixType"
  | "hexColor"
  | "linkType"
  | "xsd:dateTime"
  | "xsd:decimal"
  | "xsd:nonNegativeInteger"
  | "xsd:string";

const gpxAttributes: { [k: string]: { property?: string; type: gpxTypes } } = {
  ageofdgpsdata: { type: "xsd:decimal" },
  desc: { type: "xsd:string", property: "description" },
  dgpsid: { type: "dgpsStationType:integer" },
  fix: { type: "fixType" },
  geoidheight: { type: "xsd:decimal" },
  hdop: { type: "xsd:decimal" },
  link: { type: "linkType" },
  magvar: { type: "degreesType" },
  pdop: { type: "xsd:decimal" },
  sat: { type: "xsd:nonNegativeInteger" },
  sym: { type: "xsd:string", property: "marker-symbol" },
  time: { type: "xsd:dateTime" },
  vdop: { type: "xsd:decimal" },
};

const geojsonProperties = Object.fromEntries(
  Object.entries(gpxAttributes).map(([tag, values]) => [
    values.property || tag,
    { type: values.type, tag: tag },
  ])
);

export const toFeatures = (data: GeoJSON): Feature[] =>
  data.type === "Feature"
    ? [data]
    : data.type === "FeatureCollection"
    ? data.features.flatMap(toFeatures)
    : data.type === "GeometryCollection"
    ? data.geometries.map((geometry) => ({
        type: "Feature",
        properties: {},
        geometry,
      }))
    : [
        {
          type: "Feature",
          properties: {},
          geometry: data,
        },
      ];

export const toGeoJSON = (gpx: Document): GeoJSON =>
  Array.from(gpx.documentElement.children).reduce(
    (json: FeatureCollection, node) => {
      // point
      if (node.nodeName === "wpt") {
        json.features.push({
          geometry: {
            coordinates: [
              parseFloat(node.getAttribute("lon")),
              parseFloat(node.getAttribute("lat")),
              parseFloat(node.querySelector("ele")?.textContent),
            ],
            type: "Point",
          },
          properties: _mapToProperties(node),
          type: "Feature",
        });
      }

      // track
      if (node.nodeName === "trk") {
        const track: Feature<MultiLineString> = {
          geometry: { type: "MultiLineString", coordinates: [] },
          properties: _mapToProperties(node),
          type: "Feature",
        };
        Array.from(node.children)
          .filter(({ nodeName }) => nodeName === "trkseg")
          .forEach((trkseg) => {
            const segment: Position[] = [];
            Array.from(trkseg.children)
              .filter(({ nodeName }) => nodeName === "trkpt")
              .forEach((trkpt) => {
                segment.push([
                  parseFloat(trkpt.getAttribute("lon")),
                  parseFloat(trkpt.getAttribute("lat")),
                  parseFloat(trkpt.querySelector("ele")?.textContent),
                ]);
              });
            track.geometry.coordinates.push(segment);
            json.features.push(track);
          });
      }

      // route
      if (node.nodeName === "rte") {
        const route: Feature<MultiPoint> = {
          geometry: { type: "MultiPoint", coordinates: [] },
          properties: _mapToProperties(node),
          type: "Feature",
        };
        Array.from(node.children)
          .filter(({ nodeName }) => nodeName === "rtept")
          .forEach((rtept) => {
            route.geometry.coordinates.push([
              parseFloat(rtept.getAttribute("lon")),
              parseFloat(rtept.getAttribute("lat")),
              parseFloat(rtept.querySelector("ele")?.textContent),
            ]);
          });
        json.features.push(route);
      }

      return json;
    },
    {
      features: [],
      type: "FeatureCollection",
    }
  );

export const toGPX = (
  json: GeoJSON,
  trackType: "trk" | "rte" = "trk"
): Document => {
  const doc = document.implementation.createDocument(gpxNs, "gpx", null);
  doc.insertBefore(
    doc.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"'),
    doc.documentElement
  );

  toFeatures(json).forEach((feature) => {
    // convert LineString to MultiLineString
    if (feature.geometry.type === "LineString") {
      feature.geometry = {
        bbox: feature.geometry.bbox,
        coordinates: [feature.geometry.coordinates],
        type: "MultiLineString",
      };
    }

    // point
    if (feature.geometry.type === "Point") {
      const wpt = doc.documentElement.appendChild(
        document.createElementNS(gpxNs, "wpt")
      );
      _addCoords(wpt, feature.geometry.coordinates);
      _mapToTags(feature.properties, wpt);
    }

    // line as track
    else if (
      trackType === "trk" &&
      feature.geometry.type === "MultiLineString"
    ) {
      const track = doc.documentElement.appendChild(
        document.createElementNS(gpxNs, "trk")
      );
      _mapToTags(feature.properties, track);
      feature.geometry.coordinates.forEach((coords) => {
        const segment = track.appendChild(
          document.createElementNS(gpxNs, "trkseg")
        );
        coords.forEach((coord) =>
          _addCoords(
            segment.appendChild(document.createElementNS(gpxNs, "trkpt")),
            coord
          )
        );
      });
    }

    // line as route
    else if (feature.geometry.type === "MultiLineString") {
      const route = doc.documentElement.appendChild(
        document.createElementNS(gpxNs, "rte")
      );
      _mapToTags(feature.properties, route);
      feature.geometry.coordinates
        .flat()
        .forEach((coord) =>
          _addCoords(
            route.appendChild(document.createElementNS(gpxNs, "rtept")),
            coord
          )
        );
    }
  });

  return doc;
};

const _mapToProperties = (node: Element) =>
  Object.fromEntries(
    Array.from(node.children)
      .filter(
        (child) =>
          ((child.namespaceURI && gpxNsPattern.test(child.namespaceURI)) ||
            child.namespaceURI === null) &&
          !["ele", "rtept", "trkpt", "trkseg"].includes(child.nodeName)
      )
      .map((child) => [
        gpxAttributes[child.nodeName]?.property || child.nodeName,
        gpxAttributes[child.nodeName]?.type === "xsd:dateTime"
          ? new Date(child.textContent)
          : gpxAttributes[child.nodeName]?.type === "xsd:decimal"
          ? parseFloat(child.textContent)
          : gpxAttributes[child.nodeName]?.type === "xsd:nonNegativeInteger"
          ? parseInt(child.textContent)
          : child.textContent,
      ])
  );

const _mapToTags = (properties: GeoJsonProperties, node: Element) =>
  Object.entries(properties || {}).forEach(([property, values]) =>
    node
      .appendChild(
        document.createElementNS(
          gpxNs,
          geojsonProperties[property]?.tag || property
        )
      )
      .append(
        geojsonProperties[property]?.type === "xsd:dateTime"
          ? new Date(values).toISOString().replace(/\.\d+Z$/, "Z")
          : values
      )
  );

const _addCoords = (segment: Element, coords: Position) => {
  segment.setAttribute("lat", coords[1].toString());
  segment.setAttribute("lon", coords[0].toString());
  coords[2] &&
    segment
      .appendChild(document.createElementNS(gpxNs, "ele"))
      .append(coords[2].toString());
};
