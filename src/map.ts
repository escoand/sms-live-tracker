import { mdiDockLeft } from "@mdi/js";
import {
  ErrorEvent,
  FullscreenControl,
  GeoJSONSource,
  GeoJSONSourceSpecification,
  GeolocateControl,
  Map,
  MapLibreEvent,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";
import {
  layers,
  positionsSource,
  routeFilter,
  routeLines,
  routesSource,
  routeTexts,
  styles,
} from "./const";
import ErrorControl from "./control/error";
import GpxExportControl from "./control/export";
import GpxImportControl from "./control/import";
import IntervalControl from "./control/interval";
import OverflowMenuControl from "./control/overflow";
import PrintControl from "./control/print";
import RoutesControl from "./control/routes";
import StyleSwitcherControl from "./control/styleswitcher";
import TrackersControl from "./control/trackers";
import ZoomToFitControl from "./control/zoomtofit";
import { LiveTrackerConfig } from "./types";

import "@maptiler/sdk/dist/maptiler-sdk.css";
import "./nextcloud.css";

class LiveTrackerMap {
  private _config: LiveTrackerConfig | undefined = undefined;
  private _map?: Map;

  constructor(container: string) {
    fetch(globalThis.liveTrackerUrls.config).then((response) => {
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
    const mapStyles = this._config?.apiKey
      ? styles.map((style) =>
          style.replace("{apiKey}", this._config?.apiKey || ""),
        )
      : ["https://demotiles.maplibre.org/style.json"];
    this._map = new Map({
      attributionControl: false,
      center: [0, 0],
      container,
      style: mapStyles[0],
    });

    this._map.on("error", this._onError.bind(this));
    this._map.once("load", this._onLoad.bind(this));
  }

  private _onLoad(evt: MapLibreEvent) {
    const map = evt.target;

    // add sources
    const routes = map
      .addSource(routesSource, {
        type: "geojson",
        data: globalThis.liveTrackerUrls.routes,
      })
      .getSource(routesSource) as GeoJSONSource;
    const positionsConfig = {
      type: "geojson",
      data: globalThis.liveTrackerUrls.trackers,
    } as GeoJSONSourceSpecification;
    const positions = map
      .addSource(positionsSource, positionsConfig)
      .getSource(positionsSource) as GeoJSONSource;

    // add layers
    layers.forEach((layer) => map.addLayer(layer));

    // add controls
    const zoomControl = new ZoomToFitControl(routes);
    const intervalControl = new IntervalControl(
      routes,
      routeLines,
      routeTexts,
      routeFilter,
    );
    const sidebar = document.getElementById("live-tracker-list");
    if (sidebar) {
      new TrackersControl(positions, routes, sidebar).onAdd(map);
      const sidebarActions = document.getElementById("live-tracker-sidebar-actions");
      if (sidebarActions) {
        const zoomButton = zoomControl.onAdd(map);
        zoomButton.classList.remove("maplibregl-ctrl", "maplibregl-ctrl-group");
        const button = zoomButton.querySelector("button");
        button?.classList.add("app-navigation-toggle");
        const icon = zoomButton.querySelector<HTMLElement>(".maplibregl-ctrl-icon");
        if (icon) icon.style.transform = "none";
        sidebarActions.appendChild(zoomButton);
      }
    } else {
      map.addControl(new TrackersControl(positions, routes), "top-left");
      map.addControl(zoomControl, "bottom-right");
    }
    map.addControl(new ScaleControl());
    map.addControl(new FullscreenControl());
    map.addControl(new GeolocateControl({}));
    map.addControl(intervalControl);
    map.addControl(
      new StyleSwitcherControl(
        this._config?.apiKey
          ? styles.map((style) =>
              style.replace("{apiKey}", this._config?.apiKey || ""),
            )
          : ["https://demotiles.maplibre.org/style.json"],
        [routesSource, positionsSource, intervalControl.getId()],
      ),
    );
    map.addControl(new NavigationControl(), "bottom-right");
    map.addControl(new RoutesControl(routes), "top-right");

    // overflow menu
    const moreControls = new OverflowMenuControl();
    map.addControl(moreControls);
    moreControls.addControl(new GpxExportControl(routes));
    moreControls.addControl(new GpxImportControl(routes));
    moreControls.addControl(new PrintControl());

    // add events
    routes.once("data", () => zoomControl.zoomToFit(false));
    setInterval(() => positions.setData(positionsConfig.data), 10 * 1000);
  }

  private _onError(evt: ErrorEvent) {
    this._map?.addControl(new ErrorControl(evt), "bottom-left");
  }
}

// @ts-expect-error: globalThis doesn't know LiveTrackerMap
globalThis.LiveTrackerMap = LiveTrackerMap;

function startNextcloudMap() {
  const nextcloudMap = document.getElementById("live-tracker-map");
  if (nextcloudMap) {
    const shell = document.getElementById("live-tracker-app");
    const toggle = document.getElementById("live-tracker-sidebar-toggle");
    if (shell && toggle) {
      const navigation = document.getElementById("app-navigation");
      const mobile = window.matchMedia("(max-width: 1023px)");
      const updateNavigation = () => {
        const open = mobile.matches
          ? shell.classList.contains("sidebar-open")
          : !shell.classList.contains("sidebar-collapsed");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute(
          "aria-label",
          open ? "Hide trackers" : "Show trackers",
        );
        toggle.title = open ? "Hide trackers" : "Show trackers";
        if (navigation) {
          navigation.setAttribute("aria-hidden", String(!open));
          navigation.inert = !open;
        }
      };
      const icon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("width", "20");
      icon.setAttribute("height", "20");
      icon.setAttribute("fill", "currentColor");
      icon.setAttribute("aria-hidden", "true");
      icon
        .appendChild(
          document.createElementNS("http://www.w3.org/2000/svg", "path"),
        )
        .setAttribute("d", mdiDockLeft);
      toggle.appendChild(icon);
      toggle.addEventListener("click", () => {
        shell.classList.toggle(
          mobile.matches ? "sidebar-open" : "sidebar-collapsed",
        );
        updateNavigation();
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
      });
      mobile.addEventListener("change", () => {
        shell.classList.remove("sidebar-open", "sidebar-collapsed");
        updateNavigation();
      });
      updateNavigation();
    }
    const { config, routes, trackers, request, worker } = nextcloudMap.dataset;
    if (worker) setWorkerUrl(worker);
    globalThis.liveTrackerUrls = {
      config: config!,
      routes: routes!,
      trackers: trackers!,
      request: request!,
      requestToken: globalThis.OC?.requestToken || "",
    };
    new LiveTrackerMap(nextcloudMap.id);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startNextcloudMap);
} else {
  startNextcloudMap();
}
