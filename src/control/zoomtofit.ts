import { mdiFitToPageOutline } from "@mdi/js";
import { GeoJSON, Position } from "geojson";
import { GeoJSONSource, LngLatBounds, LngLatLike, Map } from "maplibre-gl";
import { SourcedSvgIconControl } from "./base";

const getCoordinates = (data: GeoJSON): Position[] => {
  switch (data.type) {
    case "Feature":
      return getCoordinates(data.geometry);
    case "FeatureCollection":
      return data.features.flatMap(getCoordinates);
    case "GeometryCollection":
      return data.geometries.flatMap(getCoordinates);
    case "LineString":
      return data.coordinates;
    case "MultiLineString":
      return data.coordinates.flat();
    case "MultiPoint":
      return data.coordinates;
    case "MultiPolygon":
      return data.coordinates.flat(2);
    case "Point":
      return [data.coordinates];
    case "Polygon":
      return data.coordinates.flat();
  }
};

export default class ZoomToFitControl extends SourcedSvgIconControl {
  constructor(source: GeoJSONSource) {
    super(mdiFitToPageOutline, source);
  }

  onAdd(map: Map) {
    this._button.addEventListener("click", () => this.zoomToFit());

    return this._container;
  }

  zoomToFit(animate = true) {
    this._source.getData().then((data) => {
      const bounds = getCoordinates(data).reduce(
        (bounds, coord) => bounds.extend(coord as LngLatLike),
        new LngLatBounds([
          [Number.POSITIVE_INFINITY, 90],
          [Number.NEGATIVE_INFINITY, -90],
        ])
      );
      this._source.map.fitBounds(bounds, { padding: 50, animate });
    });
  }
}
