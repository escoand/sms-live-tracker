import { mdiFitToPageOutline } from "@mdi/js";
import { GeoJSONSource, LngLatBounds, LngLatLike, Map } from "maplibre-gl";
import { asFeatureCollection } from "../const";
import { SvgIconControl } from "./base";

export class ZoomToFitControl extends SvgIconControl {
  constructor(source: GeoJSONSource) {
    super(mdiFitToPageOutline, source);
  }

  onAdd(map: Map) {
    this._button.addEventListener("click", () => this.zoomToFit());

    return this._container;
  }

  zoomToFit() {
    this._source.getData().then((data) => {
      const bounds = asFeatureCollection(data)
        .features.flatMap((feature) =>
          feature.geometry.type == "LineString"
            ? feature.geometry.coordinates
            : feature.geometry.type == "MultiLineString"
            ? feature.geometry.coordinates.flat()
            : feature.geometry.type == "Point"
            ? [feature.geometry.coordinates]
            : []
        )
        .reduce(
          (bounds, coord) => bounds.extend(coord as LngLatLike),
          new LngLatBounds([
            [Number.MAX_VALUE, 90],
            [Number.MIN_VALUE, -90],
          ])
        );
      if (bounds) this._source.map.fitBounds(bounds, { padding: 50 });
    });
  }
}
