import { mdiGoKartTrack } from "@mdi/js";
import { FeatureCollection } from "geojson";
import { GeoJSONSource, Map, MapSourceDataEvent } from "maplibre-gl";
import { SvgIconControl } from "./base";

export class RoutesControl extends SvgIconControl {
  private _routes: HTMLUListElement;
  private _hidden: string[] = [];

  constructor(source: GeoJSONSource) {
    super(mdiGoKartTrack, source);

    this._routes = this._container.appendChild(document.createElement("ul"));

    this._source.on("data", this._updateRoutes.bind(this));
  }

  onAdd(map: Map) {
    this._routes.style.clear = "both";
    this._routes.style.display = "none";
    this._routes.style.listStyle = "none";
    this._routes.style.padding = "0";
    this._routes.style.margin = "5px";

    this._button.addEventListener("click", () => this.toggle());

    return this._container;
  }

  onRemove() {
    this._source.off("data", this._updateRoutes.bind(this));
    super.onRemove();
  }

  toggle(forceClose = false) {
    if (this._routes.style.display != "none" || forceClose) {
      this._routes.style.display = "none";
    } else {
      this._routes.style.display = "block";
      if (this._routes.childNodes.length == 0) this._updateRoutes();
    }
  }

  private _updateRoutes(evt?: MapSourceDataEvent) {
    if (evt && evt.sourceDataType != "content") return;

    this._routes.innerHTML = "";
    this._source.getData().then((data: FeatureCollection) =>
      data.features
        .filter((feature) =>
          ["LineString", "MultiLineString"].includes(feature.geometry.type)
        )
        .forEach((feature) => {
          const entry = this._routes
            .appendChild(document.createElement("li"))
            .appendChild(document.createElement("label"));
          const checkbox = entry.appendChild(document.createElement("input"));
          checkbox.type = "checkbox";
          checkbox.checked = !this._hidden.includes(feature.properties.name);
          entry.append(feature.properties.name);
          checkbox.style.accentColor = feature.properties.color;
          checkbox.addEventListener("change", this._toggleRoute.bind(this));
        })
    );
  }

  private _toggleRoute = (evt: Event) => {
    const checkbox = evt.target as HTMLInputElement;
    const label = checkbox.labels[0]?.textContent;

    if (!checkbox.checked) {
      this._hidden.push(label);
    } else {
      for (let i = this._hidden.length; i >= 0; i--) {
        if (this._hidden[i] === label) {
          this._hidden.splice(i, 1);
        }
      }
    }
    this._source.map.setGlobalStateProperty("hidden", [...this._hidden]);
  };
}
