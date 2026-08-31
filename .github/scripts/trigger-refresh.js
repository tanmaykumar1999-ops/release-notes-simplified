async function main() {
  const url = process.env.REFRESH_URL;
  const secret = process.env.REFRESH_SECRET;

  const res = await fetch(`${url}/internal/sync`, {
    method: 'POST',
    headers: { 'x-refresh-secret': secret }
  });

  const body = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(body);

  if (!res.ok) {
    process.exitCode = 1;  // non-2xx makes the Action step fail, visible as a red X
  }
}

main();