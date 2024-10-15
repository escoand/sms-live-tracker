mapboxgl.accessToken =
  "pk.eyJ1IjoicGFzc3RzY2h1IiwiYSI6ImFwSFVvOVEifQ.djLlizVZhCdi5FCSB3U9OA";

const colors = [
  "hsl",
  ["%", ["*", ["to-number", ["get", "name"]], 137.508], 360],
  100,
  50,
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
      //"line-color": colors,
      "line-width": 5,
      "line-opacity": 0.5,
    },
  },
  // route pois
  {
    id: "routes-pois",
    source: "routes",
    type: "circle",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": ["get", "color"],
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
  new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/outdoors-v12",
    center: [0, 0],
  }).on("load", initMap);
});

const initMap = (evt) => {
  map = evt.target;

  // add controls
  map.addControl(new mapboxgl.FullscreenControl());
  map.addControl(new mapboxgl.GeolocateControl());
  map.addControl(new mapboxgl.NavigationControl());
  map.addControl(new mapboxgl.ScaleControl());
  map.addControl(
    {
      onAdd: (map) => {
        const container = document.createElement("table");
        const toggle = container.appendChild(document.createElement("thead"));
        const body = container.appendChild(document.createElement("tbody"));
        const head = toggle.appendChild(document.createElement("tr"));

        head.appendChild(document.createElement("th")).innerHTML = "#";
        head.appendChild(document.createElement("th")).innerHTML =
          "&#128267;&#xFE0E;";
        head.appendChild(document.createElement("th")).innerHTML =
          "&#128228;&#xFE0E;";
        head.appendChild(document.createElement("th")).innerHTML =
          "&#128229;&#xFE0E;";
        head.appendChild(document.createElement("th"));

        container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
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
        .filter((f) => f.geometry.type == "LineString")
        .flatMap((feature) =>
          feature.geometry.type == "LineString"
            ? feature.geometry.coordinates
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
      map.fitBounds(bounds, { padding: 10 });
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
        // create tracker entry
        if (!document.getElementById("data-" + pos.properties.name)) {
          const row = document.createElement("tr");
          row.setAttribute("id", "data-" + pos.properties.name);
          row
            .appendChild(document.createElement("td"))
            .append(pos.properties.name);
          row
            .appendChild(document.createElement("td"))
            .setAttribute("id", "data-" + pos.properties.name + "-battery");
          row
            .appendChild(document.createElement("td"))
            .setAttribute("id", "data-" + pos.properties.name + "-requested");
          row
            .appendChild(document.createElement("td"))
            .setAttribute("id", "data-" + pos.properties.name + "-received");
          const btn = row
            .appendChild(document.createElement("td"))
            .appendChild(document.createElement("button"));
          btn.innerHTML = "&#128260;&#xFE0E;";
          btn.addEventListener("click", () =>
            requestPosition(pos.properties.number)
          );
          map.trackers_.appendChild(row);
        }
        // update tracker entry
        const requested = new Date(pos.properties.requested).getTime();
        const received = new Date(pos.properties.received).getTime();
        document.getElementById(
          "data-" + pos.properties.name + "-battery"
        ).innerHTML = pos.properties.battery;
        document.getElementById(
          "data-" + pos.properties.name + "-requested"
        ).innerHTML = requested
          ? Math.round((now - requested) / 1000 / 60) + "min"
          : "";
        document.getElementById(
          "data-" + pos.properties.name + "-received"
        ).innerHTML = received
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
