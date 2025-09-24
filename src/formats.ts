import { Feature } from "geojson";

export const toFeatures = (data: GeoJSON.GeoJSON): Feature[] => {
  switch (data.type) {
    case "Feature":
      return [data];
    case "FeatureCollection":
      return data.features.flatMap(toFeatures);
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

export const toGeoJSON = (gpx: Document): GeoJSON.GeoJSON => {
  const json: GeoJSON.FeatureCollection = {
    features: [],
    type: "FeatureCollection",
  };

  // points
  gpx.querySelectorAll("wpt").forEach((wpt) => {
    json.features.push({
      geometry: {
        coordinates: [
          parseFloat(wpt.getAttribute("lon")),
          parseFloat(wpt.getAttribute("lat")),
          parseFloat(wpt.getAttribute("ele")),
        ],
        type: "Point",
      },
      properties: {
        name: wpt.querySelector("name")?.textContent,
      },
      type: "Feature",
    });
  });

  // tracks
  gpx.querySelectorAll("trk").forEach((trk) => {
    const track: Feature<MultiLineString> = {
      geometry: { type: "MultiLineString", coordinates: [] },
      properties: {
        name: trk.querySelector("name")?.textContent,
        color: "#" + trk.querySelector("color")?.textContent,
      },
      type: "Feature",
    };
    trk.querySelectorAll("trkseg").forEach((trkseg) => {
      const segment: Position[] = [];
      trkseg.querySelectorAll("trkpt").forEach((trkpt) => {
        segment.push([
          parseFloat(trkpt.getAttribute("lon")),
          parseFloat(trkpt.getAttribute("lat")),
          parseFloat(trkpt.querySelector("ele")?.textContent),
        ]);
      });
      track.geometry.coordinates.push(segment);
      json.features.push(track);
    });
  });

  // routes
  gpx.querySelectorAll("rte").forEach((rte) => {
    const route: Feature<MultiPoint> = {
      geometry: { type: "MultiPoint", coordinates: [] },
      properties: {
        name: rte.querySelector("name")?.textContent,
        color: "#" + rte.querySelector("color")?.textContent,
      },
      type: "Feature",
    };
    rte.querySelectorAll("rtept").forEach((rtept) => {
      route.geometry.coordinates.push([
        parseFloat(rtept.getAttribute("lon")),
        parseFloat(rtept.getAttribute("lat")),
        parseFloat(rtept.querySelector("ele")?.textContent),
      ]);
    });
    json.features.push(route);
  });

  return json;
};
