import {
  Feature,
  FeatureCollection,
  GeoJSON,
  GeoJsonProperties,
  MultiLineString,
  MultiPoint,
  Position,
} from "geojson";

type Mapping = {
  property: string;
  type:
    | "degreesType"
    | "dgpsStationType:integer"
    | "fixType"
    | "hexColor"
    | "linkType"
    | "xsd:dateTime"
    | "xsd:decimal"
    | "xsd:nonNegativeInteger"
    | "xsd:string";
  xpath: string;
};

const namespaces: { [_: string]: string } = {
  gpx: "http://www.topografix.com/GPX/1/1",
  gpxx: "http://www.garmin.com/xmlschemas/GpxExtensions/v3",
  osmand: "http://osmand.net",
};

const namespaceResolver: XPathNSResolver = (prefix) =>
  (prefix && namespaces[prefix]) || null;

const mappings: Mapping[] = [
  {
    property: "ageofdgpsdata",
    type: "xsd:decimal",
    xpath: "gpx:ageofdgpsdata",
  },
  { property: "description", type: "xsd:string", xpath: "gpx:desc" },
  { property: "dgpsid", type: "dgpsStationType:integer", xpath: "gpx:dgpsid" },
  { property: "fix", type: "fixType", xpath: "gpx:fix" },
  { property: "geoidheight", type: "xsd:decimal", xpath: "gpx:geoidheight" },
  { property: "hdop", type: "xsd:decimal", xpath: "gpx:hdop" },
  { property: "link", type: "linkType", xpath: "gpx:link" },
  { property: "magvar", type: "degreesType", xpath: "gpx:magvar" },
  { property: "marker-symbol", type: "xsd:string", xpath: "gpx:sym" },
  { property: "name", type: "xsd:string", xpath: "gpx:name" },
  { property: "pdop", type: "xsd:decimal", xpath: "gpx:pdop" },
  { property: "sat", type: "xsd:nonNegativeInteger", xpath: "gpx:sat" },
  { property: "time", type: "xsd:dateTime", xpath: "gpx:time" },
  { property: "vdop", type: "xsd:decimal", xpath: "gpx:vdop" },
  // Garmin
  {
    property: "color",
    type: "xsd:string",
    xpath: "gpx:extensions/gpxx:TrackExtension/gpxx:DisplayColor",
  },
  // OsmAnd
  {
    property: "color",
    type: "xsd:string",
    xpath: "gpx:extensions/osmand:color",
  },
  // not standardized
  { property: "color", type: "xsd:string", xpath: "gpx:extensions/gpx:color" },
];

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
  const doc = document.implementation.createDocument(
    namespaces.gpx,
    "gpx",
    null
  );
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
        document.createElementNS(namespaces.gpx, "wpt")
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
        document.createElementNS(namespaces.gpx, "trk")
      );
      _mapToTags(feature.properties, track);
      feature.geometry.coordinates.forEach((coords) => {
        const segment = track.appendChild(
          document.createElementNS(namespaces.gpx, "trkseg")
        );
        coords.forEach((coord) =>
          _addCoords(
            segment.appendChild(
              document.createElementNS(namespaces.gpx, "trkpt")
            ),
            coord
          )
        );
      });
    }

    // line as route
    else if (feature.geometry.type === "MultiLineString") {
      const route = doc.documentElement.appendChild(
        document.createElementNS(namespaces.gpx, "rte")
      );
      _mapToTags(feature.properties, route);
      feature.geometry.coordinates
        .flat()
        .forEach((coord) =>
          _addCoords(
            route.appendChild(
              document.createElementNS(namespaces.gpx, "rtept")
            ),
            coord
          )
        );
    }
  });

  return doc;
};

const _mapToProperties = (node: Element) =>
  Object.fromEntries(
    mappings
      .map((mapping) => {
        const result = node.ownerDocument.evaluate(
          mapping.xpath,
          node,
          namespaceResolver,
          XPathResult.FIRST_ORDERED_NODE_TYPE
        );
        if (result.singleNodeValue === null) return;
        const value = !result.singleNodeValue.textContent
          ? null
          : mapping.type === "xsd:dateTime"
          ? new Date(result.singleNodeValue.textContent)
          : mapping.type === "xsd:decimal"
          ? parseFloat(result.singleNodeValue.textContent)
          : mapping.type === "xsd:nonNegativeInteger"
          ? parseInt(result.singleNodeValue.textContent)
          : result.singleNodeValue.textContent;
        return [mapping.property, value];
      })
      .filter((_) => _ !== undefined)
  );

const _mapToTags = (properties: GeoJsonProperties, node: Element) => {
  properties &&
    mappings.forEach((mapping) => {
      if (!(mapping.property in properties)) return;
      let _node = node;
      mapping.xpath.split("/").forEach((part) => {
        const [prefix, name] = part.split(":");
        const namespace = namespaceResolver(prefix);
        _node =
          Array.from(_node.children).find(
            (_) => _.namespaceURI === namespace && _.nodeName === name
          ) || _node.appendChild(document.createElementNS(namespace, name));
      });
      _node.append(
        mapping.type === "xsd:dateTime"
          ? new Date(properties[mapping.property])
              .toISOString()
              .replace(/\.\d+Z$/, "Z")
          : properties[mapping.property]
      );
    });
};

const _addCoords = (segment: Element, coords: Position) => {
  segment.setAttribute("lat", coords[1].toString());
  segment.setAttribute("lon", coords[0].toString());
  coords[2] &&
    segment
      .appendChild(document.createElementNS(namespaces.gpx, "ele"))
      .append(coords[2].toString());
};
