import { mdiAccountGroup } from "@mdi/js";
import { Feature, FeatureCollection, LineString, Point } from "geojson";
import { GeoJSONSource, LngLat, Map, MapSourceDataEvent } from "maplibre-gl";
import { iconColor } from "../const";
import { SvgIconControl } from "./base";

const texts = {
  confirm: {
    de: "Dadurch wird eine SMS an den Tracker und eine SMS zurück gesendet. Bist du sicher?",
    _: "This will send a SMS to the tracker and a SMS back. Are you sure?",
  },
  delivered: { de: "zugestellt" },
  failed: { de: "Fehler" },
  requested: { de: "angefragt" },
  sent: { de: "gesendet" },
};

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

function createError(msg: string): ErrorEvent {
  // @ts-expect-error
  return { error: new Error(msg), type: "error" };
}

const filterPoi = (feature: Feature<Point>) =>
  feature.geometry.type === "Point" &&
  feature.geometry.coordinates.length > 0 &&
  feature.properties.isDestination === true;

const filterTracker = (feature: Feature) =>
  feature.geometry.type === "Point" && feature.geometry.coordinates.length > 0;

export class TrackersControl extends SvgIconControl {
  private _table: HTMLTableElement;
  private _trackers: HTMLTableSectionElement;
  private _routes: GeoJSONSource;

  constructor(trackers: GeoJSONSource, routes: GeoJSONSource) {
    super(mdiAccountGroup, trackers);
    this._routes = routes;

    this._container
      .appendChild(document.createElement("style"))
      .append(
        ".trackers td { text-align: right; vertical-align: top; }",
        ".trackers .requested { color: grey; font-size: x-small; }"
      );
    this._table = this._container.appendChild(document.createElement("table"));
    this._trackers = this._table.appendChild(document.createElement("tbody"));
    this._table.classList.add("trackers");

    this._source.on("data", this._onSourceUpdated.bind(this));
  }

  onAdd(map: Map) {
    const head = this._table
      .insertBefore(document.createElement("thead"), this._trackers)
      .appendChild(document.createElement("tr"));

    this._table.style.display = "none";

    head.appendChild(document.createElement("th"));
    head.appendChild(document.createElement("th")).append("🔋");
    head.appendChild(document.createElement("th")).append("📌");
    const close = head.appendChild(document.createElement("th"));
    close.innerHTML = "❌&#xFE0E;";
    close.style.color = iconColor;

    this._button.addEventListener("click", () => this.toggle());
    head.addEventListener("click", () => this.toggle());

    return this._container;
  }

  onRemove() {
    this._source.off("data", this._onSourceUpdated.bind(this));
    super.onRemove();
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
    Promise.allSettled([this._source.getData(), this._routes.getData()]).then(
      ([{ value: trackers }, { value: routes }]: [
        PromiseFulfilledResult<FeatureCollection>,
        PromiseFulfilledResult<FeatureCollection>
      ]) => {
        this._findNextPoiOnRoute(routes, trackers);
        trackers.features
          .filter((feature) => feature.geometry.type === "Point")
          .forEach(this._addTrackerToUi.bind(this));
      }
    );
  }

  private _addTrackerToUi(tracker: Feature<Point>) {
    const prefix = "data-" + tracker.properties?.name;

    // create tracker entry
    if (!document.getElementById(prefix)) {
      const row = document.createElement("tr");
      row.setAttribute("id", prefix);
      row
        .appendChild(document.createElement("td"))
        .append(tracker.properties?.name);
      row
        .appendChild(document.createElement("td"))
        .setAttribute("id", prefix + "-battery");
      const cell = row.appendChild(document.createElement("td"));
      cell
        .appendChild(document.createElement("div"))
        .setAttribute("id", prefix + "-received");
      const requested = cell.appendChild(document.createElement("div"));
      requested.setAttribute("id", prefix + "-requested");
      requested.className = "requested";
      const btn = row
        .appendChild(document.createElement("td"))
        .appendChild(document.createElement("button"));
      btn.append("🔃");
      btn.addEventListener("click", () =>
        this.requestPosition(tracker.properties?.name)
      );
      this._trackers.appendChild(row);
    }

    // update tracker entry
    document.getElementById(prefix).style.color = !tracker.geometry.coordinates
      .length
      ? "orangered"
      : "";
    document.getElementById(prefix + "-battery").innerHTML =
      tracker.properties?.battery || "";

    const received = document.getElementById(prefix + "-received");
    received.innerHTML = "";
    if (tracker.geometry.coordinates.length && tracker.properties?.received) {
      const date = new Date(tracker.properties.received).getTime();
      received.append(timeDiff(date));
    }

    const requested = document.getElementById(prefix + "-requested");
    requested.innerHTML = "";
    ["failed", "delivered", "sent", "requested"].some((state) => {
      if (!tracker.properties?.[state]) return false;
      const date = new Date(tracker.properties?.[state]).getTime();
      requested.append(getText(state), ": ", timeDiff(date));
      return true;
    });

    if (tracker.properties?.nextPoi) {
      requested.append(tracker.properties.nextPoi);
    }
  }

  private _findNextPoiOnRoute(
    routes: FeatureCollection,
    trackers: FeatureCollection
  ) {
    // get LngLat and distance of every route point
    const routePoints = routes.features
      .filter((route) => route.geometry.type === "LineString")
      .flatMap((route: Feature<LineString>) =>
        route.geometry.coordinates.map((pos) => ({
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
    routes.features
      .filter(filterPoi)
      .concat(trackers.features.filter(filterTracker))

      // add LngLat to POIs and trackers
      .map((point: Feature<Point>) => ({
        ...point,
        properties: {
          ...point.properties,
          _lngLat: new LngLat(
            point.geometry.coordinates[0],
            point.geometry.coordinates[1]
          ),
          _closestRouteDist: Infinity,
          _closestRouteIdx: -1,
        },
      }))

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
    const sortedPois = routes.features
      .filter(filterPoi)
      .sort(
        (a, b) => a.properties._closestRouteIdx - b.properties._closestRouteIdx
      ) as Feature<Point>[];

    // loop through trackers and measure distance to next POI
    trackers.features.filter(filterTracker).forEach((point: Feature<Point>) => {
      const nextPoi = sortedPois.find(
        (route) =>
          route.properties._closestRouteIdx > point.properties._closestRouteIdx
      );
      if (!nextPoi) return;

      // calc distance from tracker to next POI along route
      const distance =
        point.properties._closestRouteDist -
        routePoints[point.properties._closestRouteIdx].distance +
        routePoints[nextPoi.properties._closestRouteIdx].distance +
        nextPoi.properties._closestRouteDist;
      point.properties.nextPoi =
        (distance / 1000).toFixed(1) + "km → " + nextPoi.properties.name;

      // clean up
      delete point.properties._lngLat;
      delete point.properties._closestRouteDist;
      delete point.properties._closestRouteIdx;
    });
  }
}
