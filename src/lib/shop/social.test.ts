import { describe, expect, it } from "vitest";
import { isSocialNetwork, socialUrl } from "./social";

describe("social links", () => {
  it("turns @handles into profile links", () => {
    expect(socialUrl("instagram", "@my105radio")).toBe("https://www.instagram.com/my105radio");
    expect(socialUrl("tiktok", "my105")).toBe("https://www.tiktok.com/@my105");
    expect(socialUrl("youtube", "@my105")).toBe("https://www.youtube.com/@my105");
  });

  it("takes full links and links without https://", () => {
    expect(socialUrl("facebook", "facebook.com/my105")).toBe("https://facebook.com/my105");
    expect(socialUrl("linkedin", "https://www.linkedin.com/company/my105/")).toBe("https://www.linkedin.com/company/my105/");
    expect(socialUrl("whatsapp", "http://wa.me/41790000000")).toBe("https://wa.me/41790000000");
  });

  it("rejects anything that is not a web link", () => {
    expect(socialUrl("instagram", "javascript:alert(1)")).toBeNull();
    expect(socialUrl("linkedin", "my105")).toBeNull();
    expect(socialUrl("x", "")).toBeNull();
    expect(socialUrl("x", "https://user:pw@x.com/a")).toBeNull();
    expect(isSocialNetwork("myspace")).toBe(false);
  });
});
