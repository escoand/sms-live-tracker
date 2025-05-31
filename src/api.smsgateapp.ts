import { readFile, writeFile } from "fs/promises";
import { FeatureCollection } from "geojson";
import { TrackersApi } from "./types";

const auth = btoa(process.env.API_AUTHENTICATION);
const trackersFile = "data/trackers.json";

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
  payload: {};
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

export class SmsGateway implements TrackersApi {
  request(trackerName: string): Promise<any> {
    return readFile(trackersFile).then((buf) => {
      const positions: FeatureCollection = JSON.parse(buf.toString());
      const tracker = positions?.features?.find(
        (_) => _.properties.name == trackerName
      );

      if (!tracker) {
        return Promise.reject(
          new Error(`requested tracker with '${trackerName}' is unknown`)
        );
      }

      console.info(`request position for tracker '${trackerName}'`);

      const body: SmsMessage = {
        id: null,
        message: process.env.API_MESSAGE,
        phoneNumbers: [tracker.properties.number],
      };

      return fetch("https://api.sms-gate.app/3rdparty/v1/messages", {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
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
        tracker.properties.requested = new Date().toISOString();
        return writeFile(trackersFile, JSON.stringify(positions));
      });
    });
  }

  receive(payload: string): Promise<any> {
    const data: WebHookEvent = JSON.parse(payload);
    switch (data.event) {
      // sms delivered
      case "sms:delivered":
        const event1 = data as SmsDeliveredEvent;
        console.info(
          `sms delivered to ${event1.payload.phoneNumber} at ${event1.payload.deliveredAt}`
        );
        break;
      // sms sent
      case "sms:sent":
        const event2 = data as SmsSentEvent;
        console.info(
          `sms sent to ${event2.payload.phoneNumber} at ${event2.payload.sentAt}`
        );
        break;
      // sms received
      case "sms:received":
        const event3 = data as SmsReceivedEvent;
        console.info(
          `sms received from ${event3.payload.phoneNumber} at ${event3.payload.receivedAt}: ${event3.payload.message}`
        );
        break;
      // sms failed
      case "sms:failed":
        const event4 = data as SmsFailedEvent;
        console.warn(
          `sms failed to ${event4.payload.phoneNumber} at ${event4.payload.failedAt}: ${event4.payload.reason}`
        );
        break;
      // system ping
      case "system:ping":
        const event5 = data as SystemPingEvent;
        console.info(`system ping: ${event5}`);
        break;
      // other event
      default:
        console.warn(`unexpected event ${data.event}: ${data.payload}`);
        break;
    }
    return Promise.resolve();
  }
}
