export class Logger {
  static info(message, meta = {}) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message,
        ...meta,
      }),
    );
  }

  static warn(message, meta = {}) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "WARN",
        message,
        ...meta,
      }),
    );
  }

  static error(message, meta = {}) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        message,
        ...meta,
      }),
    );
  }
}
