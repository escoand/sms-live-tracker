import process from "node:process";
import { Encryptor } from "../../crypt.ts";
import { TrackersBackend, TrackersStore } from "../../types.d.ts";
import {
  HealthCheck,
  Message,
  SmsDeliveredPayload,
  SmsFailedPayload,
  SmsReceivedPayload,
  SmsSentPayload,
  SystemPingPayload,
  WebHookEvent,
} from "./types.d.ts";

export class SmsGateApp implements TrackersBackend {
  private _store: TrackersStore;
  private _auth: string;
  private _crypt: Encryptor;

  constructor(store: TrackersStore) {
    this._store = store;
    this._auth = btoa(process.env.API_AUTHENTICATION || "");
    this._crypt = new Encryptor(process.env.API_ENCRYPTION || "");
  }

  request(trackerName: string): Promise<void> {
    const tracker = this._store.getTracker(trackerName);

    if (!tracker) {
      return Promise.reject(
        new Error(`requested tracker '${trackerName}' is unknown`)
      );
    }

    console.info(`request position for tracker '${trackerName}'`);

    try {
      const body: Message = {
        id: "",
        textMessage: {
          text: this._crypt.encrypt(process.env.API_MESSAGE || ""),
        },
        phoneNumbers: [this._crypt.encrypt(tracker.properties?.number)],
        isEncrypted: true,
      };

      return fetch("https://api.sms-gate.app/3rdparty/v1/messages", {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this._auth}`,
        },
        method: "POST",
      }).then((response) => {
        if (!response.ok) {
          return Promise.reject(
            new Error(
              `subrequest to ${response.url} failed (${response.status}: ${response.statusText})`
            )
          );
        }
        if (!tracker.properties) tracker.properties = {};
        delete tracker.properties.failed;
        tracker.properties.requested = new Date().toISOString();
        delete tracker.properties.sent;
        delete tracker.properties.delivered;
        this._store.syncTrackers();
      });
    } catch (err) {
      return Promise.reject(`failed to request: ${err}`);
    }
  }

  receive(message: string): Promise<void> {
    try {
      const event = JSON.parse(message) as WebHookEvent;

      // decrypt
      try {
        // @ts-expect-error: payload may be undefined
        event.payload.phoneNumber = this._crypt.decrypt(
          // @ts-expect-error: payload may be undefined
          event.payload.phoneNumber
        );
      } catch {
        // ignore
      }
      try {
        // @ts-expect-error: payload may be undefined
        event.payload.message = this._crypt.decrypt(event.payload.message);
      } catch {
        // ignore
      }

      // find tracker
      // @ts-expect-error: payload may be undefined
      const tracker = this._store.getTracker(event.payload?.phoneNumber);

      // sms sent
      if (event.event === "sms:sent") {
        const payload = event.payload as SmsSentPayload;

        console.info(
          `sms sent to ${payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${payload.sentAt}`
        );
        if (tracker && tracker.properties) {
          delete tracker.properties.failed;
          delete tracker.properties.requested;
          if (payload.sentAt)
            tracker.properties.sent = new Date(payload.sentAt).toISOString();
          delete tracker.properties.delivered;
          this._store.syncTrackers();
        }
      }

      // sms delivered
      else if (event.event === "sms:delivered") {
        const payload = event.payload as SmsDeliveredPayload;
        console.info(
          `sms delivered to ${payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${payload.deliveredAt}`
        );
        if (tracker && tracker.properties) {
          delete tracker.properties.failed;
          delete tracker.properties.requested;
          delete tracker.properties.sent;
          if (payload.deliveredAt)
            tracker.properties.delivered = new Date(
              payload.deliveredAt
            ).toISOString();
          this._store.syncTrackers();
        }
      }

      // sms received
      else if (event.event == "sms:received") {
        const payload = event.payload as SmsReceivedPayload;
        console.info(
          `sms received from ${payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${payload.receivedAt}:`,
          payload.message?.replace(/\r/g, "\\r").replace(/\n/g, "\\n")
        );
        if (tracker && tracker.properties) {
          delete tracker.properties.failed;
          delete tracker.properties.requested;
          delete tracker.properties.sent;
          delete tracker.properties.delivered;
          if (payload.receivedAt)
            tracker.properties.received = new Date(
              payload.receivedAt
            ).toISOString();
          if (payload.message)
            this._store.parseMessage(payload.message, tracker);
          this._store.syncTrackers();
        }
      }

      // sms failed
      else if (event.event == "sms:failed") {
        const payload = event.payload as SmsFailedPayload;
        console.warn(
          `sms failed to ${payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${payload.failedAt}:`,
          payload.reason
        );
        if (tracker && tracker.properties) {
          if (payload.failedAt)
            tracker.properties.failed = new Date(
              payload.failedAt
            ).toISOString();
          delete tracker.properties.requested;
          delete tracker.properties.sent;
          delete tracker.properties.delivered;
          this._store.syncTrackers();
        }
      }

      // system ping
      else if (event.event == "system:ping") {
        const payload = event.payload as SystemPingPayload;
        // @ts-expect-error: health check is optional
        const health = payload.health as HealthCheck;
        if (health) {
          Object.values(health.checks || {}).forEach((check) => {
            console.info(
              check.description,
              check.observedValue,
              "(" + check.observedUnit + "):",
              check.status
            );
          });
        } else {
          console.info("system ping:", payload);
        }
      }

      // other event
      else {
        return Promise.reject(`unexpected data: ${event}`);
      }

      return Promise.resolve();
    } catch (err) {
      return Promise.reject(`failed to read event: ${message}: ${err}`);
    }
  }
}
