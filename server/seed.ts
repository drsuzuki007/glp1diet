import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";

const categorySeed = [
  { slug: "glp1-basics", name: "GLP-1の基礎", description: "作用・適応・注意点を教育目的で理解する", sortOrder: 1 },
  { slug: "metabolic-health", name: "代謝と検査値", description: "日々の健診結果を読み解くための基礎", sortOrder: 2 },
  { slug: "food-lifestyle", name: "食事・生活習慣", description: "無理のない継続を支える知識", sortOrder: 3 },
  { slug: "care-prep", name: "受診準備", description: "医療機関との対話に備える", sortOrder: 4 },
];

const doctorSeed = [
  { slug: "risa-okada", name: "岡田 莉沙 医師", specialty: "内分泌・代謝内科", affiliation: "MediVista 医療教育センター", initials: "RO", profile: "内分泌・代謝領域の診療と、一般の方に向けた医療リテラシー教育に携わっています。個別の治療を勧めるのではなく、医師との対話に役立つ基礎知識をわかりやすく整理します。" },
  { slug: "haruto-kamiya", name: "神谷 陽斗 医師", specialty: "糖尿病・生活習慣病内科", affiliation: "MediVista 医療教育センター", initials: "HK", profile: "糖尿病と生活習慣病の診療経験をもとに、日常の選択を支える中立的な医療教育を行っています。自己判断を避け、必要なときに医療機関へ相談するための視点を大切にしています。" },
  { slug: "mio-takase", name: "高瀬 澪 医師", specialty: "総合診療・予防医療", affiliation: "MediVista 医療教育センター", initials: "MT", profile: "予防医療と健康診断後の相談を中心に、生活背景をふまえた情報整理を支援しています。講座では特定の方法を一律に推奨せず、続けやすさを考える視点を紹介します。" },
  { slug: "seiji-nomura", name: "野村 誠司 医師", specialty: "循環器内科", affiliation: "MediVista 医療教育センター", initials: "SN", profile: "循環器疾患の予防と慢性疾患管理に携わっています。検査や治療の情報を受け取る際に、確認したいポイントを一般の方向けに解説します。" },
];

const courseSeed = [
  { slug: "glp1-foundations", category: "glp1-basics", doctor: "risa-okada", title: "GLP-1を学ぶための基礎レッスン", summary: "GLP-1の体内での働きと、医療で話題になる背景を中立的な立場から学ぶ入門講座です。", description: "GLP-1の基本的な役割を、専門用語を補足しながら一般向けに整理します。具体的な治療の選択や薬の変更を指示する内容ではなく、医療機関で相談する際に役立つ基礎知識を扱います。", intendedFor: "GLP-1、糖尿病、体重管理について基礎から学びたい方、ご家族、受診前に情報を整理したい方", learningPoints: "GLP-1の基本的な役割を説明できる|適応と注意点を区別する視点を持つ|自己判断を避ける理由を理解する", referencesText: "日本糖尿病学会『糖尿病治療ガイド』|日本肥満学会『肥満症診療ガイドライン』|厚生労働省 e-ヘルスネット", coiText: "本講座に関して開示すべき利益相反はありません。", price: 2980, durationMinutes: 48, publishedAt: "2026-01-18 00:00:00", reviewedAt: "2026-06-01 00:00:00", thumbnailTheme: "gold", previewLabel: "無料プレビューを再生", isFeatured: true },
  { slug: "lab-values-guide", category: "metabolic-health", doctor: "mio-takase", title: "健康診断の血糖値を読み解く", summary: "血糖値やHbA1cなど、健康診断で目にする数値を一般的な知識として学びます。", description: "健康診断の結果を見たときに、どのような情報を確認するとよいかを解説します。数値の個別評価や診断は行わず、受診時の会話に役立つ基本用語を整理します。", intendedFor: "健康診断の結果を理解したい方、数値の見方を学びたい方、受診前に質問を整理したい方", learningPoints: "血糖値とHbA1cの用語を理解する|経過を確認する意義を知る|医療機関に相談する目安を学ぶ", referencesText: "厚生労働省 e-ヘルスネット|日本糖尿病学会『糖尿病治療ガイド』", coiText: "本講座に関して開示すべき利益相反はありません。", price: 980, durationMinutes: 27, publishedAt: "2026-06-20 00:00:00", reviewedAt: "2026-06-20 00:00:00", thumbnailTheme: "cyan", previewLabel: "無料プレビューを再生", isFeatured: true },
  { slug: "food-habits", category: "food-lifestyle", doctor: "mio-takase", title: "続けやすい食習慣の整え方", summary: "特定の食品を一律に勧めず、日々の食習慣を観察するための視点を紹介します。", description: "食事内容だけでなく、生活リズムや環境にも目を向けながら、続けやすい習慣を考える基礎講座です。個別の食事療法ではなく、相談時の情報整理に役立つ視点を扱います。", intendedFor: "食事習慣を見直したい方、生活リズムを整えたい方、家族の食事を考える方", learningPoints: "食事記録で見るポイントを知る|生活背景と食事の関係を理解する|無理のない小さな変化を考える", referencesText: "厚生労働省 e-ヘルスネット|農林水産省『食生活指針』", coiText: "本講座に関して開示すべき利益相反はありません。", price: 1480, durationMinutes: 36, publishedAt: "2026-07-04 00:00:00", reviewedAt: "2026-07-01 00:00:00", thumbnailTheme: "green", previewLabel: "無料プレビューを再生", isFeatured: true },
  { slug: "movement-routine", category: "food-lifestyle", doctor: "seiji-nomura", title: "日常に取り入れる運動習慣", summary: "身体活動を取り入れる考え方と、安全に始めるための一般的な注意点を紹介します。", description: "運動を始める前に知っておきたい基本的な考え方を学びます。症状や既往歴によって注意が必要な場合があるため、個別の運動処方は行わず、相談につながる情報を扱います。", intendedFor: "日常の活動量を見直したい方、運動を始める準備をしたい方", learningPoints: "身体活動の考え方を学ぶ|安全確認のポイントを知る|継続しやすい目標の立て方を考える", referencesText: "厚生労働省『健康づくりのための身体活動・運動ガイド』", coiText: "本講座に関して開示すべき利益相反はありません。", price: 1480, durationMinutes: 32, publishedAt: "2026-05-26 00:00:00", reviewedAt: "2026-05-20 00:00:00", thumbnailTheme: "teal", previewLabel: "無料プレビューを再生", isFeatured: false },
  { slug: "long-term-routine", category: "food-lifestyle", doctor: "mio-takase", title: "継続のための生活設計", summary: "短期的な結果だけでなく、生活環境や支援体制を含めた長期的な健康管理を考えます。", description: "日常生活の中で変化を続けるために、環境や支援をどのように捉えるかを解説します。個別の結果を保証するものではなく、振り返りの視点を提供します。", intendedFor: "生活習慣の継続に悩む方、取り組みを振り返りたい方", learningPoints: "目標を小さく分ける考え方を知る|環境と支援の役割を理解する|振り返りの視点を持つ", referencesText: "厚生労働省 e-ヘルスネット|WHO 健康増進に関する資料", coiText: "本講座に関して開示すべき利益相反はありません。", price: 2480, durationMinutes: 46, publishedAt: "2026-05-07 00:00:00", reviewedAt: "2026-05-02 00:00:00", thumbnailTheme: "violet", previewLabel: "無料プレビューを再生", isFeatured: false },
  { slug: "medication-literacy", category: "glp1-basics", doctor: "haruto-kamiya", title: "薬物療法を理解するための視点", summary: "薬物療法について、知っておきたい一般的な評価軸と自己判断を避ける重要性を学びます。", description: "薬物療法を検討する際に、医師・薬剤師と確認したい基本的な観点を説明します。薬の開始、変更、中止を促すものではなく、適切な相談につなげるための教育内容です。", intendedFor: "治療について一般的な知識を得たい方、受診時の質問を準備したい方", learningPoints: "治療の目的と経過確認を理解する|副作用等の相談の重要性を知る|自己判断を避ける理由を学ぶ", referencesText: "日本糖尿病学会『糖尿病治療ガイド』|医薬品医療機器総合機構 医薬品情報", coiText: "本講座に関して開示すべき利益相反はありません。", price: 3980, durationMinutes: 58, publishedAt: "2026-04-18 00:00:00", reviewedAt: "2026-04-10 00:00:00", thumbnailTheme: "gold", previewLabel: "無料プレビューを再生", isFeatured: false },
  { slug: "obesity-basics", category: "glp1-basics", doctor: "haruto-kamiya", title: "肥満症の基本を医師と学ぶ", summary: "肥満症という言葉の意味、健康との関係、医療機関へ相談する際の基本事項を整理します。", description: "体重と健康の関係を、医学的な定義と日常生活の視点から一般向けに解説します。個別の診断や減量指示を行わず、医療機関での相談に備える知識を扱います。", intendedFor: "肥満症について基礎から学びたい方、健康相談を検討している方", learningPoints: "肥満症の基本的な考え方を学ぶ|相談時に確認したい情報を整理する|一律の評価を避ける視点を持つ", referencesText: "日本肥満学会『肥満症診療ガイドライン』", coiText: "本講座に関して開示すべき利益相反はありません。", price: 1980, durationMinutes: 34, publishedAt: "2026-03-21 00:00:00", reviewedAt: "2026-03-18 00:00:00", thumbnailTheme: "orange", previewLabel: "無料プレビューを再生", isFeatured: false },
  { slug: "heart-kidney-health", category: "metabolic-health", doctor: "seiji-nomura", title: "代謝と心臓・腎臓の健康", summary: "糖代謝や体重管理と、心臓・腎臓の健康との関連を一般的な知識として学びます。", description: "健康診断や通院の場で話題になりやすい、心臓・腎臓との関連を解説します。症状がある場合は自己判断せず、適切な医療機関へ連絡してください。", intendedFor: "健康診断の結果をきっかけに学びたい方、家族の健康を支えたい方", learningPoints: "臓器の役割を大まかに理解する|定期的な確認の意義を知る|相談時の質問を準備する", referencesText: "日本循環器学会 一般向け資料|日本腎臓学会 一般向け資料", coiText: "本講座に関して開示すべき利益相反はありません。", price: 4980, durationMinutes: 72, publishedAt: "2026-02-14 00:00:00", reviewedAt: "2026-02-10 00:00:00", thumbnailTheme: "blue", previewLabel: "無料プレビューを再生", isFeatured: false },
  { slug: "diabetes-weight", category: "metabolic-health", doctor: "haruto-kamiya", title: "血糖と体重管理の関係", summary: "血糖と体重の関係を、食事・活動・睡眠などの生活背景を含めてやさしく解説します。", description: "血糖と体重に関する一般的な知識を、生活背景とあわせて紹介します。具体的な目標値や治療の選択は個別性が高いため、医療機関で相談してください。", intendedFor: "糖尿病と体重の関係を学びたい方、家族と知識を共有したい方", learningPoints: "生活背景の影響を理解する|医療者との対話に必要な情報を整理する|長期的な視点を持つ", referencesText: "日本糖尿病学会『糖尿病治療ガイド』", coiText: "本講座に関して開示すべき利益相反はありません。", price: 1980, durationMinutes: 41, publishedAt: "2026-01-29 00:00:00", reviewedAt: "2026-01-22 00:00:00", thumbnailTheme: "cyan", previewLabel: "無料プレビューを再生", isFeatured: false },
  { slug: "visit-prep", category: "care-prep", doctor: "risa-okada", title: "受診前に整理したいこと", summary: "医療機関で相談する前に、経過や困りごと、聞きたいことを整理するための講座です。", description: "医療機関に相談する前に、どのような情報をメモしておくと会話に役立つかを紹介します。緊急性のある症状がある場合は、講座の視聴ではなく適切な医療機関へ連絡してください。", intendedFor: "受診を予定している方、質問を整理したい方、ご家族の受診を支える方", learningPoints: "相談目的を言語化する|経過の記録の仕方を学ぶ|受診時に確認したい質問を整理する", referencesText: "厚生労働省 e-ヘルスネット|日本医師会 一般向け資料", coiText: "本講座に関して開示すべき利益相反はありません。", price: 2480, durationMinutes: 44, publishedAt: "2025-12-12 00:00:00", reviewedAt: "2025-12-08 00:00:00", thumbnailTheme: "rose", previewLabel: "無料プレビューを再生", isFeatured: false },
];

export async function ensureCatalogSeed(db: any) {
  const existing = await db.select({ id: schema.categories.id }).from(schema.categories).limit(1);
  if (existing.length > 0) return;

  await db.insert(schema.categories).values(categorySeed);
  await db.insert(schema.doctors).values(doctorSeed);

  const categoryRows = await db.select().from(schema.categories);
  const doctorRows = await db.select().from(schema.doctors);
  const categoryBySlug = new Map<string, number>(categoryRows.map((item: { slug: string; id: number }) => [item.slug, item.id]));
  const doctorBySlug = new Map<string, number>(doctorRows.map((item: { slug: string; id: number }) => [item.slug, item.id]));

  await db.insert(schema.courses).values(courseSeed.map(course => ({
    slug: course.slug,
    categoryId: categoryBySlug.get(course.category)!,
    doctorId: doctorBySlug.get(course.doctor)!,
    title: course.title,
    summary: course.summary,
    description: course.description,
    intendedFor: course.intendedFor,
    learningPoints: course.learningPoints,
    referencesText: course.referencesText,
    coiText: course.coiText,
    price: course.price,
    durationMinutes: course.durationMinutes,
    publishedAt: new Date(course.publishedAt),
    reviewedAt: new Date(course.reviewedAt),
    thumbnailTheme: course.thumbnailTheme,
    previewLabel: course.previewLabel,
    isFeatured: course.isFeatured,
  })));
}

export async function getSeededCourseId(db: any, slug: string) {
  const result = await db.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.slug, slug)).limit(1);
  return result[0]?.id;
}
