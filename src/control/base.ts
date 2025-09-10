import { GeoJSONSource, IControl, Map } from "maplibre-gl";
import { iconColor, iconTransform, iconViewBox } from "../const";

const svgNamespace = "http://www.w3.org/2000/svg";

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
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this._button.type = "button";

    const icon = this._button.appendChild(document.createElement("span"));
    icon.className = "maplibregl-ctrl-icon";
    icon.style.transform = iconTransform;
    icon.style.backgroundImage =
      'url("' + SvgIconControl.createSvg(svgIconPath) + '")';
  }

  abstract onAdd(map: Map): HTMLElement;

  onRemove() {
    this._container.parentNode?.removeChild(this._container);
  }

  static createSvg(svgIconPath: string) {
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("xmlns", svgNamespace);
    svg.setAttribute("fill", iconColor);
    svg.setAttribute("viewBox", iconViewBox);
    svg
      .appendChild(document.createElementNS(svgNamespace, "path"))
      .setAttribute("d", svgIconPath);

    return "data:image/svg+xml," + encodeURIComponent(svg.outerHTML);
  }
}
