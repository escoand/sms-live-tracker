import { mdiPrinter } from "@mdi/js";
import {
  DPI,
  Format,
  MaplibreExportControl,
  PageOrientation,
  Size,
} from "@watergis/maplibre-gl-export";
import { Map } from "maplibre-gl/dist/maplibre-gl";
import { routeTexts } from "../const";
import { SvgIconControl } from "./base";

export class ExportControl extends MaplibreExportControl {
  private _map: Map;

  constructor() {
    super({
      DPI: DPI[400],
      Format: Format.PDF,
      // @ts-expect-error
      Local: navigator.languages[0],
      PageOrientation: PageOrientation.Landscape,
      PageSize: Size.A2,
      PrintableArea: true,
    });
  }

  onAdd(map: Map): HTMLElement {
    this._map = map;
    // @ts-expect-error
    this.togglePrintableArea = this._togglePrintableArea;

    const result = super.onAdd(map);
    this.exportButton.style.backgroundImage =
      SvgIconControl.createSvg(mdiPrinter);
    this.exportContainer.style.margin = "5px";
    return result;
  }

  private _togglePrintableArea(state) {
    this._map.setLayoutProperty(
      routeTexts,
      "text-overlap",
      state ? "always" : "never"
    );
    // @ts-expect-error
    super.togglePrintableArea(state);
  }
}
