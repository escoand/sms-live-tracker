import { Buffer } from "node:buffer";
import crypto from "node:crypto";

// algorithm specification
const ALGORITHM = "aes-256-cbc";
const KEY_ALGORITHM = "pbkdf2";
const MAC_ALGORITHM = "sha1";
const KEY_LENGTH = 32;
const algorithmSpec = `${ALGORITHM}/${KEY_ALGORITHM}-${MAC_ALGORITHM}`;

export class Encryptor {
  constructor(
    protected readonly passphrase: string,
    protected readonly iterations: number = 75_000
  ) {}

  public decrypt(input: string): string {
    const [_, algo, paramsStr, saltStr, encrypted] = input.split("$");

    if (algo !== algorithmSpec) throw new Error("Unsupported algorithm");

    const params = Object.fromEntries(
      paramsStr.split(",").map((_) => _.split("="))
    );

    const saltBuff = Buffer.from(saltStr, "base64");
    const encryptedBuff = Buffer.from(encrypted, "base64");
    const key = crypto.pbkdf2Sync(
      this.passphrase,
      saltBuff,
      parseInt(params["i"]),
      KEY_LENGTH,
      MAC_ALGORITHM
    );
    const decipher = crypto.createDecipheriv(ALGORITHM, key, saltBuff);
    const decryptedBuff = Buffer.concat([
      decipher.update(encryptedBuff),
      decipher.final(),
    ]);

    return decryptedBuff.toString("utf8");
  }

  public encrypt(input: string): string {
    const saltBuff = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(
      this.passphrase,
      saltBuff,
      this.iterations,
      KEY_LENGTH,
      MAC_ALGORITHM
    );
    const cipher = crypto.createCipheriv(ALGORITHM, key, saltBuff);
    const cipherBuff = Buffer.concat([
      cipher.update(Buffer.from(input)),
      cipher.final(),
    ]);

    return [
      "",
      algorithmSpec,
      "i=" + this.iterations,
      saltBuff.toString("base64"),
      cipherBuff.toString("base64"),
    ].join("$");
  }
}
