import * as crypto from "crypto";

// source: https://docs.sms-gate.app/privacy/encryption/
export class Encryptor {
  constructor(
    protected readonly passphrase: string,
    protected readonly iterations: number = 75_000
  ) {}

  public Decrypt(input: string): string {
    const parts = input.split("$");

    if (parts.length !== 5) {
      throw new Error("Invalid encrypted text");
    }

    if (parts[1] !== "aes-256-cbc/pbkdf2-sha1") {
      throw new Error("Unsupported algorithm");
    }

    const paramsStr = parts[2];

    const params = this.parseParams(paramsStr);

    if (!params.has("i")) {
      throw new Error("Missing iteration count");
    }

    const iterations = parseInt(params.get("i")!);

    const salt = Buffer.from(parts[3], "base64");

    const encryptedText = Buffer.from(parts[4], "base64");

    const secretKey = this.generateSecretKeyFromPassphrase(
      this.passphrase,
      salt,
      32,
      iterations
    );

    const decryptedText = this.decryptString(encryptedText, secretKey, salt);

    return decryptedText.toString("utf8");
  }

  protected parseParams(params: string): Map<string, string> {
    const keyValuePairs = params.split(",");

    const result = new Map<string, string>();

    keyValuePairs.forEach((pair) => {
      const [key, value] = pair.split("=");

      result.set(key, value);
    });

    return result;
  }

  protected decryptString(
    input: Buffer,
    secretKey: Buffer,
    iv: Buffer
  ): Buffer {
    const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);

    return Buffer.concat([decipher.update(input), decipher.final()]);
  }

  public Encrypt(input: string): string {
    const salt = this.generateSalt();

    const secretKey = this.generateSecretKeyFromPassphrase(
      this.passphrase,
      salt,
      32,
      this.iterations
    );

    const encryptedText = this.encryptString(
      Buffer.from(input, "utf8"),
      secretKey,
      salt
    );

    return `$aes-256-cbc/pbkdf2-sha1$i=${this.iterations}$${salt.toString(
      "base64"
    )}$${encryptedText.toString("base64")}`;
  }

  protected encryptString(
    input: Buffer,
    secretKey: Buffer,
    iv: Buffer
  ): Buffer {
    const cypher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);

    return Buffer.concat([cypher.update(input), cypher.final()]);
  }

  protected generateSalt(size: number = 16): Buffer {
    return crypto.randomBytes(size);
  }

  protected generateSecretKeyFromPassphrase(
    passphrase: string,
    salt: Buffer,
    keyLength: number = 32,
    iterations: number = 75_000
  ): Buffer {
    return crypto.pbkdf2Sync(passphrase, salt, iterations, keyLength, "sha1");
  }
}
