import { mdiFitToPageOutline } from "@mdi/js";
import { FeatureCollection } from "geojson";
import { GeoJSONSource, LngLatBoundsLike, Map } from "maplibre-gl";
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
    this._source.getData().then((data: FeatureCollection) => {
      const bounds: LngLatBoundsLike = data.features
        .filter((feature) => !feature.properties?.hidden)
        .flatMap((feature) =>
          feature.geometry?.type == "LineString"
            ? feature.geometry?.coordinates
            : feature.geometry?.type == "MultiLineString"
            ? feature.geometry?.coordinates.flat()
            : feature.geometry?.type == "Point"
            ? [feature.geometry?.coordinates]
            : []
        )
        .reduce(
          (sum, [lon, lat]) => [
            [
              lon < sum[0][0] ? lon : sum[0][0],
              lat < sum[0][1] ? lat : sum[0][1],
            ],
            [
              lon > sum[1][0] ? lon : sum[1][0],
              lat > sum[1][1] ? lat : sum[1][1],
            ],
          ],
          [
            [Number.MAX_VALUE, Number.MAX_VALUE],
            [Number.MIN_VALUE, Number.MIN_VALUE],
          ]
        );
      this._source.map.fitBounds(bounds, { padding: 50 });
    });
  }
}
