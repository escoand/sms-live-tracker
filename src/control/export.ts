import { mdiDownload } from "@mdi/js";
import { FeatureCollection, Geometry } from "geojson";
import { GeoJSONSource, LngLat, Map } from "maplibre-gl";
import { filterPoi, filterPoiRoutes as filterPoiRoute } from "../const";
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
        const realData = toFeatures(data);
        const routePoints = realData
          .filter(filterPoiRoute)
          .flatMap(({ geometry: { type, coordinates } }) =>
            (type === "MultiLineString" ? coordinates.flat() : coordinates).map(
              (cur) => new LngLat(cur[0], cur[1])
            )
          );

        data = realData
          .filter(filterPoi)
          .map(
            ({ geometry: { coordinates } }) =>
              new LngLat(coordinates[0], coordinates[1])
          )
          // find closest route point for each POI
          .map((point) => {
            let _closestRouteIdx = -1;
            let _closestRouteDist = Number.POSITIVE_INFINITY;
            routePoints.forEach((lnglat, idx) => {
              const dist = point.distanceTo(lnglat);
              if (dist < _closestRouteDist) {
                _closestRouteIdx = idx;
                _closestRouteDist = dist;
              }
            });
            return _closestRouteIdx;
          })
          // convert to geojson
          .reduce(
            (sum, cur, idx, arr) => {
              const geometry: Geometry = {
                coordinates: routePoints
                  .slice(idx > 0 ? arr[idx - 1] : 0, cur)
                  .map((_) => _.toArray()),
                type: "LineString",
              };
              sum.features.splice(idx, 0, {
                geometry,
                properties: { name: `Route ${idx + 1}` },
                type: "Feature",
              });
              sum.features.push({
                geometry,
                properties: { name: `Route ${arr.length + idx + 1}` },
                type: "Feature",
              });
              return sum;
            },
            {
              features: [],
              type: "FeatureCollection",
            } as FeatureCollection
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
