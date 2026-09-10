export const writeEvent = (res, event, data) => {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;

  res.write(payload);

  if (res.flush) {
    res.flush();
  }
};
