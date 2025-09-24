import { mdiLayers } from "@mdi/js";
import { Map } from "maplibre-gl/dist/maplibre-gl";
import { SvgIconControl } from "./base";

export class StyleSwitcherControl extends SvgIconControl {
  private _styles: string[];
  private _keepSources: string[];
  private _last = 0;

  constructor(styles: string[], keepSources: string[] = []) {
    super(mdiLayers);
    this._styles = styles;
    this._keepSources = keepSources;
  }

  onAdd(map: Map) {
    this._button.addEventListener("click", () => {
      if (++this._last >= this._styles.length) this._last = 0;

      // set style and copy data
      map.setStyle(this._styles[this._last], {
        transformStyle: (prev, next) => {
          this._keepSources.forEach((key) => {
            if (!prev?.sources[key]) return;
            next.sources[key] = prev?.sources[key];
            prev.layers
              .filter((_) => _.type !== "background" && _.source === key)
              .forEach((_) => next.layers.push(_));
          });
          return next;
        },
      });
    });

    return this._container;
  }
}
