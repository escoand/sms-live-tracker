import {
  mdiAccountGroup,
  mdiCircleSlice2,
  mdiCircleSlice4,
  mdiCircleSlice6,
  mdiCloseCircle,
  mdiSyncCircle,
} from "@mdi/js";
import { Feature, LineString, MultiLineString, Point } from "geojson";
import {
  GeoJSONSource,
  LngLat,
  Map,
  MapMouseEvent,
  MapSourceDataEvent,
} from "maplibre-gl";
import { filterLineString, filterPoint } from "../const";
import { toFeatures } from "../formats";
import { SourcedSvgIconControl, SvgIconControl } from "./base";
import { createError } from "./error";

const debugSource = "debug";
const debugProperty = "_isDebug";

const texts: { [key: string]: { [lang: string]: string } } = {
  battery: { de: "Akku" },
  confirm: {
    de: "Dadurch wird eine SMS an den Tracker und eine SMS zurück gesendet. Bist du sicher?",
    _: "This will send a SMS to the tracker and a SMS back. Are you sure?",
  },
  delivered: { de: "zugestellt" },
  failed: { de: "Fehler" },
  requested: { de: "angefragt" },
  sent: { de: "gesendet" },
  update: { _: "Update" },
};

const states: [string, string][] = [
  ["failed", mdiCloseCircle],
  ["delivered", mdiCircleSlice6],
  ["sent", mdiCircleSlice4],
  ["requested", mdiCircleSlice2],
  ["refresh", mdiSyncCircle],
];

function getText(id: string): string {
  if (!(id in texts)) return id;
  const lang = navigator.languages.find((_) => _ in texts[id]) || "_";
  return texts[id][lang] || id;
}

function timeDiff(then: number, now: number = Date.now()): string {
  const diff = now - then;
  const days = Math.floor(diff / 1000 / 24 / 60 / 60);
  const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  let result = "";
  if (days) result += days + "d ";
  if (days || hours) result += hours + "h ";
  return result + mins + "min";
}

const filterPoiRoutes = (
  feature: Feature
): feature is Feature<LineString | MultiLineString> =>
  filterLineString(feature) && feature.properties?.hasDestinations === true;

const filterPoi = (feature: Feature): feature is Feature<Point> =>
  filterPoint(feature) && feature.properties?.isDestination === true;

export class TrackersControl extends SourcedSvgIconControl {
  private _table: HTMLTableElement;
  private _trackers: HTMLTableSectionElement;
  private _routes: GeoJSONSource;

  constructor(trackers: GeoJSONSource, routes: GeoJSONSource) {
    super(mdiAccountGroup, trackers);
    this._routes = routes;

    this._container
      .appendChild(document.createElement("style"))
      .append(
        ".trackers { line-height: normal; margin: 2px 5px; }",
        ".trackers .close { cursor: pointer; text-align: right; }",
        ".trackers .info { color: grey; font-size: x-small; padding-left: 10pt; text-align: left; }",
        ".trackers .fail { color: orangered; }",
        ".trackers img { height: 25px; width: 25px; }"
      );
    this._table = this._container.appendChild(document.createElement("table"));
    this._trackers = document.createElement("tbody");

    this._source.on("data", this._onSourceUpdated.bind(this));

    const params = new URLSearchParams(window.location.search);

    // activate debug
    if (params.has("debug")) {
      this._source.map.on("click", this._debugClick.bind(this));
    }
  }

  onAdd(map: Map) {
    this._table.classList.add("trackers");
    this._table.style.display = "none";
    this._table.innerHTML = `<thead>
      <tr>
        <th>#</th>
        <th>${getText("battery")}</th>
        <th>${getText("update")}</th>
        <th class="close">❌&#xFE0E;</th>
      </tr>
    </thead>`;
    this._table.appendChild(this._trackers);

    this._button.addEventListener("click", () => this.toggle());
    this._table.firstElementChild?.addEventListener("click", () =>
      this.toggle()
    );

    return this._container;
  }

  onRemove(map: Map) {
    this._source.off("data", this._onSourceUpdated.bind(this));
    super.onRemove(map);
  }

  toggle(forceClose = false) {
    if (this._button.style.display != "none" || forceClose) {
      this._button.style.display = "none";
      this._table.style.display = "";
    } else {
      this._button.style.display = "";
      this._table.style.display = "none";
      if (this._trackers.childNodes.length == 0) this._updateTrackers();
    }
  }

  requestPosition(tracker: string) {
    if (confirm(getText("confirm"))) {
      fetch("/api/request", {
        body: tracker,
        method: "POST",
      }).then(
        (response) =>
          !response.ok &&
          this._source.map.fire(
            createError(
              `${response.statusText} (${response.status}): ${response.url}`
            )
          )
      );
    }
  }

  private _onSourceUpdated(evt: MapSourceDataEvent) {
    if (evt.sourceDataType != "content") return;
    this._updateTrackers();
  }

  private _updateTrackers() {
    Promise.all([this._source.getData(), this._routes.getData()]).then(
      ([data1, data2]) => {
        const trackers = toFeatures(data1);
        const routes = toFeatures(data2);
        this._findNextPoiOnRoute(routes, trackers);
        trackers
          .filter((feature) => feature.geometry.type === "Point")
          .forEach((feature) =>
            this._updateTrackerInUi(feature as Feature<Point>)
          );
      }
    );
  }

  private _updateTrackerInUi(tracker: Feature<Point>) {
    const prefix = "data-" + tracker.properties?.name;

    // create tracker entry
    if (!document.getElementById(prefix)) {
      const row = document.createElement("tbody");
      row.innerHTML = `
        <tr id="${prefix}">
            <td>${
              tracker.properties?.[debugProperty] === true
                ? "Debug"
                : tracker.properties?.name
            }</td>
            <td id="${prefix}-battery"></td>
            <td id="${prefix}-received"></td>
            <td rowspan="2"><button id="${prefix}-button"></button></td>
        </tr>
        <tr>
          <td id="${prefix}-info" colspan="3" class="info"></td>
        </tr>
    `;
      // @ts-expect-error: theoretically firstElementChild could be null
      this._trackers.append(...row.childNodes);
      document
        .getElementById(`${prefix}-button`)
        ?.addEventListener("click", () =>
          this.requestPosition(tracker.properties?.name)
        );
    }

    const parent = document.getElementById(prefix);
    const battery = document.getElementById(prefix + "-battery");
    const received = document.getElementById(prefix + "-received");
    const button = document.getElementById(prefix + "-button");
    const info = document.getElementById(prefix + "-info");

    if (!parent || !battery || !received || !button || !info) return;
    battery.innerHTML = "";
    received.innerHTML = "";
    button.innerHTML = "";
    button.title = "";
    info.innerHTML = "";

    // update tracker entry
    if (!tracker.geometry.coordinates.length) {
      parent.classList.add("fail");
    } else {
      parent.classList.remove("fail");
    }

    if (tracker.properties?.battery) {
      battery.innerHTML = tracker.properties?.battery;
    }

    if (tracker.geometry.coordinates.length && tracker.properties?.received) {
      const date = new Date(tracker.properties.received).getTime();
      received.innerHTML = timeDiff(date);
    }

    // info
    if (tracker.properties?.nextPoi) {
      info.appendChild(document.createElement("div")).textContent =
        tracker.properties.nextPoi;
    }

    const icon = button.appendChild(document.createElement("img"));
    const inProgress = states.some(([state, svgIconPath]) => {
      if (!tracker.properties?.[state]) return false;
      icon.src = SvgIconControl.createSvg(svgIconPath);
      const date = new Date(tracker.properties?.[state]).getTime();
      info.appendChild(document.createElement("div")).textContent = `${getText(
        state
      )}: ${timeDiff(date)}`;
      return true;
    });
    if (!inProgress) {
      icon.src = SvgIconControl.createSvg(states[states.length - 1][1]);
    }
  }

  private _findNextPoiOnRoute(routes: Feature[], trackers: Feature[]) {
    // get LngLat and distance of every route point
    const routePoints = routes
      .filter(filterPoiRoutes)
      .flatMap((route) =>
        (route.geometry.type === "MultiLineString"
          ? route.geometry.coordinates.flat()
          : route.geometry.coordinates
        ).map((pos) => ({
          lnglat: new LngLat(pos[0], pos[1]) as LngLat,
          distance: 0,
        }))
      )
      .map((cur, idx, arr) => {
        if (idx > 0)
          cur.distance =
            cur.lnglat.distanceTo(arr[idx - 1].lnglat) + arr[idx - 1].distance;
        return cur;
      });

    // filter and merge POI and tracker list
    routes
      .filter(filterPoi)
      .concat(trackers.filter(filterPoint))

      // add LngLat to POIs and trackers
      .map((point) => {
        if (!point.properties) point.properties = {};
        point.properties._lngLat = new LngLat(
          point.geometry.coordinates[0],
          point.geometry.coordinates[1]
        );
        point.properties._closestRouteDist = Infinity;
        point.properties._closestRouteIdx = -1;
        return point as Feature<Point, { [name: string]: any }>;
      })

      // find closest route point for each POI and tracker
      .forEach((point) => {
        routePoints.forEach((posRoute, idx) => {
          const dist = point.properties._lngLat.distanceTo(posRoute.lnglat);
          if (dist < point.properties._closestRouteDist) {
            point.properties._closestRouteIdx = idx;
            point.properties._closestRouteDist = dist;
          }
        });
      });

    // sort POIs along the route
    const sortedPois = routes
      .filter(filterPoi)
      .sort(
        (a, b) =>
          a.properties?._closestRouteIdx - b.properties?._closestRouteIdx
      );

    // loop through trackers and measure distance to next POI
    trackers.filter(filterPoint).forEach((point) => {
      const nextPoi = sortedPois.find(
        (route) =>
          route.properties?._closestRouteIdx >=
          point.properties?._closestRouteIdx
      );
      this._debugTrack(point, nextPoi, routePoints);
      if (!nextPoi || !point.properties || !nextPoi.properties) return;

      // calc distance from tracker to next POI along route
      const distance =
        point.properties._closestRouteDist -
        routePoints[point.properties._closestRouteIdx].distance +
        routePoints[nextPoi.properties._closestRouteIdx].distance +
        nextPoi.properties._closestRouteDist;
      point.properties.nextPoi =
        (distance / 1000).toFixed(1) + "km → " + nextPoi.properties.name;
    });
  }

  private _debugTrack(
    point: Feature<Point>,
    nextPoi: Feature<Point> | undefined,
    routePoints: { lnglat: LngLat }[]
  ) {
    if (point.properties?.[debugProperty] !== true) return;

    if (!this._source.map.getSource(debugSource)) {
      this._source.map
        .addSource(debugSource, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        })
        .addLayer({
          id: debugSource + "-track",
          source: debugSource,
          type: "line",
          paint: {
            "line-color": "black",
            "line-opacity": 0.75,
            "line-width": 5,
          },
        });
    }

    const source = this._source.map.getSource(debugSource) as GeoJSONSource;
    if (!nextPoi) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const coordinates = [point.geometry.coordinates]
      .concat(
        routePoints
          .slice(
            point.properties._closestRouteIdx,
            nextPoi.properties?._closestRouteIdx + 1
          )
          .map((point) => point.lnglat.toArray())
      )
      .concat([nextPoi.geometry.coordinates]);
    source.setData({ type: "LineString", coordinates });
  }

  private _debugClick(evt: MapMouseEvent) {
    this._source.getData().then((data) => {
      const point: Feature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: evt.lngLat.toArray(),
        },
        properties: { [debugProperty]: true },
      };
      const collection = toFeatures(data);
      const idx = collection.findIndex(
        (feature) => feature.properties?.[debugProperty] === true
      );
      if (idx >= 0) collection[idx] = point;
      else collection.push(point);
      this._source.setData({ type: "FeatureCollection", features: collection });
    });
  }
}
