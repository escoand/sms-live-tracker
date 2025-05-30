import { writeFile } from "fs";
import { readFile } from "fs/promises";
import { FeatureCollection } from "geojson";
import { TrackersApi } from "./types";

const auth = btoa(process.env.API_AUTHENTICATION);
const trackersFile = "data/trackers.json";

type SmsMessage = {
  //The unique identifier of the message.
  id: string;
  //The message text. (maxLength: 65535)
  message?: string;
  //The recipients' phone numbers in international notation.
  phoneNumbers?: string[];
  //The SIM card number; if null, the default is used. (min: 1, max: 3)
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

type SmsReceivedPayload = {
  // Payload of sms:received event.
  description: string;
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

export class SmsGateway implements TrackersApi {
  request(trackerName: string) {
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
          Authorization: "Basic " + auth,
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
        return writeFile(trackersFile, JSON.stringify(positions), () => {});
      });
    });
  }

  receive(payload: string) {
    const data: SmsReceivedPayload = JSON.parse(payload);
    console.info(`received position from ${data.phoneNumber}: ${data.message}`);
  }
}
