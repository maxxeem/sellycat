import { describe, expect, it } from "vitest";
import { billingLines, cleanBilling, normaliseIban } from "./billing";

describe("partner billing", () => {
  it("checks and groups IBANs", () => {
    expect(normaliseIban("ch9300762011623852957")).toBe("CH93 0076 2011 6238 5295 7");
    expect(normaliseIban("DE89 3704 0044 0532 0130 00")).toBe("DE89 3704 0044 0532 0130 00");
    expect(normaliseIban("CH93 0076 2011 6238 5295 8")).toBeNull();
    expect(normaliseIban("hello")).toBeNull();
  });

  it("cleans the form and flags a wrong IBAN", () => {
    expect(cleanBilling({ legal_name: " Pizza AG ", country: "ch", iban: "CH9300762011623852957", vat_no: "" })).toEqual({
      billing: { legal_name: "Pizza AG", country: "CH", iban: "CH93 0076 2011 6238 5295 7" },
      ibanInvalid: false,
    });
    expect(cleanBilling({ iban: "CH00 1234" }).ibanInvalid).toBe(true);
  });

  it("builds address lines", () => {
    expect(billingLines("Pizzeria", { street: "Weg 1", zip: "3000", city: "Bern", country: "CH" })).toEqual(["Pizzeria", "Weg 1", "3000 Bern"]);
    expect(billingLines("X", { legal_name: "X GmbH", country: "DE" })).toEqual(["X GmbH", "DE"]);
  });
});

describe("settlement period", () => {
  it("defaults to the end of the previous month", async () => {
    const { lastMonthEnd, isDay, periodText } = await import("./period");
    expect(lastMonthEnd("2026-12-01")).toBe("2026-11-30");
    expect(lastMonthEnd("2026-03-15")).toBe("2026-02-28");
    expect(lastMonthEnd("2026-01-10")).toBe("2025-12-31");
    expect(isDay("2026-02-30")).toBe(true);
    expect(isDay("x")).toBe(false);
    expect(periodText("2026-11-01", "2026-11-30", "de")).toBe("1. November 2026 – 30. November 2026");
  });
});
