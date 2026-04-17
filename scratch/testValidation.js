const validateObjectId = require("./middlewares/validateObjectId");
const mongoose = require("mongoose");

// Mock Express req, res, next
const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

const mockNext = () => jest ? jest.fn() : () => {};

console.log("Testing validateObjectId middleware...");

// Case 1: Valid ObjectId
const req1 = { params: { id: new mongoose.Types.ObjectId().toString() } };
const res1 = mockRes();
validateObjectId("id")(req1, res1, () => {
    console.log("Case 1 (Valid ID) passed: next() called");
});

// Case 2: Invalid ObjectId
const req2 = { params: { id: "doctor_123" } };
const res2 = mockRes();
validateObjectId("id")(req2, res2, () => {
    console.log("Case 2 (Invalid ID) FAILED: next() called");
});
if (res2.statusCode === 400) {
    console.log("Case 2 (Invalid ID) passed: returned 400", res2.jsonData);
}

// Case 3: Missing parameter (should skip)
const req3 = { params: { } };
const res3 = mockRes();
validateObjectId("id")(req3, res3, () => {
    console.log("Case 3 (Missing ID) passed: next() called");
});
