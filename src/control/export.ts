import { mdiFileDownloadOutline } from "@mdi/js";
import { Feature, FeatureCollection, GeoJSON } from "geojson";
import { GeoJSONSource, Map } from "maplibre-gl";
import { toFeatures, toGPX } from "../formats";
import { SourcedSvgIconControl } from "./base";

export default class GpxExportControl extends SourcedSvgIconControl {
  constructor(source: GeoJSONSource) {
    super(mdiFileDownloadOutline, source);
  }

  onAdd(map: Map): HTMLElement {
    this._button.addEventListener("click", this._showExportOptions.bind(this));
    return this._container;
  }

  private _showExportOptions() {
    // Create modal
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      width: 300px;
    `;

    modalContent.innerHTML = `
      <h3>Export Options</h3>
      <div style="margin-bottom: 10px;">
        <label>
          <input type="radio" name="exportType" value="full">
          All data
          <br/>
          All routes, waypoints and additional routes
        </label>
        </div>
      <div style="margin-bottom: 10px;">
        <label>
          <input type="radio" name="exportType" value="stripped">
          For trackers
          <br/>
          Stripped and obfuscated data for participants
        </label>
      </div>
      <button id="confirmExport">Export</button>
      <button id="cancelExport" style="margin-left: 10px;">Cancel</button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Handle export button click
    const confirmButton = modal.querySelector("#confirmExport")!;
    confirmButton.addEventListener("click", () => {
      const exportType = (
        document.querySelector(
          'input[name="exportType"]:checked'
        ) as HTMLInputElement
      ).value;

      this._export(exportType === "full");
      document.body.removeChild(modal);
    });

    // Handle cancel button click
    const cancelButton = modal.querySelector("#cancelExport")!;
    cancelButton.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
  }

  private _export(full: boolean) {
    this._source.getData().then((data) => {
      if (!full) {
        data = toFeatures(data)
          .filter((feature) =>
            ["LineString", "MultiLineString"].includes(feature.geometry.type)
          )
          .reduce(
            (sum, feature, idx) => {
              feature.properties = { name: `Route ${idx + 1}` };
              sum.features.push(feature);
              return sum;
            },
            {
              type: "FeatureCollection",
              features: [] as Feature[],
              properties: {},
            }
          );
      }

      const gpx = toGPX(data, full ? "trk" : "rte");
      const xml = new XMLSerializer().serializeToString(gpx);
      const download = document.createElement("a");

      download.setAttribute(
        "href",
        URL.createObjectURL(new Blob([xml], { type: "application/gpx+xml" }))
      );
      download.setAttribute("download", "routes.xml");
      download.click();
    });
  }
}
