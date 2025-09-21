import { mdiCellphoneArrowDownVariant } from "@mdi/js";
import { Feature, LineString } from "geojson";
import { GeoJSONSource, Map } from "maplibre-gl";
import { getFeatures } from "../const";
import { SvgIconControl } from "./base";

const gpxNs = "http://www.topografix.com/GPX/1/1";
const gpxType = "rte";

export default class GpxExportControl extends SvgIconControl {
  constructor(source: GeoJSONSource) {
    super(mdiCellphoneArrowDownVariant, source);
  }

  onAdd(map: Map): HTMLElement {
    this._button.addEventListener("click", this._export.bind(this));
    return this._container;
  }

  private _export() {
    const gpxDoc = document.implementation.createDocument(gpxNs, "gpx", null);
    const gpx = gpxDoc.documentElement.appendChild(
      gpxDoc.createElementNS(gpxNs, gpxType)
    );
    this._source.getData().then((data) => {
      getFeatures(data)
        .filter(
          (feature): feature is Feature<LineString> =>
            feature.geometry.type === "LineString"
        )
        .map((feature) => {
          const segment = gpx.appendChild(
            gpxDoc.createElementNS(gpxNs, gpxType + "seg")
          );
          segment
            .appendChild(gpxDoc.createElementNS(gpxNs, "name"))
            .append(feature.properties?.name);
          feature.geometry.coordinates.forEach((coord) => {
            const point = segment.appendChild(
              gpxDoc.createElementNS(gpxNs, gpxType + "pt")
            );
            point.setAttribute("lat", coord[1].toString());
            point.setAttribute("lon", coord[0].toString());
          });
        });

      // download
      const xml = new XMLSerializer().serializeToString(gpxDoc);
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
