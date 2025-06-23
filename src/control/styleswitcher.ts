import { mdiLayers } from "@mdi/js";
import { Map } from "maplibre-gl/dist/maplibre-gl";
import { positionsSource, routesSource } from "../const";
import { SvgIconControl } from "./base";

export class StyleSwitcherControl extends SvgIconControl {
  private _styles = [];
  private _last = 0;

  constructor(styles: string[]) {
    super(mdiLayers, undefined);
    this._styles = styles;
  }

  onAdd(map: Map) {
    this._button.addEventListener("click", () => {
      if (++this._last >= this._styles.length) this._last = 0;

      // set style and copy data
      map.setStyle(this._styles[this._last], {
        transformStyle: (prev, next) => {
          next.sources[routesSource] = prev.sources[routesSource];
          next.sources[positionsSource] = prev.sources[positionsSource];
          prev.layers
            .filter((_) => [routesSource, positionsSource].includes(_.source))
            .forEach((_) => next.layers.push(_));
          return next;
        },
      });
    });

    return this._container;
  }
}
