import { mdiFileUploadOutline } from "@mdi/js";
import { Feature } from "geojson";
import { GeoJSONSource, Map } from "maplibre-gl";
import { toFeatures, toGeoJSON } from "../formats";
import { SourcedSvgIconControl } from "./base";
import ErrorControl from "./error";

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
    upload.setAttribute("accept", ".gpx,application/gpx+xml");
    upload.setAttribute("multiple", "multiple");
    upload.setAttribute("type", "file");
    upload.addEventListener("change", (e: Event) => {
      if (!(e.target instanceof HTMLInputElement) || !e.target.files?.length)
        return;
      this._import(e.target.files);
    });
    upload.click();
  }

  private _import(files: FileList) {
    Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise(
            (resolve: (value: Feature[] | undefined) => void, reject) => {
              const rdr = new FileReader();
              rdr.onload = (ev) => resolve(this._convert(ev));
              rdr.onerror = reject;
              rdr.readAsText(file);
            }
          )
      )
    ).then((results) =>
      this._source.setData({
        features: results.filter((_) => _ !== undefined).flat(),
        type: "FeatureCollection",
      })
    );
  }

  private _convert(event: ProgressEvent<FileReader>) {
    if (event.target?.readyState !== FileReader.DONE) return;
    const gpx = new DOMParser().parseFromString(
      event.target.result,
      "application/xml"
    );

    // parsing error
    const error = gpx.querySelector("parsererror");
    if (error) {
      this._source.map?.fire(
        "error",
        ErrorControl.createError(error.textContent)
      );
      return;
    }

    return toFeatures(toGeoJSON(gpx));
  }
}
