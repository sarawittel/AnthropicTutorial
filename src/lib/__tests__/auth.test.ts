// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

const { mockGet, mockSet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockGet, set: mockSet }),
}));

import { createSession, getSession } from "../auth";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => { mockGet.mockClear(); mockSet.mockClear(); });

  it("sets the auth-token cookie", async () => {
    await createSession("user-1", "user@example.com");
    expect(mockSet).toHaveBeenCalledOnce();
    expect(mockSet.mock.calls[0][0]).toBe("auth-token");
  });

  it("sets httpOnly and sameSite lax", async () => {
    await createSession("user-1", "user@example.com");
    const options = mockSet.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
  });

  it("sets expiry ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();
    const { expires } = mockSet.mock.calls[0][2];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it("issues a JWT containing userId and email", async () => {
    await createSession("user-1", "user@example.com");
    const token = mockSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, SECRET);
    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("user@example.com");
  });

  it("issues a JWT signed with HS256", async () => {
    await createSession("user-1", "user@example.com");
    const token: string = mockSet.mock.calls[0][1];
    const header = JSON.parse(atob(token.split(".")[0]));
    expect(header.alg).toBe("HS256");
  });
});

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(SECRET);
}

describe("getSession", () => {
  beforeEach(() => mockGet.mockClear());

  it("returns null when no cookie is present", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  it("returns null for a malformed token", async () => {
    mockGet.mockReturnValue({ value: "not.a.jwt" });
    expect(await getSession()).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 10;
    const token = await makeToken({ userId: "u1", email: "a@b.com" }, expiredAt);
    mockGet.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  it("returns the session payload for a valid token", async () => {
    const token = await makeToken({ userId: "u1", email: "a@b.com" });
    mockGet.mockReturnValue({ value: token });
    const session = await getSession();
    expect(session?.userId).toBe("u1");
    expect(session?.email).toBe("a@b.com");
  });
});
