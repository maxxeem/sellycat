import { describe, expect, it } from "vitest";
import { csvDate, csvMoney, toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes, neutralises formulas and adds the BOM", () => {
    const csv = toCsv([["Code", "Name"], ["A;B", 'Sa "x"'], ["=SUM(A1)", null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿Code;Name\r\n"A;B";"Sa ""x"""\r\n\'=SUM(A1);\r\n');
  });
  it("formats money and Zurich time", () => {
    expect(csvMoney(1250)).toBe("12.50");
    expect(csvMoney(null)).toBe("");
    expect(csvDate("2026-11-19T13:05:00Z")).toBe("2026-11-19 14:05");
  });
});
