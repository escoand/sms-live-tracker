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

const moreSizes = {
  A0: [1189, 841],
  A1: [841, 594],
};

export class ExportControl extends MaplibreExportControl {
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
    // @ts-expect-error
    this.togglePrintableArea = this._togglePrintableArea;
    // @ts-expect-error
    this.updatePrintableArea = this._updatePrintableArea;

    const result = super.onAdd(map);
    this.exportButton.style.backgroundImage =
      SvgIconControl.createSvg(mdiPrinter);
    this.exportContainer.style.margin = "5px";

    const list = result.querySelector("#mapbox-gl-export-page-size");
    Object.entries(moreSizes).forEach(([name, bounds]) => {
      const opt = list.appendChild(document.createElement("option"));
      opt.setAttribute("name", "page-size");
      opt.text = name;
      opt.value = JSON.stringify(bounds);
    });
    Array.from(list.childNodes)
      .sort((a, b) => a.textContent.localeCompare(b.textContent))
      .forEach((child) => list.appendChild(child));

    return result;
  }

  private _togglePrintableArea(state) {
    this.map.setLayoutProperty(
      routeTexts,
      "text-overlap",
      state ? "always" : "never"
    );

    if (!state) {
      this.map.getContainer().style.zoom = null;
      this.map.getContainer().lastChild.style.zoom = null;
    }

    // @ts-expect-error
    super.togglePrintableArea(state);
  }

  private _updatePrintableArea() {
    const size = document.getElementById(
      "mapbox-gl-export-page-size"
    ) as HTMLSelectElement;
    const orientation = document.getElementById(
      "mapbox-gl-export-page-orientation"
    ) as HTMLSelectElement;
    const currentZoom = this.map.getContainer().style.zoom || 1;

    let bounds =
      orientation.value == PageOrientation.Landscape
        ? JSON.parse(size.value)
        : JSON.parse(size.value).reverse();
    const width = (bounds[0] * 96) / 25.4;
    const height = (bounds[1] * 96) / 25.4;
    const clientWidth = this.map?.getCanvas().clientWidth * currentZoom;
    const clientHeight = this.map?.getCanvas().clientHeight * currentZoom;
    const zoom = Math.min(clientWidth / width, clientHeight / height);

    if (zoom < 1) {
      this.map.getContainer().style.zoom = zoom;
      this.map.getContainer().lastChild.style.zoom = 1 / zoom;
    }

    // @ts-expect-error
    super.updatePrintableArea();
  }
}
