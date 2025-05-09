import { mdiAccountGroup } from "@mdi/js";
import { Feature, FeatureCollection, Point } from "geojson";
import { GeoJSONSource, Map, MapSourceDataEvent } from "maplibre-gl";
import { createError } from "./common";
import { iconColor } from "./const";
import { SvgIconControl } from "./control";

const texts = {
  confirm: {
    de: "Dadurch wird eine SMS an den Tracker und eine SMS zurück gesendet. Bist du sicher?",
    _: "This will send a SMS to the tracker and a SMS back. Are you sure?",
  },
};

function getText(id: string): string {
  if (!(id in texts)) return id;
  const lang = navigator.languages.find((_) => _ in texts[id]) || "_";
  return texts[id][lang] || id;
}

function timeDiff(now: number, then: number): string {
  const diff = now - then;
  const days = Math.floor(diff / 1000 / 24 / 60 / 60);
  const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  let result = "";
  if (days) result += days + "d ";
  if (days || hours) result += hours + "h ";
  return result + mins + "min";
}

export class TrackersControl extends SvgIconControl {
  private _table: HTMLTableElement;
  private _trackers: HTMLTableSectionElement;

  constructor(source: GeoJSONSource) {
    super(mdiAccountGroup, source);

    this._table = this._container.appendChild(document.createElement("table"));
    this._trackers = this._table.appendChild(document.createElement("tbody"));

    this._source.on("data", this._onSourceUpdated.bind(this));
  }

  onAdd(map: Map) {
    const head = this._table
      .insertBefore(document.createElement("thead"), this._trackers)
      .appendChild(document.createElement("tr"));

    this._table.style.display = "none";
    this._trackers.style.textAlign = "right";

    head.appendChild(document.createElement("th"));
    head.appendChild(document.createElement("th")).innerHTML = "&#128267;";
    head.appendChild(document.createElement("th")).innerHTML = "&#128228;";
    head.appendChild(document.createElement("th")).innerHTML = "&#128229;";
    const close = head.appendChild(document.createElement("th"));
    close.innerHTML = "&#x274C;&#xFE0E;";
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

  requestPosition(number: string) {
    if (confirm(getText("confirm")))
      fetch("/request", { body: number, method: "POST" }).then(
        (response) =>
          !response.ok &&
          this._source.map.fire(
            createError(
              `${response.statusText} (${response.status}): ${response.url}`
            )
          )
      );
  }

  private _onSourceUpdated(evt: MapSourceDataEvent) {
    if (evt.sourceDataType != "content") return;
    this._updateTrackers();
  }

  private _updateTrackers() {
    const now = Date.now();
    this._source.getData().then((positions: FeatureCollection) => {
      positions.features
        .filter((feature) => feature.geometry.type == "Point")
        .forEach((pos: Feature<Point>) => {
          const prefix = "data-" + pos.properties?.name;

          // create tracker entry
          if (!document.getElementById(prefix)) {
            const row = document.createElement("tr");
            row.setAttribute("id", prefix);
            row
              .appendChild(document.createElement("td"))
              .append(pos.properties?.name);
            row
              .appendChild(document.createElement("td"))
              .setAttribute("id", prefix + "-battery");
            row
              .appendChild(document.createElement("td"))
              .setAttribute("id", prefix + "-requested");
            row
              .appendChild(document.createElement("td"))
              .setAttribute("id", prefix + "-received");
            const btn = row
              .appendChild(document.createElement("td"))
              .appendChild(document.createElement("button"));
            btn.innerHTML = "&#128260;";
            btn.addEventListener("click", () =>
              this.requestPosition(pos.properties?.number)
            );
            this._trackers.appendChild(row);
          }

          // update tracker entry
          const requested = new Date(pos.properties?.requested).getTime();
          const received = new Date(pos.properties?.received).getTime();
          document.getElementById(prefix).style.color = !pos.geometry
            .coordinates.length
            ? "orangered"
            : "";
          document.getElementById(prefix + "-battery").innerHTML = pos
            .properties?.battery
            ? pos.properties?.battery
            : "";
          document.getElementById(prefix + "-requested").innerHTML = requested
            ? timeDiff(now, requested)
            : "";
          document.getElementById(prefix + "-received").innerHTML = received
            ? timeDiff(now, received)
            : "";
        });
    });
  }
}
