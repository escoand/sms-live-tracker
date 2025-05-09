import {
  ErrorEvent,
  FullscreenControl,
  GeoJSONSource,
  GeolocateControl,
  Map,
  MapLibreEvent,
  NavigationControl,
  ScaleControl,
} from "maplibre-gl";
import { layers, positionsSource, routesSource } from "./const";
import { ErrorControl } from "./control.error";
import { RoutesControl } from "./control.routes";
import { TrackersControl } from "./control.trackers";
import { ZoomToFitControl } from "./control.zoomtofit";

import "../node_modules/@maptiler/sdk/dist/maptiler-sdk.css";

class LiveTrackerMap {
  private _map: Map;

  constructor(container: string, apiKey: string) {
    this._map = new Map({
      attributionControl: false,
      center: [0, 0],
      container,
      style: `https://api.maptiler.com/maps/topo/style.json?key=${apiKey}`,
    });

    this._map.on("error", this._onError.bind(this));
    this._map.once("load", this._onLoad.bind(this));
  }

  private _onLoad(evt: MapLibreEvent) {
    const map = evt.target;

    // add sources
    const routes: GeoJSONSource = map
      .addSource(routesSource, { type: "geojson", data: "/routes.json" })
      .getSource(routesSource);
    const positions: GeoJSONSource = map
      .addSource(positionsSource, { type: "geojson", data: "/positions" })
      .getSource(positionsSource);

    // add layers
    layers.forEach((layer) => map.addLayer(layer));

    // add controls
    const zoomControl = new ZoomToFitControl(routes);
    map.addControl(new ScaleControl());
    map.addControl(new FullscreenControl());
    map.addControl(new GeolocateControl({}));
    map.addControl(new NavigationControl(), "bottom-right");
    map.addControl(zoomControl, "bottom-right");
    map.addControl(new RoutesControl(routes), "top-right");
    map.addControl(new TrackersControl(positions), "top-left");

    // add events
    routes.once("data", () => zoomControl.zoomToFit());
    setInterval(() => positions.setData(positions._options.data), 10 * 1000);
  }

  private _onError(evt: ErrorEvent) {
    this._map.addControl(new ErrorControl(evt), "bottom-left");
  }
}

globalThis.LiveTrackerMap = LiveTrackerMap;
