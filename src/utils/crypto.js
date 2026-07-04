// Encryption utilities using Web Crypto API

// Generate a key from a password and salt
export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt string data
export async function encryptData(text, key) {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = enc.encode(text);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoded
  );

  const ivArray = Array.from(iv);
  const bodyArray = Array.from(new Uint8Array(ciphertext));
  
  return JSON.stringify({ iv: ivArray, data: bodyArray });
}

// Decrypt string data
export async function decryptData(encryptedJson, key) {
  try {
    const { iv, data } = JSON.parse(encryptedJson);
    const ivArray = new Uint8Array(iv);
    const dataArray = new Uint8Array(data);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivArray,
      },
      key,
      dataArray
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
}
