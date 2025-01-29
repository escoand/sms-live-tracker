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
      "line-opacity": 0.75,
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

window.addEventListener("load", () =>
  new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.TOPO,
    center: [0, 0],
  }).on("load", initMap)
);

const initMap = (evt) => {
  map = evt.target;

  // add controls
  map.addControl(new maptilersdk.FullscreenControl());
  //map.addControl(new maptilersdk.GeolocateControl());
  //map.addControl(new maptilersdk.NavigationControl());
  map.addControl(new maptilersdk.ScaleControl());
  map.addControl(
    {
      onAdd: (map) => {
        const container = document.createElement("table");
        const toggle = container.appendChild(document.createElement("thead"));
        const body = container.appendChild(document.createElement("tbody"));
        const head = toggle.appendChild(document.createElement("tr"));

        head.appendChild(document.createElement("th")).innerHTML = "#";
        head.appendChild(document.createElement("th")).innerHTML = "&#128267;";
        head.appendChild(document.createElement("th")).innerHTML = "&#128228;";
        head.appendChild(document.createElement("th")).innerHTML = "&#128229;";
        head.appendChild(document.createElement("th"));

        container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        toggle.addEventListener("click", () => {
          body.style.display = body.style.display == "none" ? "" : "none";
        });
        body.style.display = "none";
        body.style.textAlign = "right";

        map.trackerContainer_ = container;
        map.trackers_ = body;

        return container;
      },
      onRemove: (map) => {
        map.trackerContainer_.parentNode.removeChild(map.trackerContainer_);
        map.trackers_ = undefined;
        map.trackerContainer_ = undefined;
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
      const bounds = json.features
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
};

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
          map.trackers_.appendChild(row);
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
