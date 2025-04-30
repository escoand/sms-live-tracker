import { GeoJSONSource, IControl, Map } from "maplibre-gl";
import { iconColor, iconViewBox } from "./const";

export abstract class SvgIconControl implements IControl {
  protected _source: GeoJSONSource;
  protected _container: HTMLElement;
  protected _button: HTMLButtonElement;

  constructor(svgIconPath: string, source: GeoJSONSource) {
    this._source = source;
    this._container = document.createElement("div");
    this._button = this._container.appendChild(
      document.createElement("button")
    );
    const icon = this._button.appendChild(document.createElement("span"));

    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this._button.type = "button";
    icon.className = "maplibregl-ctrl-icon";
    icon.style.backgroundImage =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='" +
      encodeURIComponent(iconColor) +
      "' viewBox='" +
      encodeURIComponent(iconViewBox) +
      "'%3E%3Cpath d='" +
      svgIconPath +
      "'%3E%3C/path%3E%3C/svg%3E\")";
    icon.style.transform = "scale(0.6)";
  }

  abstract onAdd(map: Map);

  onRemove() {
    this._container.parentNode.removeChild(this._container);
  }
}
