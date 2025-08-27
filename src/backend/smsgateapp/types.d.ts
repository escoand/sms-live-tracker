/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** Message State */
export interface MessageStatus {
  /** The unique identifier of the message. */
  id: string;
  /**
   * The message state.
   * @default "Pending"
   */
  state: "Pending" | "Processed" | "Sent" | "Delivered" | "Failed";
  /**
   * *(Cloud-only)* Whether the `phoneNumber` is the first 16 characters of the SHA256 hash of the E164 formatted phone number.
   * @default false
   */
  isHashed: boolean;
  /**
   * Whether the message text and phone numbers are encrypted. See [Encryption Details](https://sms-gate.app/privacy/encryption).
   * @default false
   */
  isEncrypted: boolean;
  /** The list of recipients and their states. */
  recipients?: MessageRecipient[];
  /** The history of states for the message. */
  states?: Record<string, string>;
  /**
   * Device ID
   * @maxLength 21
   * @example "PyDmBQZZXYmyxMwED8Fzy"
   */
  deviceId: string;
}

/** Message Recipient State */
export interface MessageRecipient {
  /**
   * The recipient's phone number in international notation.
   * @maxLength 16
   * @example "+79990001234"
   */
  phoneNumber: string;
  /** The state of the recipient. */
  state: "Pending" | "Processed" | "Sent" | "Delivered" | "Failed";
  /** The error message if the state is `Failed`. */
  error?: string | null;
}

/** Device */
export interface Device {
  /** The unique identifier of the device. */
  id?: string;
  /** The name of the device. */
  name?: string;
  /**
   * The timestamp when the device was created.
   * @format date-time
   */
  createdAt?: string;
  /**
   * The timestamp when the device was last updated.
   * @format date-time
   */
  updatedAt?: string;
  /**
   * The timestamp when the device was last seen.
   * @format date-time
   */
  lastSeen?: string;
}

export interface HealthCheck {
  /** Overall status of the health check. Possible values: "pass", "fail", "warn". */
  status?: "pass" | "fail" | "warn";
  /** Current version of the service or application. */
  version?: string;
  /** Specific release or deployment identifier of the service or application. */
  releaseId?: number;
  /** Detailed health check results for specific components or features. */
  checks?: Record<string, CheckDetail>;
}

export interface CheckDetail {
  /** Human-readable explanation of the health check. */
  description?: string;
  /** Unit of measurement for the observed value. */
  observedUnit?: string;
  /** The result of the health check, represented as a number. */
  observedValue?: number;
  /** Status of this specific check. Possible values: "pass", "fail", "warn". */
  status?: "pass" | "fail" | "warn";
}

/** WebHook */
export interface WebHook {
  /**
   * A unique identifier for the webhook.
   * @example "vWPwfPE-13ajPGniCZgdK"
   */
  id?: string;
  /**
   * The unique identifier of the device the webhook is associated with.
   * @example "PyDmBQZZXYmyxMwED8Fzy"
   */
  deviceId?: string | null;
  /**
   * The type of event being reported.
   * @example "sms:received"
   */
  event:
    | "sms:received"
    | "sms:sent"
    | "system:ping"
    | "sms:delivered"
    | "sms:failed"
    | "sms:data-received";
  /**
   * The URL to which the event data will be POSTed.
   * @format uri
   * @example "https://webhook.site/0e07d6e1-d5f0-4d18-b340-d22e8a272ba0"
   */
  url: string;
}

export interface WebHookEvent {
  /** The unique identifier of the webhook event. */
  id?: string;
  /** The identifier of the webhook configuration that triggered this event. */
  webhookId?: string;
  /** The unique identifier of the device. */
  deviceId?: string;
  /** The type of event that triggered the webhook. */
  event?:
    | "sms:received"
    | "sms:sent"
    | "system:ping"
    | "sms:delivered"
    | "sms:failed";
  /** The data associated with the event. */
  payload?:
    | SmsReceivedPayload
    | SmsSentPayload
    | SmsDeliveredPayload
    | SmsFailedPayload
    | SystemPingPayload
    | SmsDataReceivedPayload;
}

/**
 * SmsReceivedPayload
 * Payload of `sms:received` event.
 */
export type SmsReceivedPayload = SmsEventPayload & {
  /** The content of the SMS message received. */
  message?: string;
  /**
   * The timestamp when the SMS message was received.
   * @format date-time
   */
  receivedAt?: string;
};

/**
 * SmsEventPayload
 * Base payload for SMS-related events.
 */
export interface SmsEventPayload {
  /** The unique identifier of the SMS message. */
  messageId?: string;
  /** The phone number of the sender (for incoming messages) or recipient (for outgoing messages). */
  phoneNumber?: string;
  /** The SIM card number that sent the SMS. May be `null` if the SIM cannot be determined or the default was used. */
  simNumber?: number | null;
}

/**
 * SmsSentPayload
 * Payload of `sms:sent` event.
 */
export type SmsSentPayload = SmsEventPayload & {
  /**
   * The timestamp when the SMS message was sent.
   * @format date-time
   */
  sentAt?: string;
};

/**
 * SmsDeliveredPayload
 * Payload of `sms:delivered` event.
 */
export type SmsDeliveredPayload = SmsEventPayload & {
  /**
   * The timestamp when the SMS message was delivered.
   * @format date-time
   */
  deliveredAt?: string;
};

/**
 * SmsFailedPayload
 * Payload of `sms:failed` event.
 */
export type SmsFailedPayload = SmsEventPayload & {
  /**
   * The timestamp when the SMS message failed.
   * @format date-time
   */
  failedAt?: string;
  /** The reason for the failure. */
  reason?: string;
};

/**
 * SystemPingPayload
 * Payload of `system:ping` event.
 */
export type SystemPingPayload = object;

/**
 * SmsDataReceivedPayload
 * Payload of `sms:data-received` event.
 */
export type SmsDataReceivedPayload = SmsEventPayload & {
  /** Base64-encoded content of the SMS message received. */
  data?: string;
  /**
   * The timestamp when the SMS message was received.
   * @format date-time
   */
  receivedAt?: string;
};

/** LogEntry */
export interface LogEntry {
  /** A unique identifier for the log entry. */
  id?: number;
  /** The priority level of the log entry. */
  priority?: "DEBUG" | "INFO" | "WARN" | "ERROR";
  /** The module or component of the system that generated the log entry. */
  module?: string;
  /** A message describing the log event. */
  message?: string;
  /** Additional context information related to the log entry, typically including data relevant to the log event. */
  context?: Record<string, string>;
  /**
   * The timestamp when this log entry was created.
   * @format date-time
   */
  createdAt?: string;
}

/** Settings */
export interface Settings {
  encryption?: {
    passphrase?: string | null;
  };
  /** *(local mode only)* */
  gateway?: {
    cloud_url?: string | null;
    private_token?: string | null;
  };
  messages?: {
    send_interval_min?: number | null;
    send_interval_max?: number | null;
    limit_period?: "Disabled" | "PerMinute" | "PerHour" | "PerDay";
    limit_value?: number | null;
    sim_selection_mode?: "OSDefault" | "RoundRobin" | "Random";
    log_lifetime_days?: number | null;
  };
  ping?: {
    interval_seconds?: number | null;
  };
  logs?: {
    lifetime_days?: number | null;
  };
  webhooks?: {
    internet_required?: boolean | null;
    retry_count?: number | null;
    signing_key?: string | null;
  };
}

/**
 * Message
 * For sending messages, only one of `message`, `textMessage` or `dataMessage` should be set. The `message` field is deprecated in favor of the new message types.
 */
export type Message = {
  /** The unique identifier of the message. */
  id?: string;
  /** The recipients' phone numbers in international notation. */
  phoneNumbers: string[];
  /**
   * The SIM card number; if `null`, the default is used.
   * @min 1
   * @max 3
   */
  simNumber?: number | null;
  /**
   * The expiration timeout in seconds; conflicts with `validUntil`.
   * @min 5
   * @example 86400
   */
  ttl?: number | null;
  /**
   * The expiration date; conflicts with `ttl`.
   * @format date-time
   */
  validUntil?: string | null;
  /**
   * Whether to request a delivery report.
   * @default true
   */
  withDeliveryReport?: boolean;
  /**
   * Whether the message text and phone numbers are encrypted. See [Encryption Details](https://sms-gate.app/privacy/encryption).
   * @default false
   */
  isEncrypted?: boolean;
  /**
   * Message priority; use values >= 100 to ignore limits and delays.
   * @min -128
   * @max 127
   * @default 0
   */
  priority?: number;
  /**
   * Optional device ID for explicit selection
   * @maxLength 21
   * @example "PyDmBQZZXYmyxMwED8Fzy"
   */
  deviceId?: string | null;
} & (
  | {
      /**
       * The message text. This field is deprecated, use `textMessage` instead.
       * @maxLength 65535
       */
      message: string;
    }
  | {
      textMessage: TextMessage;
    }
  | {
      dataMessage: DataMessage;
    }
);

/** TextMessage */
export interface TextMessage {
  /** Message text */
  text: string;
}

/** DataMessage */
export interface DataMessage {
  /**
   * Base64-encoded payload
   * @format byte
   */
  data: string;
  /**
   * Destination port
   * @min 0
   * @max 65535
   */
  port: number;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "/";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response.clone() as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title SMS Gateway for Android™ Integration API
 * @version {{VERSION}}
 * @license Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0.html)
 * @baseUrl /
 * @contact SMSGate Support <support@sms-gate.app> (https://docs.sms-gate.app/)
 *
 * Provides the ability to send SMS messages by sending requests directly to a device or through a cloud server.
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  messages = {
    /**
     * @description Adds a message to the queue for sending.
     *
     * @tags Messages
     * @name PostMessage
     * @summary Send a message
     * @request POST:/messages
     * @secure
     */
    postMessage: (
      data: Message,
      query?: {
        /**
         * If `true`, phone numbers will be used without validation.
         * @default false
         */
        skipPhoneValidation?: boolean;
        /** Filter devices active within the specified number of hours */
        deviceActiveWithin?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        MessageStatus,
        {
          /** The error message describing the issue. */
          message: string;
        }
      >({
        path: `/messages`,
        method: "POST",
        query: query,
        body: data,
        secure: true,
        ...params,
      }),

    /**
     * @description Retrieves a list of messages with filtering and pagination
     *
     * @tags Messages
     * @name GetMessages
     * @summary Get messages
     * @request GET:/messages
     * @secure
     */
    getMessages: (
      query?: {
        /** Filter messages by processing state */
        state?: "Pending" | "Processed" | "Sent" | "Delivered" | "Failed";
        /**
         * Pagination offset
         * @min 0
         * @default 0
         */
        offset?: number;
        /**
         * Pagination limit
         * @max 100
         * @default 50
         */
        limit?: number;
        /**
         * Start date in RFC3339 format
         * @format date-time
         */
        from?: string;
        /**
         * End date in RFC3339 format
         * @format date-time
         */
        to?: string;
        /**
         * Filter by device ID
         * @minLength 21
         * @maxLength 21
         */
        deviceId?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        MessageStatus[],
        {
          /** The error message describing the issue. */
          message: string;
        }
      >({
        path: `/messages`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns the current status of a message by its ID.
     *
     * @tags Messages
     * @name GetMessageId
     * @summary Get message status
     * @request GET:/messages/{id}
     * @secure
     */
    getMessageId: (id: string, params: RequestParams = {}) =>
      this.request<
        MessageStatus,
        {
          /** The error message describing the issue. */
          message: string;
        }
      >({
        path: `/messages/${id}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description Initiates the process of exporting inbox messages via webhooks. For each message, the `sms:received` webhook will be triggered. Webhooks will be triggered in no specific order.
     *
     * @name PostMessagesInboxExport
     * @summary Request inbox messages export
     * @request POST:/messages/inbox/export
     * @secure
     */
    postMessagesInboxExport: (
      data: {
        /**
         * The start of the time range to export.
         * @format date-time
         */
        since: string;
        /**
         * The end of the time range to export.
         * @format date-time
         */
        until: string;
        /** The ID of the device to export messages for. Not required for Local mode. */
        deviceId: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        void,
        {
          /** The error message describing the issue. */
          message: string;
        }
      >({
        path: `/messages/inbox/export`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  device = {
    /**
     * @description Returns a list of registered devices for the account.
     *
     * @tags Devices
     * @name GetDevices
     * @summary Get devices
     * @request GET:/device
     * @secure
     */
    getDevices: (params: RequestParams = {}) =>
      this.request<Device[], any>({
        path: `/device`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  health = {
    /**
     * @description Returns the health status of the service.
     *
     * @tags System
     * @name GetHealth
     * @summary Health Check
     * @request GET:/health
     */
    getHealth: (params: RequestParams = {}) =>
      this.request<HealthCheck, HealthCheck>({
        path: `/health`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  webhooks = {
    /**
     * @description List all registered webhooks. Note that webhooks registered in Local mode are distinct from those registered in Cloud mode.
     *
     * @tags Webhooks
     * @name GetWebhooks
     * @summary List webhooks
     * @request GET:/webhooks
     * @secure
     */
    getWebhooks: (params: RequestParams = {}) =>
      this.request<WebHook[], any>({
        path: `/webhooks`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Register a new webhook. If the `id` field is provided and a webhook with that ID already exists, it will be updated.
     *
     * @tags Webhooks
     * @name PostWebhooks
     * @summary Register a webhook
     * @request POST:/webhooks
     * @secure
     */
    postWebhooks: (data: WebHook, params: RequestParams = {}) =>
      this.request<
        WebHook,
        {
          /** The error message describing the issue. */
          message: string;
        }
      >({
        path: `/webhooks`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a specific webhook by its unique identifier.
     *
     * @tags Webhooks
     * @name DeleteWebhooksId
     * @summary Delete a webhook
     * @request DELETE:/webhooks/{id}
     * @secure
     */
    deleteWebhooksId: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/webhooks/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),
  };
  logs = {
    /**
     * @description Retrieve a list of log entries within a specified time range.
     *
     * @tags System, Logs
     * @name GetLogs
     * @summary Get logs
     * @request GET:/logs
     * @secure
     */
    getLogs: (
      query?: {
        /**
         * The start of the time range for the logs to retrieve. Logs created after this timestamp will be included.
         * @format date-time
         */
        from?: string;
        /**
         * The end of the time range for the logs to retrieve. Logs created before this timestamp will be included.
         * @format date-time
         */
        to?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<LogEntry[], any>({
        path: `/logs`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  settings = {
    /**
     * @description Returns current settings.
     *
     * @tags Settings
     * @name GetSettings
     * @summary Get settings
     * @request GET:/settings
     * @secure
     */
    getSettings: (params: RequestParams = {}) =>
      this.request<Settings, any>({
        path: `/settings`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description Updates settings. In Local mode, settings are applied to the current device; in Cloud/Private mode, they are applied to all devices in the account. If a setting is omitted, it will not be updated. If a value is set to `null`, it will be reset to its default value.
     *
     * @tags Settings
     * @name PatchSettings
     * @summary Update settings
     * @request PATCH:/settings
     * @secure
     */
    patchSettings: (data: Settings, params: RequestParams = {}) =>
      this.request<Settings, any>({
        path: `/settings`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
}
