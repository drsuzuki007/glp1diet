import { describe, expect, it } from "vitest";
import {
  buildEmbedUrl,
  canonicalVimeoUrl,
  durationToMinutes,
  formatDuration,
  normalizeDomain,
  parseEmbedDomains,
  parseVimeoUrl,
} from "./vimeo";
import { entitledVideo } from "./db";

describe("parseVimeoUrl", () => {
  it("公開動画の URL から ID を取り出す", () => {
    expect(parseVimeoUrl("https://vimeo.com/123456789")).toEqual({ id: "123456789", hash: null });
  });

  it("限定公開のハッシュ付き URL を読み取る", () => {
    expect(parseVimeoUrl("https://vimeo.com/123456789/abcdef1234")).toEqual({
      id: "123456789",
      hash: "abcdef1234",
    });
  });

  it("プレーヤーの URL と ?h= を読み取る", () => {
    expect(parseVimeoUrl("https://player.vimeo.com/video/123456789?h=abcdef1234&dnt=1")).toEqual({
      id: "123456789",
      hash: "abcdef1234",
    });
  });

  it("前後の空白とスキームなしを許容する", () => {
    expect(parseVimeoUrl("  vimeo.com/987654321  ")).toEqual({ id: "987654321", hash: null });
  });

  it("動画 ID だけを貼られても受け付ける", () => {
    expect(parseVimeoUrl("123456789")).toEqual({ id: "123456789", hash: null });
  });

  it("Vimeo 以外のドメインは拒否する", () => {
    expect(parseVimeoUrl("https://youtube.com/watch?v=123456789")).toBeNull();
    // 紛らわしいドメインも通さない
    expect(parseVimeoUrl("https://vimeo.com.example.com/123456789")).toBeNull();
  });

  it("解釈できない入力は null", () => {
    expect(parseVimeoUrl("")).toBeNull();
    expect(parseVimeoUrl("https://vimeo.com/channels/staffpicks")).toBeNull();
  });
});

describe("canonicalVimeoUrl", () => {
  it("ハッシュの有無で形を変える", () => {
    expect(canonicalVimeoUrl({ id: "1", hash: null })).toBe("https://vimeo.com/1");
    expect(canonicalVimeoUrl({ id: "1", hash: "abc" })).toBe("https://vimeo.com/1/abc");
  });
});

describe("formatDuration", () => {
  it("1時間未満は m:ss", () => {
    expect(formatDuration(754)).toBe("12:34");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("1時間以上は h:mm:ss", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("値がなければ空文字", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(undefined)).toBe("");
  });
});

describe("durationToMinutes", () => {
  it("秒を分へ丸める", () => {
    expect(durationToMinutes(1800)).toBe(30);
    expect(durationToMinutes(1770)).toBe(30);
  });

  it("短い動画でも 0 分にはしない", () => {
    expect(durationToMinutes(20)).toBe(1);
  });

  it("値がなければ null", () => {
    expect(durationToMinutes(0)).toBeNull();
    expect(durationToMinutes(null)).toBeNull();
  });
});

describe("buildEmbedUrl", () => {
  it("トラッキングを無効にした埋め込み URL を作る", () => {
    const url = buildEmbedUrl("123456789");
    expect(url).toContain("player.vimeo.com/video/123456789");
    expect(url).toContain("dnt=1");
  });

  it("限定公開のハッシュを h= として渡す", () => {
    expect(buildEmbedUrl("123456789", "abcdef")).toContain("h=abcdef");
  });
});

describe("entitledVideo（非会員に動画IDを渡さない）", () => {
  const course = { vimeoId: "123456789", vimeoHash: "abcdef" };

  it("加入者には動画情報を返す", () => {
    expect(entitledVideo(true, course)).toEqual({ vimeoId: "123456789", vimeoHash: "abcdef" });
  });

  it("非加入者には null しか返さない", () => {
    expect(entitledVideo(false, course)).toEqual({ vimeoId: null, vimeoHash: null });
  });

  it("動画が未登録なら加入者でも null", () => {
    expect(entitledVideo(true, { vimeoId: null, vimeoHash: null })).toEqual({ vimeoId: null, vimeoHash: null });
  });

  it("講座が見つからない場合も安全側に倒す", () => {
    expect(entitledVideo(true, undefined)).toEqual({ vimeoId: null, vimeoHash: null });
  });
});

describe("parseEmbedDomains / normalizeDomain", () => {
  it("カンマ区切りを配列にする", () => {
    expect(parseEmbedDomains("glp1.diet,www.glp1.diet")).toEqual(["glp1.diet", "www.glp1.diet"]);
  });

  it("スキーム・パス・空白・大文字を吸収する", () => {
    expect(parseEmbedDomains(" https://GLP1.diet/  , www.glp1.diet/watch ")).toEqual([
      "glp1.diet",
      "www.glp1.diet",
    ]);
  });

  it("重複を取り除く", () => {
    expect(parseEmbedDomains("glp1.diet, glp1.diet")).toEqual(["glp1.diet"]);
  });

  it("未設定なら空配列（＝Vimeo の設定を触らない）", () => {
    expect(parseEmbedDomains("")).toEqual([]);
    expect(parseEmbedDomains(null)).toEqual([]);
    expect(parseEmbedDomains(undefined)).toEqual([]);
  });

  it("ホスト名として不正なものは落とす", () => {
    expect(parseEmbedDomains("localhost, *.glp1.diet, glp1.diet:8080, glp1.diet")).toEqual(["glp1.diet"]);
  });

  it("normalizeDomain は単体でも同じ規則で動く", () => {
    expect(normalizeDomain("HTTPS://Www.GLP1.diet/path")).toBe("www.glp1.diet");
    expect(normalizeDomain("   ")).toBeNull();
  });
});
