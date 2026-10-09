import {
  mdiAccountGroup,
  mdiCancel,
  mdiCircleSlice2,
  mdiCircleSlice4,
  mdiCircleSlice6,
  mdiCloseCircle,
  mdiSyncCircle,
} from "@mdi/js";
import { Feature, Point } from "geojson";
import {
  GeoJSONSource,
  LngLat,
  Map,
  MapMouseEvent,
  MapSourceDataEvent,
} from "maplibre-gl";
import { filterPoi, filterPoint, filterPoiRoutes } from "../const";
import { toFeatures } from "../formats";
import { SourcedSvgIconControl, SvgIconControl } from "./base";
import ErrorControl from "./error";

const debugSource = "debug";
const debugProperty = "_isDebug";

const texts: { [key: string]: { [lang: string]: string } } = {
  battery: { de: "Akku" },
  cancelled: { de: "abgebrochen", _: "cancelled" },
  confirm: {
    de: "Dadurch wird eine SMS an den Tracker und eine SMS zurück gesendet. Bist du sicher?",
    _: "This will send a SMS to the tracker and a SMS back. Are you sure?",
  },
  delivered: { de: "zugestellt" },
  failed: { de: "Fehler" },
  requested: { de: "angefragt" },
  requestPosition: { de: "Position anfordern", _: "Request position" },
  sent: { de: "gesendet" },
  showOnMap: { de: "Auf der Karte anzeigen", _: "Show on map" },
  update: { _: "Update" },
};

const states: [string, string][] = [
  ["failed", mdiCloseCircle],
  ["cancelled", mdiCancel],
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

export default class TrackersControl extends SourcedSvgIconControl {
  private _table: HTMLTableElement;
  private _trackers: HTMLTableSectionElement;
  private _routes: GeoJSONSource;
  private _sidebar?: HTMLElement;
  private _sidebarList?: HTMLUListElement;
  private _sidebarItems = new globalThis.Map<string, HTMLLIElement>();

  constructor(
    trackers: GeoJSONSource,
    routes: GeoJSONSource,
    sidebar?: HTMLElement,
  ) {
    super(mdiAccountGroup, trackers);
    this._routes = routes;
    this._sidebar = sidebar;
    if (sidebar) {
      this._sidebarList = document.createElement("ul");
      this._sidebarList.className = "app-navigation-list live-tracker-items";
    }

    this._container
      .appendChild(document.createElement("style"))
      .append(
        ".trackers { line-height: normal; margin: 2px 5px; }",
        ".trackers .close { cursor: pointer; text-align: right; }",
        ".trackers .info { color: grey; font-size: x-small; padding-left: 10pt; text-align: left; }",
        ".trackers .fail { color: orangered; }",
        ".trackers img { height: 25px; width: 25px; }",
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
    if (this._sidebar && this._sidebarList) {
      this._sidebar.appendChild(this._sidebarList);
      this._updateTrackers();
      return this._sidebarList;
    }

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
      this.toggle(),
    );

    return this._container;
  }

  onRemove(map: Map) {
    this._source.off("data", this._onSourceUpdated.bind(this));
    this._sidebarList?.remove();
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
      fetch(globalThis.liveTrackerUrls.request, {
        body: JSON.stringify({ tracker }),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(globalThis.liveTrackerUrls.requestToken
            ? { requesttoken: globalThis.liveTrackerUrls.requestToken }
            : {}),
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `${response.statusText} (${response.status}): ${response.url}`,
            );
          }
        })
        .catch((error) => {
          this._source.map.fire(ErrorControl.createError(error.message));
        });
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
            this._updateTrackerInUi(feature as Feature<Point>),
          );
      },
    );
  }

  private _updateTrackerInUi(tracker: Feature<Point>) {
    if (this._sidebarList) {
      this._updateSidebarItem(tracker);
      return;
    }

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
      this._trackers.append(...row.childNodes);
      document
        .getElementById(`${prefix}-button`)
        ?.addEventListener("click", () =>
          this.requestPosition(tracker.properties?.name),
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
        state,
      )}: ${timeDiff(date)}`;
      return true;
    });
    if (!inProgress) {
      icon.src = SvgIconControl.createSvg(states[states.length - 1][1]);
    }
  }

  private _updateSidebarItem(tracker: Feature<Point>) {
    const name = String(tracker.properties?.name || "");
    let item = this._sidebarItems.get(name);
    if (!item) {
      item = document.createElement("li");
      item.className = "live-tracker-item";
      const entry = item.appendChild(document.createElement("div"));
      entry.className = "live-tracker-item__entry";
      const focus = entry.appendChild(document.createElement("button"));
      focus.type = "button";
      focus.className = "live-tracker-item__focus";
      focus.appendChild(document.createElement("span")).className =
        "live-tracker-item__name";
      focus.appendChild(document.createElement("span")).className =
        "live-tracker-item__meta";
      const request = entry.appendChild(document.createElement("button"));
      request.type = "button";
      request.className = "live-tracker-item__request";
      request.appendChild(document.createElement("img")).alt = "";
      request.addEventListener("click", () => this.requestPosition(name));
      item.appendChild(document.createElement("div")).className =
        "live-tracker-item__details";
      this._sidebarList?.appendChild(item);
      this._sidebarItems.set(name, item);
    }

    const focus = item.querySelector<HTMLButtonElement>(
      ".live-tracker-item__focus",
    )!;
    const request = item.querySelector<HTMLButtonElement>(
      ".live-tracker-item__request",
    )!;
    const meta = item.querySelector<HTMLElement>(".live-tracker-item__meta")!;
    const details = item.querySelector<HTMLElement>(
      ".live-tracker-item__details",
    )!;
    item.querySelector<HTMLElement>(".live-tracker-item__name")!.textContent =
      name;
    item.classList.toggle(
      "live-tracker-item--missing",
      !tracker.geometry.coordinates.length,
    );
    focus.title = `${getText("showOnMap")}: ${name}`;
    focus.onclick = () => {
      if (!tracker.geometry.coordinates.length) return;
      this._source.map.flyTo({
        center: tracker.geometry.coordinates as [number, number],
        zoom: Math.max(this._source.map.getZoom(), 12),
      });
      this._sidebarItems.forEach((entry) => entry.classList.remove("active"));
      item.classList.add("active");
      const shell = this._sidebar?.closest(".live-tracker-shell");
      shell?.classList.remove("sidebar-open");
      const navigation = shell?.querySelector<HTMLElement>("#app-navigation");
      if (navigation && window.matchMedia("(max-width: 1023px)").matches) {
        navigation.inert = true;
        navigation.setAttribute("aria-hidden", "true");
        const toggle = shell?.querySelector<HTMLElement>(
          "#live-tracker-sidebar-toggle",
        );
        toggle?.setAttribute("aria-expanded", "false");
        toggle?.setAttribute("aria-label", "Show trackers");
        if (toggle) toggle.title = "Show trackers";
      }
    };
    const metaParts = [];
    if (tracker.properties?.battery)
      metaParts.push(`${getText("battery")}: ${tracker.properties.battery}`);
    if (tracker.geometry.coordinates.length && tracker.properties?.received) {
      metaParts.push(timeDiff(new Date(tracker.properties.received).getTime()));
    }
    meta.textContent = metaParts.join(" · ");
    meta.hidden = !metaParts.length;

    const state = states.find(([key]) => tracker.properties?.[key]);
    request.title = `${getText("requestPosition")}: ${name}`;
    request.setAttribute("aria-label", request.title);
    request.querySelector("img")!.src = SvgIconControl.createSvg(
      state?.[1] || states[states.length - 1][1],
    );
    details.replaceChildren();
    if (tracker.properties?.nextPoi) {
      details.appendChild(document.createElement("span")).textContent =
        tracker.properties.nextPoi;
    }
    if (state) {
      const status = `${getText(state[0])}: ${timeDiff(new Date(tracker.properties?.[state[0]]).getTime())}`;
      details.appendChild(document.createElement("span")).textContent = status;
    }
    details.hidden = !details.childElementCount;
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
        })),
      )
      .map((cur, idx, arr) => {
        if (idx > 0)
          cur.distance =
            cur.lnglat.distanceTo(arr[idx - 1].lnglat) + arr[idx - 1].distance;
        return cur;
      });

    if (!routePoints.length) return;

    // filter and merge POI and tracker list
    routes
      .filter(filterPoi)
      .concat(trackers.filter(filterPoint))

      // add LngLat to POIs and trackers
      .map((point) => {
        if (!point.properties) point.properties = {};
        point.properties._lngLat = new LngLat(
          point.geometry.coordinates[0],
          point.geometry.coordinates[1],
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
          a.properties?._closestRouteIdx - b.properties?._closestRouteIdx,
      );

    // loop through trackers and measure distance to next POI
    trackers.filter(filterPoint).forEach((point) => {
      const nextPoi = sortedPois.find(
        (route) =>
          route.properties?._closestRouteIdx >=
          point.properties?._closestRouteIdx,
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
    routePoints: { lnglat: LngLat }[],
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
            "line-dasharray": ["literal", [1, 1]],
            "line-opacity": 0.5,
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
            nextPoi.properties?._closestRouteIdx + 1,
          )
          .map((point) => point.lnglat.toArray()),
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
        (feature) => feature.properties?.[debugProperty] === true,
      );
      if (idx >= 0) collection[idx] = point;
      else collection.push(point);
      this._source.setData({ type: "FeatureCollection", features: collection });
    });
  }
}
