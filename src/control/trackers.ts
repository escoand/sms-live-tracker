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
        ".trackers .requested { color: grey; font-size: x-small; }",
        ".trackers .fail { color: orangered; }"
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

    this._button.addEventListener("click", this.toggle.bind(this));
    head.addEventListener("click", this.toggle.bind(this));

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
          .forEach(this._updateTrackerInUi.bind(this));
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
            <td>${tracker.properties?.name}</td>
            <td><span id="${prefix}-battery"></span></td>
            <td>
                <div id="${prefix}-received"></div>
                <div id="${prefix}-requested" class="requested"></div>
            </td>
            <td>
                <button id="${prefix}-button">⭮</button>
            </td>
        </tr>
    `;
      this._trackers.appendChild(row.firstElementChild);
      document
        .getElementById(`${prefix}-button`)
        ?.addEventListener(
          "click",
          this.requestPosition.bind(this, tracker.properties?.name)
        );
    }

    // update tracker entry
    if (!tracker.geometry.coordinates.length) {
      document.getElementById(prefix).classList.add("fail");
    } else {
      document.getElementById(prefix).classList.remove("fail");
    }
    document.getElementById(prefix + "-battery").innerHTML =
      tracker.properties?.battery || "";

    const received = document.getElementById(prefix + "-received");
    if (tracker.geometry.coordinates.length && tracker.properties?.received) {
      const date = new Date(tracker.properties.received).getTime();
      received.innerHTML = timeDiff(date);
    } else {
      received.innerHTML = "";
    }

    const requested = document.getElementById(prefix + "-requested");
    if (tracker.properties.nextPoi) {
      requested.innerHTML = tracker.properties.nextPoi;
    } else {
      requested.innerHTML = "";
    }

    const button = document.getElementById(prefix + "-button");
    const inProgress = [
      ["failed", "⊗"],
      ["delivered", "◕"],
      ["sent", "◑"],
      ["requested", "◔"],
    ].some(([state, icon]) => {
      if (!tracker.properties?.[state]) return false;
      const date = new Date(tracker.properties?.[state]).getTime();
      button.innerHTML = icon;
      button.title = `${getText(state)}: ${timeDiff(date)}`;
      return true;
    });
    if (!inProgress) {
      button.innerHTML = "⭮";
      button.title = "";
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
      .map((point: Feature<Point>) => {
        point.properties._lngLat = new LngLat(
          point.geometry.coordinates[0],
          point.geometry.coordinates[1]
        );
        point.properties._closestRouteDist = Infinity;
        point.properties._closestRouteIdx = -1;
        return point;
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
