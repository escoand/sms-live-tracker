import { ErrorEvent, IControl } from "maplibre-gl";

const timeout_ms = 15 * 1000;
const animation_ms = 0.5 * 1000;

export default class ErrorControl implements IControl {
  private _container: HTMLElement;

  constructor(evt: ErrorEvent) {
    this._container = document.createElement("code");
    this._container.innerHTML =
      new Date().toLocaleTimeString() + " " + evt.error.message;
  }

  onAdd() {
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this._container.style.backgroundColor = "orangered";
    this._container.style.color = "white";
    this._container.style.marginRight = "50px";
    this._container.style.maxHeight = "45px";
    this._container.style.overflow = "hidden";
    this._container.style.padding = "0px 5px";
    setTimeout(this.onRemove.bind(this), timeout_ms);
    return this._container;
  }

  onRemove() {
    this._container.style.marginBottom = "0px";
    this._container.style.maxHeight = "0px";
    this._container.style.opacity = "0";
    this._container.style.transition =
      "max-height " +
      animation_ms +
      "ms, margin-bottom " +
      animation_ms +
      "ms, opacity " +
      animation_ms +
      "ms";
    setTimeout(
      () => this._container.parentNode?.removeChild(this._container),
      animation_ms
    );
  }

  static createError(msg: string) {
    return { error: new Error(msg), type: "error" };
  }
}
