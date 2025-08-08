import { Feature, FeatureCollection, LineString, Point } from "geojson";
import {
  FilterSpecification,
  GeoJSONSource,
  IControl,
  LngLat,
  Map,
  MapSourceDataEvent,
} from "maplibre-gl";
import { blackWhiteForeground } from "../const";

const INTERVAL_IN_M = 1_000;

export class IntervalControl implements IControl {
  private _id: string;
  private _source: GeoJSONSource;
  private _belowIcon?: string;
  private _belowText?: string;
  private _filter?: FilterSpecification;

  constructor(
    source: GeoJSONSource,
    belowIcon?: string,
    belowText?: string,
    filter?: FilterSpecification
  ) {
    this._id = Math.random().toString(36).substring(2);
    this._source = source;
    this._source.on("data", this._updateRoutes.bind(this));
    this._belowIcon = belowIcon;
    this._belowText = belowText;
    this._filter = filter;
  }

  onAdd(map: Map): HTMLElement {
    return document.createElement("div");
  }

  onRemove(map: Map): void {}

  getId() {
    return this._id;
  }

  private _updateRoutes(evt?: MapSourceDataEvent) {
    if (evt && evt.sourceDataType != "content") return;

    this._source.getData().then((data: FeatureCollection) => {
      const distances: Feature<Point>[] = [];

      data.features
        .filter((feature) => feature.geometry.type === "LineString")
        .forEach((feature: Feature<LineString>) => {
          feature.geometry.coordinates.reduce(
            (acc, cur, idx) => {
              if (idx === 0) return acc;
              const pos = new LngLat(cur[0], cur[1]);
              const dist = acc.pos.distanceTo(pos);
              const length = acc.length + dist;
              for (
                let offset =
                  acc.length - (acc.length % INTERVAL_IN_M) + INTERVAL_IN_M;
                offset <= length;
                offset += INTERVAL_IN_M
              ) {
                const name = (length - (length % INTERVAL_IN_M)) / 1000;
                const ratio = (offset - acc.length) / dist;
                const coordinates = [
                  acc.pos.lng + (pos.lng - acc.pos.lng) * ratio,
                  acc.pos.lat + (pos.lat - acc.pos.lat) * ratio,
                ];
                distances.push({
                  type: "Feature",
                  geometry: { type: "Point", coordinates },
                  properties: {
                    name,
                    color: feature.properties.color,
                    group: feature.properties.name,
                  },
                });
              }
              return { pos, length };
            },
            {
              pos: new LngLat(
                feature.geometry.coordinates[0][0],
                feature.geometry.coordinates[0][1]
              ),
              length: 0,
            }
          );
        });

      this._source.map
        .addSource(this._id, {
          type: "geojson",
          data: { type: "FeatureCollection", features: distances },
        })
        .addLayer(
          {
            id: this._id + "-icon",
            source: this._id,
            type: "circle",
            filter: this._filter,
            paint: {
              "circle-color": ["get", "color"],
              "circle-opacity": 0.75,
              "circle-radius": 10,
            },
          },
          this._belowIcon
        )
        .addLayer(
          {
            id: this._id + "-text",
            source: this._id,
            type: "symbol",
            filter: this._filter,
            layout: {
              "text-field": ["get", "name"],
              "text-overlap": "never",
              "text-size": 10,
            },
            paint: {
              "text-color": blackWhiteForeground,
            },
          },
          this._belowText
        );
    });
  }
}
