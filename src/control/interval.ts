import { along, length } from "@turf/turf";
import { Feature, FeatureCollection, LineString, Point } from "geojson";
import {
  FilterSpecification,
  GeoJSONSource,
  IControl,
  Map,
  MapSourceDataEvent,
} from "maplibre-gl";
import { blackWhiteForeground } from "../const";

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
          const len = length(feature);
          for (let i = 1; i < len; i++) {
            if (feature.properties.color)
              distances.push(
                Object.assign(along(feature, i), {
                  properties: {
                    name: i,
                    color: feature.properties.color,
                    group: feature.properties.name,
                  },
                })
              );
          }
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
