/**
 * Stealth Address Math
 *
 * Implements ERC-5564-style stealth addresses using secp256k1 ECDH.
 *
 * Uses viem's keccak256 and hex utilities instead of ethers.js.
 *
 * Terminology:
 *   - Receiver has a "stealth meta-address" = (spendingPubKey, viewingPubKey)
 *   - Sender generates an ephemeral key pair (r, R = r·G)
 *   - Shared secret  S = r · viewingPubKey  (ECDH)
 *   - Stealth address = pubToAddress(spendingPubKey + hash(S)·G)
 *   - Stealth privKey = spendingPrivKey + hash(S)   (only receiver can compute)
 */

import { keccak256, toHex, toBytes, concat, getAddress } from "viem";

// We still use ethers.SigningKey for EC operations since viem doesn't expose
// low-level EC point math. This is a minimal ethers dependency.
import { ethers } from "ethers";

// ─── Key Generation ──────────────────────────────────────────────────────

export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const wallet = ethers.Wallet.createRandom();
  const privateKey = wallet.privateKey;
  const publicKey = ethers.SigningKey.computePublicKey(privateKey, true);
  return { privateKey, publicKey };
}

export function deriveStealthKeys(rootPrivateKey: string) {
  const spendingPriv = keccak256(
    concat([toHex("spending"), rootPrivateKey as `0x${string}`])
  );
  const spendingPub = ethers.SigningKey.computePublicKey(spendingPriv, true);

  const viewingPriv = keccak256(
    concat([toHex("viewing"), rootPrivateKey as `0x${string}`])
  );
  const viewingPub = ethers.SigningKey.computePublicKey(viewingPriv, true);

  return {
    spendingPrivateKey: spendingPriv,
    spendingPublicKey: spendingPub,
    viewingPrivateKey: viewingPriv,
    viewingPublicKey: viewingPub,
  };
}

// ─── Sender Side ─────────────────────────────────────────────────────────

export function computeStealthAddress(
  receiverSpendingPub: string,
  receiverViewingPub: string
) {
  const ephemeral = generateKeyPair();

  const signingKey = new ethers.SigningKey(ephemeral.privateKey);
  const sharedSecretPoint = signingKey.computeSharedSecret(receiverViewingPub);
  const sharedSecretHash = keccak256(sharedSecretPoint as `0x${string}`);

  const hashTimesG = ethers.SigningKey.computePublicKey(sharedSecretHash, false);
  const spendUncomp = ethers.SigningKey.computePublicKey(receiverSpendingPub, false);

  const stealthPub = addPublicKeys(spendUncomp, hashTimesG);
  const stealthAddress = ethers.computeAddress(stealthPub);

  return {
    stealthAddress,
    ephemeralPublicKey: ephemeral.publicKey,
    ephemeralPrivateKey: ephemeral.privateKey,
  };
}

// ─── Receiver Side ───────────────────────────────────────────────────────

export function checkAndDeriveStealth(
  ephemeralPubKey: string,
  viewingPrivateKey: string,
  spendingPrivateKey: string,
  spendingPublicKey: string
) {
  const viewingKey = new ethers.SigningKey(viewingPrivateKey);
  const sharedSecretPoint = viewingKey.computeSharedSecret(ephemeralPubKey);
  const sharedSecretHash = keccak256(sharedSecretPoint as `0x${string}`);

  const hashTimesG = ethers.SigningKey.computePublicKey(sharedSecretHash, false);
  const spendUncomp = ethers.SigningKey.computePublicKey(spendingPublicKey, false);
  const stealthPub = addPublicKeys(spendUncomp, hashTimesG);
  const stealthAddress = ethers.computeAddress(stealthPub);

  const n = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
  const spendScalar = BigInt(spendingPrivateKey);
  const hashScalar = BigInt(sharedSecretHash);
  const stealthPrivScalar = (spendScalar + hashScalar) % n;
  const stealthPrivateKey = "0x" + stealthPrivScalar.toString(16).padStart(64, "0");

  return {
    stealthAddress,
    stealthPrivateKey,
  };
}

// ─── EC Point Addition ───────────────────────────────────────────────────

function addPublicKeys(pubA: string, pubB: string): string {
  const a = pubA.startsWith("0x") ? pubA.slice(2) : pubA;
  const b = pubB.startsWith("0x") ? pubB.slice(2) : pubB;

  const ax = BigInt("0x" + a.slice(2, 66));
  const ay = BigInt("0x" + a.slice(66, 130));
  const bx = BigInt("0x" + b.slice(2, 66));
  const by = BigInt("0x" + b.slice(66, 130));

  const p = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");

  if (ax === bx && ay === by) {
    const num = mod(3n * ax * ax, p);
    const den = modInverse(2n * ay, p);
    const lambda = mod(num * den, p);
    const rx = mod(lambda * lambda - 2n * ax, p);
    const ry = mod(lambda * (ax - rx) - ay, p);
    return formatUncompressed(rx, ry);
  } else {
    const num = mod(by - ay, p);
    const den = modInverse(mod(bx - ax, p), p);
    const lambda = mod(num * den, p);
    const rx = mod(lambda * lambda - ax - bx, p);
    const ry = mod(lambda * (ax - rx) - ay, p);
    return formatUncompressed(rx, ry);
  }
}

function mod(a: bigint, m: bigint): bigint {
  return ((a % m) + m) % m;
}

function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return mod(old_s, m);
}

function formatUncompressed(x: bigint, y: bigint): string {
  const xHex = x.toString(16).padStart(64, "0");
  const yHex = y.toString(16).padStart(64, "0");
  return "0x04" + xHex + yHex;
}
