import NcButton from "@nextcloud/vue/components/NcButton";
import NcFilePicker from "@nextcloud/vue/components/NcFilePicker";
import NcFormGroup from "@nextcloud/vue/components/NcFormGroup";
import NcPasswordField from "@nextcloud/vue/components/NcPasswordField";
import NcSelect from "@nextcloud/vue/components/NcSelect";
import NcSettingsSection from "@nextcloud/vue/components/NcSettingsSection";
import NcTextField from "@nextcloud/vue/components/NcTextField";
import { computed, createApp, h, reactive, ref } from "vue";

interface BackendField {
  label: string;
  type: "text" | "password";
  description?: string;
  documentation?: string;
}

interface BackendSettings {
  fields: Record<string, BackendField>;
  values: Record<string, string>;
}

interface AdminSettings {
  saveUrl: string;
  webhookUrl: string;
  backend: string;
  backends: Record<string, string>;
  backendSettings: Record<string, BackendSettings>;
  maptilerKey: string;
}

type ImportName = "trackers" | "routes";

function startLiveTrackerSettings() {
  const root = document.getElementById("live-tracker-settings");
  if (!root?.dataset.settings) return;

  let settings: AdminSettings;
  try {
    settings = JSON.parse(root.dataset.settings) as AdminSettings;
  } catch {
    root.textContent = "Could not load Live Tracker settings.";
    return;
  }

  const backend = ref(settings.backend);
  const backendSettings = reactive(settings.backendSettings);
  const selectedSettings = computed(() => backendSettings[backend.value]);
  const maptilerKey = ref(settings.maptilerKey);
  const importedData = reactive<Record<ImportName, string>>({
    trackers: "",
    routes: "",
  });
  const selectedFiles = reactive<Record<ImportName, string>>({
    trackers: "",
    routes: "",
  });
  const pendingImports = new Map<ImportName, Promise<string>>();
  const trackerPicker = ref<{ reset: () => void } | null>(null);
  const routePicker = ref<{ reset: () => void } | null>(null);
  const status = ref("");
  const saving = ref(false);

  function readImport(name: ImportName, files: File[]) {
    const file = files[0];
    if (!file) return;
    const read = file.text();
    selectedFiles[name] = file.name;
    pendingImports.set(name, read);
    status.value = "";
    void read
      .then((value) => {
        if (pendingImports.get(name) === read) importedData[name] = value;
      })
      .catch((error: unknown) => {
        if (pendingImports.get(name) === read) {
          status.value = error instanceof Error ? error.message : String(error);
        }
      });
  }

  async function saveSettings() {
    saving.value = true;
    status.value = "Saving...";
    try {
      await Promise.all(pendingImports.values());
      const activeSettings = selectedSettings.value;
      if (!activeSettings)
        throw new Error("No settings are available for this backend.");

      const body = new FormData();
      body.set("backend", backend.value);
      body.set("maptiler_key", maptilerKey.value);
      body.set("trackers", importedData.trackers);
      body.set("routes", importedData.routes);
      for (const key of Object.keys(activeSettings.fields)) {
        body.set(key, activeSettings.values[key] || "");
      }

      const response = await fetch(settings.saveUrl, {
        method: "POST",
        headers: { requesttoken: globalThis.OC?.requestToken || "" },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Save failed");

      status.value = "Saved";
      for (const [key, field] of Object.entries(activeSettings.fields)) {
        if (field.type === "password") activeSettings.values[key] = "";
      }
      importedData.trackers = "";
      importedData.routes = "";
      selectedFiles.trackers = "";
      selectedFiles.routes = "";
      pendingImports.clear();
      trackerPicker.value?.reset();
      routePicker.value?.reset();
    } catch (error) {
      status.value = error instanceof Error ? error.message : String(error);
    } finally {
      saving.value = false;
    }
  }

  createApp({
    setup() {
      return () => {
        const activeSettings = selectedSettings.value;
        if (!activeSettings)
          return h("p", "No settings are available for this backend.");

        const backendFields = Object.entries(activeSettings.fields).map(
          ([key, field]) => {
            const description = [
              field.description,
              field.type === "password"
                ? "Leave blank to keep the existing value."
                : "",
            ]
              .filter(Boolean)
              .join(" ");
            const props = {
              id: `live-tracker-${key}`,
              label: field.label,
              modelValue: activeSettings.values[key] || "",
              helperText: description,
              "onUpdate:modelValue": (value: string | number) => {
                activeSettings.values[key] = String(value);
              },
            };
            const input =
              field.type === "password"
                ? h(NcPasswordField, {
                    ...props,
                    asText: true,
                    placeholder: "Leave blank to keep the existing value",
                  })
                : h(NcTextField, { ...props, type: "text" });

            return h("div", { key }, [input]);
          },
        );

        return h("div", null, [
          h(
            NcSettingsSection,
            {
              name: "Position source",
              description:
                "Choose the service used to request and receive tracker positions.",
            },
            {
              default: () =>
                h("div", null, [
                  h("div", null, [
                    h(
                      NcFormGroup,
                      {
                        label: "Position backend",
                        description:
                          "Choose the service used to request and receive tracker positions.",
                      },
                      {
                        default: () =>
                          h(NcSelect, {
                            inputId: "live-tracker-backend",
                            options: Object.entries(settings.backends).map(
                              ([id, label]) => ({ id, label }),
                            ),
                            label: "label",
                            reduce: (option: { id: string }) => option.id,
                            clearable: false,
                            searchable: false,
                            modelValue: backend.value,
                            "onUpdate:modelValue": (value: string) => {
                              backend.value = value;
                            },
                          }),
                      },
                    ),
                  ]),
                  h(NcTextField, {
                    id: "live-tracker-maptiler-key",
                    label: "MapTiler API key (optional)",
                    modelValue: maptilerKey.value,
                    helperText:
                      "Optional. Enables the Topo and Hybrid map styles.",
                    "onUpdate:modelValue": (value: string | number) => {
                      maptilerKey.value = String(value);
                    },
                  }),
                ]),
            },
          ),
          h(
            NcSettingsSection,
            {
              name: settings.backends[backend.value] || "Backend settings",
              description:
                "Configure the active position backend and its webhook.",
              docUrl:
                backend.value === "sms_gate"
                  ? "https://docs.sms-gate.app"
                  : undefined,
            },
            {
              default: () =>
                h("div", null, [
                  ...backendFields,
                  h("div", null, [
                    h(NcTextField, {
                      id: "live-tracker-webhook",
                      label: "Webhook URL",
                      type: "url",
                      modelValue: settings.webhookUrl,
                      disabled: true,
                      helperText:
                        "Set this callback URL in SMS Gate and subscribe to sent, delivered, received, and failed events.",
                    }),
                    h(NcButton, {
                      text: "Copy webhook URL",
                      variant: "secondary",
                      onClick: async () => {
                        try {
                          await navigator.clipboard.writeText(
                            settings.webhookUrl,
                          );
                          status.value = "Webhook URL copied";
                        } catch {
                          status.value = "Could not copy webhook URL";
                        }
                      },
                    }),
                  ]),
                ]),
            },
          ),
          h(
            NcSettingsSection,
            {
              name: "GeoJSON import",
              description: "Import tracker and route FeatureCollections.",
            },
            {
              default: () =>
                h("div", null, [
                  h("div", null, [
                    h(
                      NcFormGroup,
                      {
                        label: "Trackers",
                        description:
                          "GeoJSON FeatureCollection containing tracker Point features and phone numbers.",
                      },
                      {
                        default: () => [
                          h(NcFilePicker, {
                            ref: trackerPicker,
                            label: "Choose tracker GeoJSON",
                            accept: [".json", ".geojson", "application/json"],
                            onPick: (files: File[]) =>
                              readImport("trackers", files),
                          }),
                          selectedFiles.trackers
                            ? h(
                                "span",
                                { class: "settings-hint" },
                                selectedFiles.trackers,
                              )
                            : null,
                        ],
                      },
                    ),
                  ]),
                  h("div", null, [
                    h(
                      NcFormGroup,
                      {
                        label: "Routes",
                        description:
                          "GeoJSON FeatureCollection containing route lines and points of interest.",
                      },
                      {
                        default: () => [
                          h(NcFilePicker, {
                            ref: routePicker,
                            label: "Choose route GeoJSON",
                            accept: [".json", ".geojson", "application/json"],
                            onPick: (files: File[]) =>
                              readImport("routes", files),
                          }),
                          selectedFiles.routes
                            ? h(
                                "span",
                                { class: "settings-hint" },
                                selectedFiles.routes,
                              )
                            : null,
                        ],
                      },
                    ),
                  ]),
                  h("div", null, [
                    h(NcButton, {
                      type: "button",
                      variant: "primary",
                      text: saving.value ? "Saving..." : "Save",
                      disabled: saving.value,
                      onClick: saveSettings,
                    }),
                    h(
                      "span",
                      { role: "status", "aria-live": "polite" },
                      status.value,
                    ),
                  ]),
                ]),
            },
          ),
        ]);
      };
    },
  }).mount(root);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startLiveTrackerSettings);
} else {
  startLiveTrackerSettings();
}
