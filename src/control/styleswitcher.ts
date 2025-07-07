import { mdiLayers } from "@mdi/js";
import { LineLayerSpecification, Map } from "maplibre-gl/dist/maplibre-gl";
import { SvgIconControl } from "./base";

export class StyleSwitcherControl extends SvgIconControl {
  private _styles = [];
  private _keepSources = [];
  private _last = 0;

  constructor(styles: string[], keepSources: string[] = []) {
    super(mdiLayers, undefined);
    this._styles = styles;
    this._keepSources = keepSources;
  }

  onAdd(map: Map) {
    this._button.addEventListener("click", () => {
      if (++this._last >= this._styles.length) this._last = 0;

      // set style and copy data
      map.setStyle(this._styles[this._last], {
        transformStyle: (prev, next) => {
          this._keepSources.forEach((_) => {
            next.sources[_] = prev.sources[_];
          });
          prev.layers
            .filter((_: LineLayerSpecification) =>
              this._keepSources.includes(_.source)
            )
            .forEach((_) => next.layers.push(_));
          return next;
        },
      });
    });

    return this._container;
  }
}
