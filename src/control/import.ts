import { mdiFileUploadOutline } from "@mdi/js";
import { Feature, MultiLineString, MultiPoint, Position } from "geojson";
import { GeoJSONSource, Map } from "maplibre-gl";
import { SourcedSvgIconControl } from "./base";
import { createError } from "./error";
import { toGeoJSON } from "../formats";

const gpxNs = "http://www.topografix.com/GPX/1/1";

export default class GpxImportControl extends SourcedSvgIconControl {
  constructor(source: GeoJSONSource) {
    super(mdiFileUploadOutline, source);
  }

  onAdd(map: Map): HTMLElement {
    this._button.addEventListener("click", this._showImportDialog.bind(this));
    return this._container;
  }

  private _showImportDialog() {
    // upload
    const upload = document.createElement("input");
    upload.setAttribute("type", "file");
    upload.addEventListener("change", (e: Event) => {
      if (!(e.target instanceof HTMLInputElement) || !e.target.files?.length)
        return;
      const rdr = new FileReader();
      rdr.addEventListener("load", this._import.bind(this));
      rdr.readAsText(e.target.files[0]);
    });
    upload.click();
  }

  private _import(event: ProgressEvent<FileReader>) {
    if (event.target?.readyState !== FileReader.DONE) return;
    const gpx = new DOMParser().parseFromString(
      event.target.result,
      "application/xml"
    );

    // parsing error
    const error = gpx.querySelector("parsererror");
    if (error) {
      this._source.map?.fire("error", createError(error.textContent));
      return;
    }

    const json = toGeoJSON(gpx);

    this._source.setData(json);
  }
}
