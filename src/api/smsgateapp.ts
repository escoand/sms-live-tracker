import { Encryptor } from "../crypt";
import { TrackersApp, TrackersBackend } from "../types";

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

export class SmsGateApp implements TrackersBackend {
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
        new Error(`requested tracker '${trackerName}' is unknown`)
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
    let data: WebHookEvent;

    try {
      data = JSON.parse(payload);

      // decrypt
      try {
        data.payload.phoneNumber = this._crypt.Decrypt(
          data.payload.phoneNumber
        );
      } catch {}
      try {
        data.payload.message = this._crypt.Decrypt(data.payload.message);
      } catch {}

      // find tracker
      const tracker = this._app.getTracker(data.payload.phoneNumber);

      // sms sent
      if (data.event == "sms:sent") {
        const event = data as SmsSentEvent;
        console.info(
          `sms sent to ${event.payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${event.payload.sentAt}`
        );
        if (tracker) {
          delete tracker.properties.failed;
          delete tracker.properties.requested;
          tracker.properties.sent = new Date(
            event.payload.sentAt
          ).toISOString();
          delete tracker.properties.delivered;
          this._app.syncTrackers();
        }
      }

      // sms delivered
      else if (data.event == "sms:delivered") {
        const event = data as SmsDeliveredEvent;
        console.info(
          `sms delivered to ${event.payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${event.payload.deliveredAt}`
        );
        if (tracker) {
          delete tracker.properties.failed;
          delete tracker.properties.requested;
          delete tracker.properties.sent;
          tracker.properties.delivered = new Date(
            event.payload.deliveredAt
          ).toISOString();
          this._app.syncTrackers();
        }
      }

      // sms received
      else if (data.event == "sms:received") {
        const event = data as SmsReceivedEvent;
        console.info(
          `sms received from ${event.payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${event.payload.receivedAt}:`,
          event.payload.message.replace(/\r/g, "\\r").replace(/\n/g, "\\n")
        );
        if (tracker) {
          delete tracker.properties.failed;
          delete tracker.properties.requested;
          delete tracker.properties.sent;
          delete tracker.properties.delivered;
          tracker.properties.received = new Date(
            event.payload.receivedAt
          ).toISOString();
          this._app.parseMessage(event.payload.message, tracker);
          this._app.syncTrackers();
        }
      }

      // sms failed
      else if (data.event == "sms:failed") {
        const event = data as SmsFailedEvent;
        console.warn(
          `sms failed to ${event.payload.phoneNumber} (tracker: ${tracker?.properties?.name}) at ${event.payload.failedAt}:`,
          event.payload.reason
        );
        if (tracker) {
          tracker.properties.failed = new Date(
            event.payload.failedAt
          ).toISOString();
          delete tracker.properties.requested;
          delete tracker.properties.sent;
          delete tracker.properties.delivered;
          this._app.syncTrackers();
        }
      }

      // system ping
      else if (data.event == "system:ping") {
        const event = data as SystemPingEvent;
        console.info("system ping:", event);
      }

      // other event
      else {
        return Promise.reject(`unexpected data: ${data}`);
      }

      return Promise.resolve();
    } catch (err) {
      return Promise.reject(`failed to read event: ${payload}: ${err}`);
    }
  }
}
