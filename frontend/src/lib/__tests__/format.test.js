import { describe, expect, it } from "vitest";
import { byteLength, displayName, friendlyError, sameAddress, shortAddress } from "../format.js";

describe("byteLength", () => {
  it("counts UTF-8 bytes, which is what the contract limits", () => {
    expect(byteLength("abc")).toBe(3);
    expect(byteLength("ç")).toBe(2);
    expect(byteLength("coração")).toBe(9);
    expect(byteLength("")).toBe(0);
    expect(byteLength(undefined)).toBe(0);
  });
});

describe("shortAddress", () => {
  it("keeps the head and tail of an address", () => {
    expect(shortAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe("0xf39F…2266");
  });

  it("leaves short or missing values alone", () => {
    expect(shortAddress("0x1234")).toBe("0x1234");
    expect(shortAddress(null)).toBe("");
  });
});

describe("displayName", () => {
  it("prefers the name chosen on-chain", () => {
    expect(displayName("Matheus", "Placeholder")).toBe("Matheus");
  });

  it("falls back to the site's own copy while nothing was chosen yet", () => {
    expect(displayName("", "Matheus")).toBe("Matheus");
    expect(displayName(undefined, "Matheus")).toBe("Matheus");
  });
});

describe("sameAddress", () => {
  it("ignores checksum casing", () => {
    expect(sameAddress("0xABC123", "0xabc123")).toBe(true);
    expect(sameAddress("0xABC123", "0xdef456")).toBe(false);
  });

  it("is false when either side is missing", () => {
    expect(sameAddress(null, "0xabc")).toBe(false);
    expect(sameAddress("0xabc", undefined)).toBe(false);
  });
});

describe("friendlyError", () => {
  it("translates a user rejection", () => {
    expect(friendlyError({ code: "ACTION_REJECTED" })).toBe("Transação cancelada na carteira.");
  });

  it("translates the contract's custom errors", () => {
    expect(friendlyError({ revert: { name: "NotBride" } })).toBe(
      "Só a carteira da noiva pode responder.",
    );
    expect(friendlyError({ revert: { name: "InvalidStatus" } })).toContain("não está disponível");
  });

  it("translates the couple-assignment errors", () => {
    expect(friendlyError({ revert: { name: "NotDeployer" } })).toContain("deployer");
    expect(friendlyError({ revert: { name: "AlreadySet" } })).toContain("já foi definid");
    expect(friendlyError({ revert: { name: "InvalidCouple" } })).toContain("Endereço");
  });

  it("translates the tribute errors", () => {
    expect(friendlyError({ revert: { name: "NameTooLong" } })).toContain("64");
    expect(friendlyError({ revert: { name: "EmptyTribute" } })).toContain("recado");
    expect(friendlyError({ revert: { name: "TributeNotFound" } })).toContain("não");
  });

  it("truncates anything long and unrecognised", () => {
    const long = friendlyError({ message: "x".repeat(400) });
    expect(long.length).toBe(160);
    expect(long.endsWith("…")).toBe(true);
  });

  it("returns an empty string for no error", () => {
    expect(friendlyError(null)).toBe("");
  });
});
