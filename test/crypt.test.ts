import { suite, test } from "node:test";
import { Encryptor } from "../src/crypt.ts";

suite("encryptor", () => {
  const plaintext = "test message";
  const passphrase = "password123";
  const iterations = 75_000;

  test("encrypted text has correct format", (fn) => {
    const encryptor = new Encryptor(passphrase, iterations);
    const encryptedText = encryptor.encrypt(plaintext);
    fn.assert.match(encryptedText, /^\$aes-256-cbc\/pbkdf2-sha1\$i=75000\$[A-Za-z0-9+/]+=*\$[A-Za-z0-9+/]+=*$/);
  });

  test("successful encryption and decryption", (fn) => {
    const encryptor = new Encryptor(passphrase, iterations);
    const encryptedText = encryptor.encrypt(plaintext);
    const decryptedText = encryptor.decrypt(encryptedText);
    fn.assert.equal(plaintext, decryptedText);
  });

  test("encryption and decryption with default iterations", (fn) => {
    const encryptor1 = new Encryptor(passphrase);
    const encryptor2 = new Encryptor(passphrase);
    const encryptedText = encryptor1.encrypt(plaintext);
    const decryptedText = encryptor2.decrypt(encryptedText);
    fn.assert.equal(plaintext, decryptedText);
  });

  test("encryption and decryption with different iterations", (fn) => {
    const encryptor1 = new Encryptor(passphrase, iterations);
    const encryptor2 = new Encryptor(passphrase, 100);
    const encryptedText = encryptor1.encrypt(plaintext);
    const decryptedText = encryptor2.decrypt(encryptedText);
    fn.assert.equal(plaintext, decryptedText);
  });

  test("invalid encryption - wrong passphrase", (fn) => {
    const encryptor1 = new Encryptor(passphrase, iterations);
    const encryptor2 = new Encryptor("wrongpass", iterations);
    const encryptedText = encryptor1.encrypt(plaintext);
    fn.assert.throws(() => {
      encryptor2.decrypt(encryptedText);
    }, /TypeError: bad decrypt/);
  });
});
