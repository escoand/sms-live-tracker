import { mdiFileDownloadOutline } from "@mdi/js";
import { Position } from "geojson";
import { GeoJSONSource, Map } from "maplibre-gl";
import { toFeatures } from "../formats";
import { SourcedSvgIconControl } from "./base";

const gpxNs = "http://www.topografix.com/GPX/1/1";

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
    let idx = 0;
    const gpx = document.implementation.createDocument(gpxNs, "gpx", null);

    this._source.getData().then((data) => {
      toFeatures(data).map((feature) => {
        // convert LineString to MultiLineString
        if (full && feature.geometry.type === "LineString") {
          feature.geometry = {
            bbox: feature.geometry.bbox,
            coordinates: [feature.geometry.coordinates],
            type: "MultiLineString",
          };
        }

        // waypoints
        if (full && feature.geometry.type === "Point") {
          const wpt = gpx.documentElement.appendChild(
            document.createElementNS(gpxNs, "wpt")
          );
          wpt.setAttribute("lat", feature.geometry.coordinates[1].toString());
          wpt.setAttribute("lon", feature.geometry.coordinates[0].toString());
          if (feature.properties?.name) {
            wpt
              .appendChild(document.createElementNS(gpxNs, "name"))
              .append(feature.properties.name);
          }
        }

        // full routes
        else if (full && feature.geometry.type === "MultiLineString") {
          const track = gpx.documentElement.appendChild(
            document.createElementNS(gpxNs, "trk")
          );
          feature.geometry.coordinates.forEach((coords) => {
            const segment = track.appendChild(
              document.createElementNS(gpxNs, "trkseg")
            );
            segment
              .appendChild(document.createElementNS(gpxNs, "name"))
              .append(feature.properties?.name);
            this._addCoords(segment, coords);
          });
        }

        // stripped routes
        else if (feature.geometry.type === "MultiLineString") {
          const segment = gpx.documentElement.appendChild(
            document.createElementNS(gpxNs, "rte")
          );
          segment
            .appendChild(document.createElementNS(gpxNs, "name"))
            .append(`Route ${++idx}`);
          feature.geometry.coordinates.forEach((coords) =>
            this._addCoords(segment, coords)
          );
        }
      });

      // download
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

  private _addCoords(segment: Element, coords: Position[]) {
    coords.forEach((coord) => {
      const point = segment.appendChild(
        document.createElementNS(gpxNs, segment.nodeName + "pt")
      );
      point.setAttribute("lat", coord[1].toString());
      point.setAttribute("lon", coord[0].toString());
    });
  }
}
