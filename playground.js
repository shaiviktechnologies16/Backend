async function* greet() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  yield "Hel";

  await new Promise((resolve) => setTimeout(resolve, 1000));
  yield "lo";

  await new Promise((resolve) => setTimeout(resolve, 1000));
  yield "!";
}

async function main() {
  for await (const part of greet()) {
    console.log(part);
  }
}

main();
