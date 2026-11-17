import { describe, expect, it } from "vitest";
import { parseScan } from "./scan";

describe("parseScan", () => {
  const token = "Ab3dEf6hIj9kLm2nOp5qRs8t";
  it("reads the token from a check link", () => {
    expect(parseScan(`https://deals.example.ch/v/${token}`)).toEqual({ kind: "token", token });
    expect(parseScan(`https://x.sellycat.com/v/${token}?utm=1`)).toEqual({ kind: "token", token });
  });
  it("takes a bare token", () => {
    expect(parseScan(token)).toEqual({ kind: "token", token });
  });
  it("treats readable codes and barcodes as codes", () => {
    expect(parseScan(" K7MQ-4XPA-92HD ")).toEqual({ kind: "code", code: "K7MQ-4XPA-92HD" });
    expect(parseScan("2001234567893")).toEqual({ kind: "code", code: "2001234567893" });
    expect(parseScan("k7mq4xpa92hd")).toEqual({ kind: "code", code: "k7mq4xpa92hd" });
  });
  it("ignores empty input", () => {
    expect(parseScan("  ")).toEqual({ kind: "empty" });
  });
});
