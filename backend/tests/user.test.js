// tests/user.test.js
const request = require("supertest");
const app = require("../main");

describe("User API", () => {
  it("should return a list of users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should create a user", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Zain", email: "zain@example.com" });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("name", "Zain");
  });
});
