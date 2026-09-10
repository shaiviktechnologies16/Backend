import crypto from "node:crypto";

export class CaptchaService {
  constructor() {
    this.store = new Map();
    // Periodic cleanup of expired tokens every 3 minutes
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 3 * 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [token, data] of this.store.entries()) {
      if (now > data.expiresAt) {
        this.store.delete(token);
      }
    }
  }

  generateCode(length = 5) {
    // Exclude ambiguous characters: 0, O, 1, I, l
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      code += chars[randomBytes[i] % chars.length];
    }
    return code;
  }

  createSvg(code) {
    const width = 150;
    const height = 50;
    const bgColors = ["#f8fafc", "#f1f5f9", "#e2e8f0"];
    const bgColor = bgColors[Math.floor(Math.random() * bgColors.length)];

    // Noise lines
    let noiseLines = "";
    for (let i = 0; i < 4; i++) {
      const x1 = Math.floor(Math.random() * width);
      const y1 = Math.floor(Math.random() * height);
      const x2 = Math.floor(Math.random() * width);
      const y2 = Math.floor(Math.random() * height);
      const color = `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`;
      noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" opacity="0.6" />`;
    }

    // Noise dots
    let noiseDots = "";
    for (let i = 0; i < 25; i++) {
      const cx = Math.floor(Math.random() * width);
      const cy = Math.floor(Math.random() * height);
      const r = (Math.random() * 1.5 + 0.5).toFixed(1);
      noiseDots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#64748b" opacity="0.5" />`;
    }

    // Render characters with random rotation & offset
    let textElements = "";
    const charWidth = width / (code.length + 1);
    const colors = [
      "#1e293b",
      "#0f172a",
      "#334155",
      "#475569",
      "#1e1b4b",
      "#0284c7",
    ];

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const x = Math.floor((i + 0.8) * charWidth);
      const y = Math.floor(33 + (Math.random() * 6 - 3));
      const rotate = Math.floor(Math.random() * 26 - 13);
      const fill = colors[Math.floor(Math.random() * colors.length)];
      textElements += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${fill}" transform="rotate(${rotate}, ${x}, ${y})">${char}</text>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: ${bgColor}; border-radius: 8px; user-select: none;">${noiseLines}${noiseDots}${textElements}</svg>`;
  }

  generateCaptcha() {
    const code = this.generateCode(5);
    const token = crypto.randomUUID();
    const hash = crypto
      .createHash("sha256")
      .update(code.toLowerCase())
      .digest("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    this.store.set(token, { hash, expiresAt });

    const svg = this.createSvg(code);
    const captchaImage = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

    return {
      captchaToken: token,
      captchaImage,
      svg,
    };
  }

  verifyCaptcha(token, inputCode) {
    if (!token || !inputCode || typeof inputCode !== "string") {
      return false;
    }

    const data = this.store.get(token);

    // SINGLE USE: Delete immediately upon lookup to prevent replay attacks
    this.store.delete(token);

    if (!data) {
      return false;
    }

    if (Date.now() > data.expiresAt) {
      return false;
    }

    const inputHash = crypto
      .createHash("sha256")
      .update(inputCode.trim().toLowerCase())
      .digest("hex");

    try {
      const bufA = Buffer.from(inputHash, "hex");
      const bufB = Buffer.from(data.hash, "hex");
      if (bufA.length !== bufB.length) {
        return false;
      }
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

export const captchaService = new CaptchaService();
