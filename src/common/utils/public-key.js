import crypto from "crypto";

export function generatePublicKey() {
  return `agt_pk_${crypto.randomBytes(24).toString("hex")}`;
}
