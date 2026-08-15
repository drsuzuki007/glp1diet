import { describe, expect, it } from "vitest";
import { courseReferenceLinksSchema } from "./routers";

const links = [
  { label: "厚生労働省 e-ヘルスネット", url: "https://kennet.mhlw.go.jp/information/information/" },
  { label: "日本糖尿病学会", url: "https://www.jds.or.jp/modules/publication/index.php" },
  { label: "日本肥満学会", url: "https://www.jasso.or.jp/contents/Introduction/academic-information.html" },
];

describe("courseReferenceLinksSchema", () => {
  it("accepts up to three distinct https reference links", () => {
    expect(courseReferenceLinksSchema.parse(links)).toEqual(links);
  });

  it("rejects a fourth reference link", () => {
    expect(() => courseReferenceLinksSchema.parse([...links, { label: "農林水産省", url: "https://www.maff.go.jp/j/syokuiku/shishinn.html" }])).toThrow("最大3件");
  });

  it("rejects duplicate and non-https URLs", () => {
    expect(() => courseReferenceLinksSchema.parse([links[0], { label: "重複", url: links[0]!.url }])).toThrow("重複");
    expect(() => courseReferenceLinksSchema.parse([{ label: "安全でないURL", url: "http://example.test/reference" }])).toThrow("https");
  });
});
