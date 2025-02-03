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
          "url(\"data:image/svg+xml,%3Csvg fill='%23333' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.4479,20A10.856,10.856,0,0,0,24,13,11,11,0,1,0,13,24a10.856,10.856,0,0,0,7-2.5521L27.5859,29,29,27.5859ZM13,22a9,9,0,1,1,9-9A9.01,9.01,0,0,1,13,22Z' /%3E%3Cpath d='M10,12H8V10a2.0023,2.0023,0,0,1,2-2h2v2H10Z' /%3E%3Cpath d='M18,12H16V10H14V8h2a2.0023,2.0023,0,0,1,2,2Z'%3E%3C/path%3E%3Cpath d='M12,18H10a2.0023,2.0023,0,0,1-2-2V14h2v2h2Z' /%3E%3Cpath d='M16,18H14V16h2V14h2v2A2.0023,2.0023,0,0,1,16,18Z' /%3E%3Crect fill='none' width='32' height='32' /%3E%3C/svg%3E\")";
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
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23333' viewBox='0 0 217.205 217.205'%3E%3Cpath d='M167.631,101.102H49.574c-16.216,0-29.408-13.199-29.408-29.422c0-16.211,13.192-29.399,29.408-29.399h73.789 c4.143,0,7.5-3.358,7.5-7.5c0-4.142-3.357-7.5-7.5-7.5H49.574c-24.486,0-44.408,19.917-44.408,44.399 c0,24.494,19.922,44.422,44.408,44.422h118.057c16.216,0,29.408,13.199,29.408,29.423c0,16.211-13.192,29.399-29.408,29.399H93.205 c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5h74.426c24.486,0,44.408-19.917,44.408-44.399 C212.039,121.03,192.117,101.102,167.631,101.102z'%3E%3C/path%3E%3Cpath d='M48.516,130.001c-17.407,0-31.568,14.162-31.568,31.568c0,26.865,25.192,52.367,26.265,53.439 c1.407,1.407,3.314,2.197,5.304,2.197c1.989,0,3.897-0.79,5.304-2.197c1.072-1.073,26.263-26.574,26.263-53.439 C80.082,144.163,65.922,130.001,48.516,130.001z M48.516,198.357c-6.477-7.995-16.568-22.713-16.568-36.788 c0-9.136,7.433-16.568,16.568-16.568c9.135,0,16.566,7.433,16.566,16.568C65.082,175.644,54.991,190.362,48.516,198.357z'%3E%3C/path%3E%3Cpath d='M168.053,87.202c1.919,0,3.838-0.732,5.302-2.195c1.073-1.072,26.278-26.573,26.278-53.44 C199.633,14.161,185.466,0,168.053,0c-17.407,0-31.568,14.161-31.568,31.566c0,26.866,25.192,52.367,26.266,53.439 C164.214,86.47,166.133,87.202,168.053,87.202z M168.053,15c9.143,0,16.58,7.432,16.58,16.566c0,14.076-10.1,28.796-16.579,36.79 c-6.476-7.994-16.569-22.713-16.569-36.79C151.484,22.432,158.917,15,168.053,15z'%3E%3C/path%3E%3C/svg%3E\")";
      icon.style.transform = "scale(0.6)";

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
        icon.style.transform = "scale(0.6)";
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
