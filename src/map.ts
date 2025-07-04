import {
  ErrorEvent,
  FullscreenControl,
  GeoJSONSource,
  GeolocateControl,
  Map,
  MapLibreEvent,
  NavigationControl,
  ScaleControl,
} from "maplibre-gl/dist/maplibre-gl";
import { layers, positionsSource, routesSource } from "./const";
import { ErrorControl } from "./control/error";
import { ExportControl } from "./control/export";
import { RoutesControl } from "./control/routes";
import { StyleSwitcherControl } from "./control/styleswitcher";
import { TrackersControl } from "./control/trackers";
import { ZoomToFitControl } from "./control/zoomtofit";
import { LiveTrackerConfig } from "./types";

import "@maptiler/sdk/dist/maptiler-sdk.css";
import "@watergis/maplibre-gl-export/dist/maplibre-gl-export.css";

class LiveTrackerMap {
  private _config: LiveTrackerConfig | undefined = undefined;
  private _map: Map;

  constructor(container: string) {
    fetch("/config.json").then((response) => {
      if (response.ok) {
        response.json().then((config) => {
          this._config = config;
          this._init(container);
        });
      } else {
        this._init(container);
      }
    });
  }

  private _init(container: string) {
    this._map = new Map({
      attributionControl: false,
      center: [0, 0],
      container,
      style: `https://api.maptiler.com/maps/topo/style.json?key=${this._config?.apiKey}`,
    });

    this._map.on("error", this._onError.bind(this));
    this._map.once("load", this._onLoad.bind(this));
  }

  private _onLoad(evt: MapLibreEvent) {
    const map = evt.target;

    // add sources
    const routes: GeoJSONSource = map
      .addSource(routesSource, {
        type: "geojson",
        data: "/routes.json",
      })
      .getSource(routesSource);
    const positions: GeoJSONSource = map
      .addSource(positionsSource, {
        type: "geojson",
        data: "/trackers.json",
      })
      .getSource(positionsSource);

    // add layers
    layers.forEach((layer) => map.addLayer(layer));

    // add controls
    const zoomControl = new ZoomToFitControl(routes);
    map.addControl(new ScaleControl());
    map.addControl(new FullscreenControl());
    map.addControl(new GeolocateControl({}));
    map.addControl(
      new StyleSwitcherControl([
        `https://api.maptiler.com/maps/topo-v2/style.json?key=${this._config?.apiKey}`,
        `https://api.maptiler.com/maps/hybrid/style.json?key=${this._config?.apiKey}`,
      ])
    );
    map.addControl(new NavigationControl(), "bottom-right");
    map.addControl(zoomControl, "bottom-right");
    map.addControl(new RoutesControl(routes), "top-right");
    map.addControl(new TrackersControl(positions), "top-left");
    map.addControl(new ExportControl());

    // add events
    routes.once("data", () => zoomControl.zoomToFit());
    setInterval(() => positions.setData(positions._options.data), 10 * 1000);
  }

  private _onError(evt: ErrorEvent) {
    this._map.addControl(new ErrorControl(evt), "bottom-left");
  }
}

globalThis.LiveTrackerMap = LiveTrackerMap;
