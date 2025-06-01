import { Feature, Point } from "geojson";
import { Encryptor } from "./crypt";
import { TrackersApi, TrackersApp } from "./types";

type SmsMessage = {
  // The unique identifier of the message.
  id: string;
  //The message text. (maxLength: 65535)
  message?: string;
  // The recipients' phone numbers in international notation.
  phoneNumbers?: string[];
  // The SIM card number; if null, the default is used. (min: 1, max: 3)
  simNumber?: number;
  // The expiration timeout in seconds; conflicts with validUntil. (min: 5)
  ttl?: number;
  // The expiration date; conflicts with ttl.
  validUntil?: string;
  // Whether to request a delivery report. (default: true)
  withDeliveryReport?: boolean;
  // Whether the message text and phone numbers are encrypted. See Encryption Details. (default: false)
  isEncrypted?: boolean;
  // Message priority; use values >= 100 to ignore limits and delays. (default: 0, min -128, max 128)
  priority?: number;
};

type WebHookEvent = {
  // The unique identifier of the webhook event.
  id: string;
  // The identifier of the webhook configuration that triggered this event.
  webhookId: string;
  // The unique identifier of the device.
  deviceId: string;
  // The type of event that triggered the webhook.
  event: string;
  payload: { [name: string]: any };
};

type SmsDeliveredEvent = WebHookEvent & {
  event: "sms:delivered";
  payload: {
    // The unique identifier of the SMS message.
    messageId: string;
    // The phone number of the sender (for incoming messages) or recipient (for outgoing messages).
    phoneNumber: string;
    // The SIM card number that sent the SMS. May be null if the SIM cannot be determined or the default was used.
    simNumber?: number;
    // The timestamp when the SMS message was delivered.
    deliveredAt: string;
  };
};

type SmsSentEvent = WebHookEvent & {
  event: "sms:sent";
  payload: {
    // The unique identifier of the SMS message.
    messageId: string;
    // The phone number of the sender (for incoming messages) or recipient (for outgoing messages).
    phoneNumber: string;
    // The SIM card number that sent the SMS. May be null if the SIM cannot be determined or the default was used.
    simNumber?: number;
    // The timestamp when the SMS message was sent.
    sentAt: string;
  };
};

type SmsReceivedEvent = WebHookEvent & {
  event: "sms:received";
  payload: {
    // The unique identifier of the SMS message.
    messageId: string;
    // The phone number of the sender (for incoming messages) or recipient (for outgoing messages).
    phoneNumber: string;
    // The SIM card number that sent the SMS. May be null if the SIM cannot be determined or the default was used.
    simNumber?: number;
    // The content of the SMS message received.
    message: string;
    // The timestamp when the SMS message was received.
    receivedAt: string;
  };
};

type SmsFailedEvent = WebHookEvent & {
  event: "sms:failed";
  payload: {
    // The unique identifier of the SMS message.
    messageId: string;
    // The phone number of the sender (for incoming messages) or recipient (for outgoing messages).
    phoneNumber: string;
    // The SIM card number that sent the SMS. May be null if the SIM cannot be determined or the default was used.
    simNumber?: number;
    // The timestamp when the SMS message failed.
    failedAt: string;
    // The reason for the failure.
    reason: string;
  };
};

type SystemPingEvent = WebHookEvent & {
  event: "system:ping";
};

export class SmsGateApp implements TrackersApi {
  private _app: TrackersApp;
  private _auth: string;
  private _crypt: Encryptor;

  constructor(app: TrackersApp) {
    this._app = app;
    this._auth = btoa(process.env.API_AUTHENTICATION);
    this._crypt = new Encryptor(process.env.API_ENCRYPTION);
  }

  request(trackerName: string): Promise<any> {
    const tracker = this._app.getTracker(trackerName);

    if (!tracker) {
      return Promise.reject(
        new Error(`requested tracker with '${trackerName}' is unknown`)
      );
    }

    console.info(`request position for tracker '${trackerName}'`);

    const body: SmsMessage = {
      id: null,
      message: this._crypt.Encrypt(process.env.API_MESSAGE),
      phoneNumbers: [this._crypt.Encrypt(tracker.properties.number)],
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
      this._app.syncTrackers();
    });
  }

  receive(payload: string): Promise<any> {
    const data: WebHookEvent = JSON.parse(payload);
    let tracker: Feature<Point>;

    // decrypt
    try {
      data.payload.phoneNumber = this._crypt.Decrypt(data.payload.phoneNumber);
    } catch {}
    try {
      data.payload.message = this._crypt.Decrypt(data.payload.message);
    } catch {}

    // find
    tracker = this._app.getTracker(data.payload.phoneNumber);

    switch (data.event) {
      // sms delivered
      case "sms:delivered":
        const event1 = data as SmsDeliveredEvent;
        console.info(
          `sms delivered to ${event1.payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${event1.payload.deliveredAt}`
        );
        break;
      // sms sent
      case "sms:sent":
        const event2 = data as SmsSentEvent;
        console.info(
          `sms sent to ${event2.payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${event2.payload.sentAt}`
        );
        if (tracker) {
          tracker.properties.requested = new Date(
            event2.payload.sentAt
          ).toISOString();
          this._app.syncTrackers();
        }
        break;
      // sms received
      case "sms:received":
        const event3 = data as SmsReceivedEvent;
        console.info(
          `sms received from ${event3.payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${event3.payload.receivedAt}: ${event3.payload.message}`
        );
        if (tracker) {
          tracker.properties.received = new Date(
            event3.payload.receivedAt
          ).toISOString();
          this._app.syncTrackers();
        }
        break;
      // sms failed
      case "sms:failed":
        const event4 = data as SmsFailedEvent;
        console.warn(
          `sms failed to ${event4.payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${event4.payload.failedAt}: ${event4.payload.reason}`
        );
        break;
      // system ping
      case "system:ping":
        const event5 = data as SystemPingEvent;
        console.info(`system ping: ${event5}`);
        break;
      // other event
      default:
        console.warn("unexpected event:", JSON.stringify(data.payload));
        break;
    }
    return Promise.resolve();
  }
}
