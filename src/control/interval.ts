import { Feature, LineString, Point } from "geojson";
import {
  FilterSpecification,
  GeoJSONSource,
  IControl,
  LngLat,
  Map,
  MapSourceDataEvent,
} from "maplibre-gl";
import {
  asFeatureCollection,
  blackWhiteForeground,
  filterLineString,
} from "../const";

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
    if (evt && evt.sourceDataType !== "content") return;

    this._source.getData().then((data) => {
      const intervals = asFeatureCollection(data)
        .features.filter(filterLineString)
        .flatMap(this._createIntervals);

      this._source.map
        .addSource(this._id, {
          type: "geojson",
          data: { type: "FeatureCollection", features: intervals },
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

  private _createIntervals(feature: Feature<LineString>) {
    let position: LngLat;
    let length = 0;
    const intervals: Feature<Point>[] = [];

    // iterate through each coordinate pair to create route segments
    feature.geometry.coordinates.forEach((cur, idx) => {
      const newPosition = new LngLat(cur[0], cur[1]);
      if (idx === 0) {
        position = newPosition;
        return;
      }
      const distance = position.distanceTo(newPosition);
      const newLength = length + distance;

      // create interval markers at specified intervals
      for (
        let offset = length - (length % INTERVAL_IN_M) + INTERVAL_IN_M;
        offset <= newLength;
        offset += INTERVAL_IN_M
      ) {
        const name = (newLength - (newLength % INTERVAL_IN_M)) / 1000;
        const ratio = (offset - length) / distance;
        const coordinates = [
          position.lng + (newPosition.lng - position.lng) * ratio,
          position.lat + (newPosition.lat - position.lat) * ratio,
        ];
        intervals.push({
          type: "Feature",
          geometry: { type: "Point", coordinates },
          properties: {
            name,
            color: feature.properties?.color,
            group: feature.properties?.name,
          },
        });
      }

      position = newPosition;
      length = newLength;
    });

    return intervals;
  }
}
