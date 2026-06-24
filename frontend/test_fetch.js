import { scanWallet } from './src/api/axon.js';

async function test() {
  try {
    const res = await scanWallet('Vote111111111111111111111111111111111111111');
    console.log("Success:", res.identity.ethBalance);
  } catch (err) {
    console.error("Caught error:", err.message);
  }
}

test();
