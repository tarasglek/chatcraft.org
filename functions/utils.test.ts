import { describe, test, expect } from "vitest";

import { errorResponse } from "./utils";

describe("errorResponse()", () => {
  test("Status Code", () => {
    const res = errorResponse(403, "message");
    expect(res.status).toBe(403);
  });

  test("Error Message", async () => {
    const res = errorResponse(403, "message");
    const body: any = await res.json();
    expect(body.message).toBe("message");
  });
});
