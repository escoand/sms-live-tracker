import { config, Map, MapLibreEvent, MapStyle } from "@maptiler/sdk";
import {
  FullscreenControl,
  GeoJSONSource,
  GeolocateControl,
  NavigationControl,
} from "maplibre-gl";
import "../node_modules/@maptiler/sdk/dist/maptiler-sdk.css";
import { layers, positionsSource, routesSource } from "./const";
import { RoutesControl } from "./control.routes";
import { TrackersControl } from "./control.trackers";
import { ZoomToFitControl } from "./control.zoomtofit";

class LiveTrackerMap {
  constructor(container: string, apiKey: string) {
    config.apiKey = apiKey;

    const map = new Map({
      container,
      style: MapStyle.TOPO,
      center: [0, 0],
      geolocateControl: false,
      scaleControl: "bottom-left",
      navigationControl: false,
    });

    map.on("load", this._init);
    map.on("render", this._removeControls);
  }

  private _init(evt: MapLibreEvent) {
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
    map.addControl(new FullscreenControl());
    map.addControl(new GeolocateControl({}));
    map.addControl(new NavigationControl(), "bottom-right");
    map.addControl(zoomControl, "bottom-right");
    map.addControl(new RoutesControl(routes));
    map.addControl(new TrackersControl(positions), "top-left");

    // add events
    routes.once("data", () => zoomControl.zoomToFit());
    setInterval(() => positions.setData(positions._options.data), 10 * 1000);
  }

  private _removeControls(evt: MapLibreEvent) {
    const map = evt.target;

    map._controls
      .filter((c) => "logoURL" in c || "_attribHTML" in c)
      .forEach(map.removeControl.bind(map));
  }
}

globalThis.LiveTrackerMap = LiveTrackerMap;
