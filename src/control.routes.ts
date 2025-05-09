import { mdiGoKartTrack } from "@mdi/js";
import { FeatureCollection } from "geojson";
import { GeoJSONSource, Map, MapSourceDataEvent } from "maplibre-gl";
import { SvgIconControl } from "./control";

export class RoutesControl extends SvgIconControl {
  private _routes: HTMLUListElement;

  constructor(source: GeoJSONSource) {
    super(mdiGoKartTrack, source);

    this._routes = this._container.appendChild(document.createElement("ul"));

    this._source.on("data", this._onSourceUpdated.bind(this));
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
    this._source.off("data", this._onSourceUpdated.bind(this));
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

  private _updateRoutes() {
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
          checkbox.checked = !feature.properties.hidden;
          entry.append(feature.properties.name);
          checkbox.style.accentColor = feature.properties.color;
          checkbox.addEventListener("change", () => {
            feature.properties.hidden = !checkbox.checked;
            this._source.setData(data);
          });
        })
    );
  }

  private _onSourceUpdated(evt: MapSourceDataEvent) {
    if (evt.sourceDataType != "content") return;
    this._updateRoutes();
  }
}
