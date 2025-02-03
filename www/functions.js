maptilersdk.config.apiKey = "WhAMg18w38LHuVYEtZE9";

const colors = [
  "interpolate",
  ["linear"],
  ["/", ["-", ["to-number", ["get", "name"]], 19], 15],
  0.0,
  "blue",
  0.1,
  "royalblue",
  0.3,
  "cyan",
  0.5,
  "lime",
  0.7,
  "yellow",
  1.0,
  "red",
];
const layers = [
  // route lines
  {
    id: "routes-line",
    source: "routes",
    type: "line",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": ["get", "color"],
      "line-opacity": ["case", ["boolean", ["get", "hidden"], false], 0, 0.75],
      "line-width": 5,
    },
  },
  // route points
  {
    id: "routes-points",
    source: "routes",
    type: "circle",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": ["get", "color"],
      "circle-opacity": 0.75,
    },
  },
  // route text
  {
    id: "routes-text",
    source: "routes",
    type: "symbol",
    filter: ["==", ["geometry-type"], "Point"],
    layout: {
      "text-anchor": "bottom",
      "text-field": ["get", "name"],
      "text-offset": [0, -0.5],
    },
    paint: {
      "text-color": ["get", "color"],
    },
  },
  // tracker icons
  {
    id: "tracker-icon",
    source: "positions",
    type: "circle",
    paint: {
      "circle-color": "transparent",
      "circle-radius": 12,
      "circle-stroke-color": colors,
      "circle-stroke-width": 2,
    },
  },
  // tracker text
  {
    id: "tracker-text",
    source: "positions",
    type: "symbol",
    layout: {
      "text-anchor": "center",
      "text-field": ["get", "name"],
    },
    paint: {
      "text-color": colors,
    },
  },
];

window.addEventListener("load", () => {
  const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.TOPO,
    center: [0, 0],
    geolocateControl: false,
    scaleControl: "bottom-left",
    navigationControl: false,
  });
  map.on("load", initMap);
  // remove controls
  map.on("render", (evt) => {
    evt.target._controls
      .filter((c) => c.logoURL || c._attribHTML)
      .forEach((c) => map.removeControl(c));
  });
});

const RoutesControl = {};

const initMap = (evt) => {
  const map = evt.target;

  // add controls to top
  map.addControl(new maptilersdk.FullscreenControl());
  map.addControl(new maptilersdk.GeolocateControl());
  map.addControl(new maptilersdk.NavigationControl(), "bottom-right");

  // zoom to fit
  map.addControl(
    {
      onAdd(map) {
        this._container = document.createElement("div");
        const button = this._container.appendChild(
          document.createElement("button")
        );
        const icon = button.appendChild(document.createElement("span"));

        this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        button.type = "button";
        icon.className = "maplibregl-ctrl-icon";
        icon.style.backgroundImage =
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' file='%23333'%3E%3Cpath d='M15.5,12C18,12 20,14 20,16.5C20,17.38 19.75,18.2 19.31,18.9L22.39,22L21,23.39L17.88,20.32C17.19,20.75 16.37,21 15.5,21C13,21 11,19 11,16.5C11,14 13,12 15.5,12M15.5,14A2.5,2.5 0 0,0 13,16.5A2.5,2.5 0 0,0 15.5,19A2.5,2.5 0 0,0 18,16.5A2.5,2.5 0 0,0 15.5,14M19.5,2A0.5,0.5 0 0,1 20,2.5V11.81C19.42,11.26 18.75,10.81 18,10.5V4.7L15,5.86V10C14.3,10.07 13.62,10.24 13,10.5V5.87L9,4.47V16.13H9V16.5C9,17.14 9.09,17.76 9.26,18.34L8,17.9L2.66,19.97L2.5,20A0.5,0.5 0 0,1 2,19.5V4.38C2,4.15 2.15,3.97 2.36,3.9L8,2L14,4.1L19.34,2.03L19.5,2M4,5.46V17.31L7,16.15V4.45L4,5.46Z' /%3E%3C/svg%3E\")";
        icon.style.transform = "scale(0.7)";

        button.addEventListener("click", () => zoomToFit(map));

        return this._container;
      },
      onRemove() {
        this._container.parentNode.removeChild(this._container);
      },
    },
    "bottom-right"
  );

  // routes
  map.addControl({
    onAdd(map) {
      this._map = map;
      this._container = document.createElement("div");
      const button = this._container.appendChild(
        document.createElement("button")
      );
      const icon = button.appendChild(document.createElement("span"));

      this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
      button.type = "button";
      button.style.float = "right";
      icon.className = "maplibregl-ctrl-icon";
      icon.style.backgroundImage =
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23333'%3E%3Cpath d='M22,5.5A3.5,3.5 0 0,0 18.5,2A3.5,3.5 0 0,0 15,5.5V6A3,3 0 0,1 12,9C10,9 9,6 6,6A4,4 0 0,0 2,10V11H4V10A2,2 0 0,1 6,8C6.86,8 7.42,8.45 8.32,9.24C9.28,10.27 10.6,10.9 12,11A5,5 0 0,0 17,6V5.5A1.5,1.5 0 0,1 18.5,4A1.5,1.5 0 0,1 20,5.5C19.86,6.35 19.58,7.18 19.17,7.94C18.5,9.2 18.11,10.58 18,12C18.09,13.37 18.5,14.71 19.21,15.89C19.6,16.54 19.87,17.25 20,18A2,2 0 0,1 18,20A2,2 0 0,1 16,18A3.75,3.75 0 0,0 12.25,14.25A3.75,3.75 0 0,0 8.5,18V18.5A1.5,1.5 0 0,1 7,20A3,3 0 0,1 4,17V15H6V13H0V15H2V17A5,5 0 0,0 7,22A3.5,3.5 0 0,0 10.5,18.5V18A1.75,1.75 0 0,1 12.25,16.25A1.75,1.75 0 0,1 14,18A4,4 0 0,0 18,22A4,4 0 0,0 22,18C22,16 20,14 20,12C20,10 22,7.5 22,5.5Z' /%3E%3C/svg%3E\")";
      icon.style.transform = "scale(0.7)";

      this._routes = this._container.appendChild(document.createElement("ul"));
      this._routes.style.clear = "both";
      this._routes.style.display = "none";
      this._routes.style.listStyle = "none";
      this._routes.style.padding = 0;
      this._routes.style.margin = "5px";

      button.addEventListener("click", () => this.toggle());

      return this._container;
    },
    onRemove() {
      this.toggle(true);
      this._container.parentNode.removeChild(this._container);
    },
    toggle(forceClose = false) {
      if (this._routes.style.display != "none" || forceClose) {
        this._routes.style.display = "none";
      } else {
        this._routes.innerHTML = "";
        this._routes.style.display = "block";
        const source = map.getSource("routes");
        source.getData().then((data) =>
          data.features
            .filter((feature) =>
              ["LineString", "MultiLineString"].includes(feature.geometry.type)
            )
            .forEach((feature) => {
              const entry = this._routes
                .appendChild(document.createElement("li"))
                .appendChild(document.createElement("label"));
              const checkbox = entry.appendChild(
                document.createElement("input")
              );
              checkbox.type = "checkbox";
              checkbox.checked = !feature.properties.hidden;
              entry.append(feature.properties.name);
              checkbox.style.accentColor = feature.properties.color;
              checkbox.addEventListener("change", () => {
                feature.properties.hidden = !checkbox.checked;
                source.setData(data);
              });
            })
        );
      }
    },
  });

  // trackers
  map.addControl(
    {
      onAdd(map) {
        this._map = map;
        this._container = document.createElement("div");
        this._button = this._container.appendChild(
          document.createElement("button")
        );
        const icon = this._button.appendChild(document.createElement("span"));
        this._table = this._container.appendChild(
          document.createElement("table")
        );
        const head = this._table
          .appendChild(document.createElement("thead"))
          .appendChild(document.createElement("tr"));
        const body = this._table.appendChild(document.createElement("tbody"));

        this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        this._button.type = "button";
        icon.className = "maplibregl-ctrl-icon";
        icon.style.backgroundImage =
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23333'%3E%3Cpath d='M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z' /%3E%3C/svg%3E\")";
        icon.style.transform = "scale(0.7)";
        this._table.style.display = "none";
        body.style.textAlign = "right";

        head.appendChild(document.createElement("th"));
        head.appendChild(document.createElement("th")).innerHTML = "&#128267;";
        head.appendChild(document.createElement("th")).innerHTML = "&#128228;";
        head.appendChild(document.createElement("th")).innerHTML = "&#128229;";
        const close = head.appendChild(document.createElement("th"));
        close.innerHTML = "&#x274C;&#xFE0E;";
        close.style.color = "#333";

        this._button.addEventListener("click", () => this.toggle());
        head.addEventListener("click", () => this.toggle());

        map._trackers = body;

        return this._container;
      },
      onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map._trackers = undefined;
      },
      toggle(forceClose = false) {
        if (this._button.style.display != "none" || forceClose) {
          this._button.style.display = "none";
          this._table.style.display = "";
        } else {
          this._button.style.display = "";
          this._table.style.display = "none";
        }
      },
    },
    "top-left"
  );

  // add sources
  map.addSource("routes", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addSource("positions", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // add layers
  layers.forEach((layer) => map.addLayer(layer));

  // add routes and positions
  addRoutes(map);
  updatePositions(map);
  setInterval(() => updatePositions(map), 10 * 1000);
};

// add and zoom to routes
const addRoutes = (map) => {
  fetch("/routes.json")
    .then((response) => response.json())
    .then((json) => {
      map.getSource("routes").setData(json);
      zoomToFit(map);
    });
};

const zoomToFit = (map) =>
  map
    .getSource("routes")
    .getData()
    .then((data) => {
      const bounds = data.features
        .filter(
          (feature) =>
            ["LineString", "MultiLineString"].includes(feature.geometry.type) &&
            !feature.properties.hidden
        )
        .flatMap((feature) =>
          feature.geometry.type == "LineString"
            ? feature.geometry.coordinates
            : feature.geometry.type == "MultiLineString"
            ? feature.geometry.coordinates.flat()
            : feature.geometry.type == "Point"
            ? [feature.geometry.coordinates]
            : []
        )
        .reduce(
          (sum, [lon, lat]) => [
            [
              lon < sum[0][0] ? lon : sum[0][0],
              lat < sum[0][1] ? lat : sum[0][1],
            ],
            [
              lon > sum[1][0] ? lon : sum[1][0],
              lat > sum[1][1] ? lat : sum[1][1],
            ],
          ],
          [
            [Number.MAX_VALUE, Number.MAX_VALUE],
            [Number.MIN_VALUE, Number.MIN_VALUE],
          ]
        );
      map.fitBounds(bounds, { padding: 50 });
    });

// update data
const updatePositions = (map) => {
  fetch("/positions")
    .then((response) => response.json())
    .then((json) => {
      // update map
      map.getSource("positions").setData(json);
      // update data table
      const now = Date.now();
      json.features.forEach((pos) => {
        const prefix = "data-" + pos.properties.name;
        // create tracker entry
        if (!document.getElementById(prefix)) {
          const row = document.createElement("tr");
          row.setAttribute("id", prefix);
          row
            .appendChild(document.createElement("td"))
            .append(pos.properties.name);
          row
            .appendChild(document.createElement("td"))
            .setAttribute("id", prefix + "-battery");
          row
            .appendChild(document.createElement("td"))
            .setAttribute("id", prefix + "-requested");
          row
            .appendChild(document.createElement("td"))
            .setAttribute("id", prefix + "-received");
          const btn = row
            .appendChild(document.createElement("td"))
            .appendChild(document.createElement("button"));
          btn.innerHTML = "&#128260;";
          btn.addEventListener("click", () =>
            requestPosition(pos.properties.number)
          );
          map._trackers.appendChild(row);
        }
        // update tracker entry
        const requested = new Date(pos.properties.requested).getTime();
        const received = new Date(pos.properties.received).getTime();
        document.getElementById(prefix).style.color = !pos.geometry.coordinates
          .length
          ? "orangered"
          : "";
        document.getElementById(prefix + "-battery").innerHTML = pos.properties
          .battery
          ? pos.properties.battery
          : "";
        document.getElementById(prefix + "-requested").innerHTML = requested
          ? Math.round((now - requested) / 1000 / 60) + "min"
          : "";
        document.getElementById(prefix + "-received").innerHTML = received
          ? Math.round((now - received) / 1000 / 60) + "min"
          : "";
      });
    });
};

// request position update
const requestPosition = (number) => {
  if (
    confirm("This will send a SMS to the tracker and a SMS back. Are you sure?")
  )
    fetch("/request", { body: number, method: "POST" }).catch(console.error);
};
