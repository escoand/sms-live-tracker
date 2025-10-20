import { mdiDownload } from "@mdi/js";
import { Feature, LineString, MultiLineString } from "geojson";
import { GeoJSONSource, Map } from "maplibre-gl";
import { toFeatures, toGPX } from "../formats";
import { SourcedSvgIconControl } from "./base";

import "@watergis/maplibre-gl-export/dist/maplibre-gl-export.css";

export default class GpxExportControl extends SourcedSvgIconControl {
  constructor(source: GeoJSONSource) {
    super(mdiDownload, source);
  }

  onAdd(map: Map): HTMLElement {
    this._button.addEventListener("click", this._showExportModal.bind(this));
    return this._container;
  }

  private _showExportModal() {
    const modal = document.createElement("div");
    modal.style.cssText = `
      align-items: center;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      height: 100%;
      justify-content: center;
      left: 0;
      position: fixed;
      top: 0;
      width: 100%;
      z-index: 1000;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background-color: white;
      border-radius: 5px;
      padding: 20px;
      width: 300px;
    `;

    modalContent.innerHTML = `
      <h3>Export</h3>
      <div style="margin-bottom: 10px;">
        <label>
          <input type="radio" name="exportType" value="full">
          GPX - <i>all routes and waypoints</i>
        </label>
        </div>
      <div style="margin-bottom: 10px;">
        <label>
          <input type="radio" name="exportType" value="stripped">
          GPX - <i>for team GPS devices</i>
        </label>
      </div>
      <div style="margin-bottom: 10px;">
        <label>
          <input type="radio" name="exportType" value="geojson">
          GeoJSON - <i>technical data format</i>
        </label>
      </div>
      <div style="margin-top: 10px; text-align: right;">
        <button id="confirmExport">Export</button>
        <button id="cancelExport">Cancel</button>
      </div>
    `;

    modal.appendChild(modalContent);
    this._source.map.getContainer().appendChild(modal);

    // export button click
    modal.querySelector("#confirmExport")?.addEventListener("click", () => {
      const exportType = (
        document.querySelector(
          'input[name="exportType"]:checked'
        ) as HTMLInputElement
      ).value;
      this._export(exportType);
      modal.parentNode?.removeChild(modal);
    });

    // cancel button click
    modal.querySelector("#cancelExport")?.addEventListener("click", () => {
      modal.parentNode?.removeChild(modal);
    });
  }

  private _export(type: string) {
    this._source.getData().then((data) => {
      // geojson output
      if (type === "geojson") {
        return this._download(
          JSON.stringify(data),
          "application/geo+json",
          "routes.geojson"
        );
      }

      // strip down data
      else if (type !== "full") {
        data = toFeatures(data)
          .filter((feature): feature is Feature<LineString | MultiLineString> =>
            ["LineString", "MultiLineString"].includes(feature.geometry.type)
          )
          .reduce(
            (sum, feature, idx) => {
              feature.geometry.coordinates =
                feature.geometry.type === "MultiLineString"
                  ? feature.geometry.coordinates.map((_) =>
                      _.map((_) => _.slice(0, 2))
                    )
                  : feature.geometry.coordinates.map((_) => _.slice(0, 2));
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

      const gpx = toGPX(data, type === "full" ? "trk" : "rte");
      const xml = new XMLSerializer().serializeToString(gpx);
      this._download(xml, "application/gpx+xml", "routes.gpx");
    });
  }

  private _download(content: string, mime: string, name: string) {
    const download = document.createElement("a");
    download.setAttribute("download", name);
    download.setAttribute(
      "href",
      URL.createObjectURL(new Blob([content], { type: mime }))
    );
    download.click();
  }
}
