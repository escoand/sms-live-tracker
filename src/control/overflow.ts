import { mdiDotsVertical } from "@mdi/js";
import { IControl, Map } from "maplibre-gl";
import { SvgIconControl } from "./base";

export class OverflowMenuControl extends SvgIconControl {
  private _map: Map | undefined;
  private _controls: { control: IControl; initialized: boolean }[] = [];
  private _menu: HTMLElement;

  constructor() {
    super(mdiDotsVertical);
    this._menu = document.createElement("div");
    this._menu.className = "overflow-menu";
    this._menu.style.display = "none";
    this._button.onclick = () => this._toggleMenu();
  }

  onAdd(map: Map): HTMLElement {
    this._map = map;
    const wrapper = document.createElement("div");
    wrapper.appendChild(this._container);
    wrapper.appendChild(this._menu);
    this._controls
      .filter(({ initialized }) => initialized === false)
      .forEach((entry) => {
        // @ts-expect-error
        this._menu.appendChild(entry.control.onAdd(this._map));
        entry.initialized = true;
      });
    return wrapper;
  }

  onRemove(map: Map) {
    this._controls.forEach(({ control }) => control.onRemove(map));
    super.onRemove(map);
  }

  private _toggleMenu() {
    this._menu.style.display =
      this._menu.style.display === "block" ? "none" : "block";
  }

  addControl(control: IControl) {
    this._controls.push({ control, initialized: this._map != undefined });
    if (this._map) {
      this._menu.appendChild(control.onAdd(this._map));
    }
  }
}
