const http = require("http");

const get = (url) => {
  return new Promise((resolve, reject) => {
    const start = process.hrtime();
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        const diff = process.hrtime(start);
        const durationMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
            durationMs
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            durationMs
          });
        }
      });
    }).on("error", reject);
  });
};

async function verify() {
  try {
    console.log("🔍 Running manual API endpoints verification...");
    
    // Test 1: GET /api/medicines/all?page=1&limit=5
    console.log("\n----------------------------------------------------");
    console.log("➡️ Testing: GET /api/medicines/all?page=1&limit=5");
    const res1 = await get("http://localhost:5050/api/medicines/all?page=1&limit=5");
    console.log(`Status Code: ${res1.status}`);
    console.log(`Response Time: ${res1.durationMs}ms (Target: < 100ms)`);
    console.log(`JSON Schema Check:`);
    console.log(`- Success property: ${res1.body.success}`);
    console.log(`- Total count: ${res1.body.total}`);
    console.log(`- Paginated count: ${res1.body.data?.length}`);
    console.log(`- Sample Item:`, res1.body.data?.[0]);
    if (res1.durationMs < 100) {
      console.log("✅ Response Time: PASSED (<100ms)");
    } else {
      console.log("⚠️ Response Time: WARN (>=100ms)");
    }

    // Test 2: GET /api/medicines/search?q=Cream
    console.log("\n----------------------------------------------------");
    console.log("➡️ Testing: GET /api/medicines/search?q=Cream");
    const res2 = await get("http://localhost:5050/api/medicines/search?q=Cream");
    console.log(`Status Code: ${res2.status}`);
    console.log(`Response Time: ${res2.durationMs}ms (Target: < 100ms)`);
    console.log(`JSON Schema Check:`);
    console.log(`- Success property: ${res2.body.success}`);
    console.log(`- Matching count: ${res2.body.total}`);
    console.log(`- Sample Item:`, res2.body.results?.[0]);
    if (res2.durationMs < 100) {
      console.log("✅ Response Time: PASSED (<100ms)");
    } else {
      console.log("⚠️ Response Time: WARN (>=100ms)");
    }

    // Test 3: GET /api/medicines/match?name=ACNEJOY Face Wash 100ml
    console.log("\n----------------------------------------------------");
    console.log("➡️ Testing: GET /api/medicines/match?name=ACNEJOY%20Face%20Wash%20100ml");
    const res3 = await get("http://localhost:5050/api/medicines/match?name=ACNEJOY%20Face%20Wash%20100ml");
    console.log(`Status Code: ${res3.status}`);
    console.log(`Response Time: ${res3.durationMs}ms (Target: < 100ms)`);
    console.log(`JSON Schema Check:`);
    console.log(`- Success property: ${res3.body.success}`);
    console.log(`- Exact Match count: ${res3.body.total}`);
    console.log(`- Sample Item:`, res3.body.results?.[0]);
    if (res3.durationMs < 100) {
      console.log("✅ Response Time: PASSED (<100ms)");
    } else {
      console.log("⚠️ Response Time: WARN (>=100ms)");
    }

    console.log("\n🎉 Manual E2E API Verification Complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ E2E Verification failed:", error.message);
    process.exit(1);
  }
}

// Give the server 2 seconds to warm up and establish DB pools before calling
setTimeout(verify, 2000);
