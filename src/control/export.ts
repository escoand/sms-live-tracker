import { mdiDownload } from "@mdi/js";
import { FeatureCollection, GeoJSON, Geometry } from "geojson";
import { GeoJSONSource, LngLat, Map } from "maplibre-gl";
import simplify from "simplify-js";
import { filterPoi, filterPoiRoutes as filterPoiRoute } from "../const";
import { toFeatures, toGPX } from "../formats";
import { SourcedSvgIconControl } from "./base";

import "@watergis/maplibre-gl-export/dist/maplibre-gl-export.css";

const SOURCE_NAME = "simplified";
const SIMPLIFICATION_BASE = 0.00004;
const SIMPLIFICATION_FACTOR = 2;
const SIMPLIFICATION_STEPS = 10;
const ROUTE_COUNT = 10;

export default class GpxExportControl extends SourcedSvgIconControl {
  private _simplifyOptions = {
    factor: 0,
  };

  constructor(source: GeoJSONSource) {
    super(mdiDownload, source);
  }

  onAdd(map: Map): HTMLElement {
    this._button.addEventListener("click", this._showModal.bind(this));
    return this._container;
  }

  onRemove(map: Map): void {
    this._clean(map);
    super.onRemove(map);
  }

  private _showModal() {
    const modal = document.createElement("div");
    modal.style.cssText = `
      background-color: white;
      border-radius: 0 0 5px 5px;
      left: calc(50% - 150px);
      padding: 20px;
      position: absolute;
      top: 0px;
      width: 300px;
    `;

    modal.innerHTML = `
      <h3>Export</h3>
      <div style="margin-bottom: 10px;">
        <label>
          <input type="radio" name="exportType" value="full" checked>
          GPX - <i>all routes and waypoints</i>
        </label>
      </div>
      <hr/>
      <div style="margin-bottom: 10px;">
        <label>
          <input type="radio" name="exportType" value="stripped">
          GPX - <i>for team GPS devices</i>
        <div style="margin-left: 25px">
          <label>
            Simplification
            <input id="simplification" type="range" min="1" max="${SIMPLIFICATION_STEPS}" value="${(
      SIMPLIFICATION_STEPS / 2
    ).toFixed()}" style="vertical-align: top" />
          </label>
        </div>
        </label>
      </div>
      <hr/>
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

    this._source.map.getContainer().appendChild(modal);

    // simplification
    const radio = modal.querySelector(
      'input[type="radio"][value="stripped"]'
    ) as HTMLInputElement;
    const slider = modal.querySelector("#simplification") as HTMLInputElement;
    const simplify = (show = true) => {
      if (show) {
        radio.checked = true;
        this._simplifyOptions.factor = parseInt(slider.value);
      } else {
        this._simplifyOptions.factor = 0;
      }
      this._showSimplification();
    };
    slider.addEventListener("change", () => simplify(true));
    modal
      .querySelectorAll('input[type="radio"]')
      .forEach((elem) =>
        elem.addEventListener("change", () =>
          simplify(elem.getAttribute("value") === "stripped")
        )
      );

    // export button click
    modal.querySelector("#confirmExport")?.addEventListener("click", () => {
      const exportType = (
        document.querySelector(
          'input[name="exportType"]:checked'
        ) as HTMLInputElement
      ).value;
      this._export(exportType);
      this._clean(this._source.map);
      modal.parentNode?.removeChild(modal);
    });

    // cancel button click
    modal.querySelector("#cancelExport")?.addEventListener("click", () => {
      this._clean(this._source.map);
      modal.parentNode?.removeChild(modal);
    });
  }

  private _showSimplification() {
    const emptyData: GeoJSON = { type: "Point", coordinates: [] };
    let simplifiedSource: GeoJSONSource | undefined =
      this._source.map.getSource(SOURCE_NAME);

    // add source
    if (this._simplifyOptions.factor === 0) {
      return simplifiedSource?.setData(emptyData);
    } else if (!simplifiedSource) {
      simplifiedSource = this._source.map
        .addLayer({
          id: SOURCE_NAME,
          source: {
            type: "geojson",
            data: emptyData,
          },
          type: "circle",
          paint: { "circle-color": "yellow" },
        })
        .addLayer({
          id: SOURCE_NAME + "-route",
          source: SOURCE_NAME,
          type: "line",
          paint: {
            "line-color": "yellow",
            "line-dasharray": [3, 3],
            "line-width": 2,
          },
        })
        .getSource(SOURCE_NAME);
    }

    this._source.getData().then((data) => {
      data = this._simplifyRoute(data);
      simplifiedSource?.setData(data);
    });
  }

  private _simplifyRoute(data: GeoJSON) {
    const features = toFeatures(data);

    const routePoints = features
      .filter(filterPoiRoute)
      .flatMap(({ geometry: { type, coordinates } }) =>
        (type === "MultiLineString" ? coordinates.flat() : coordinates).map(
          (cur) => new LngLat(cur[0], cur[1])
        )
      );

    return (
      features
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

        // split into independent routes
        .map((cur, idx, arr) =>
          routePoints
            .slice(idx > 0 ? arr[idx - 1] + 1 : 0, cur + 1)
            .map((_) => _.toArray())
        )

        // simplify route
        .map((route) =>
          simplify(
            route.map((point) => ({ x: point[0], y: point[1] })),
            SIMPLIFICATION_BASE *
              SIMPLIFICATION_FACTOR *
              this._simplifyOptions.factor
          )
        )

        // convert to geojson
        .reduce(
          (sum, cur) => {
            const geometry: Geometry = {
              coordinates: cur.map((_) => [_.x, _.y]),
              type: "LineString",
            };
            sum.features.push({ geometry, properties: {}, type: "Feature" });
            return sum;
          },
          {
            features: [],
            type: "FeatureCollection",
          } as FeatureCollection
        )
    );
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
        data = this._simplifyRoute(data);
        const count = data.features.length;
        for (let i = 0; i < ROUTE_COUNT; i++) {
          if (i >= count)
            data.features.push(
              JSON.parse(JSON.stringify(data.features[i % count]))
            );
          data.features[i].properties = { name: `Route ${i + 1}` };
        }
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

  private _clean(map: Map) {
    Object.keys(map.style._layers).forEach(
      (layer) =>
        map.getLayer(layer)?.source === SOURCE_NAME && map.removeLayer(layer)
    );
    map.removeSource(SOURCE_NAME);
  }
}
