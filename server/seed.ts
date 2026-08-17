import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";

const categorySeed = [
  { slug: "glp1-basics", name: "GLP-1の基礎", description: "作用・適応・注意点を教育目的で理解する", sortOrder: 1 },
  { slug: "metabolic-health", name: "代謝と検査値", description: "日々の健診結果を読み解くための基礎", sortOrder: 2 },
  { slug: "food-lifestyle", name: "食事・生活習慣", description: "無理のない継続を支える知識", sortOrder: 3 },
  { slug: "care-prep", name: "受診準備", description: "医療機関との対話に備える", sortOrder: 4 },
];

const catalogRowSeed = [
  { slug: "new-releases", name: "新着動画", description: "医学レビュー日と公開日を明示した最新の講座", sortOrder: 1 },
  { slug: "glp1-obesity", name: "肥満症・GLP-1", description: "GLP-1と肥満症を基礎から学ぶ講座", sortOrder: 2 },
  { slug: "diabetes-metabolism", name: "糖尿病・代謝", description: "血糖、健診結果、代謝について理解を深める講座", sortOrder: 3 },
  { slug: "everyday-lifestyle", name: "食事・運動と生活習慣", description: "日常の選択を見直すための生活習慣講座", sortOrder: 4 },
  { slug: "prepare-for-visit", name: "受診前に知っておきたいこと", description: "医療者との対話を準備するための講座", sortOrder: 5 },
];

const catalogRowMembershipSeed: Record<string, string[]> = {
  "new-releases": ["food-habits", "lab-values-guide", "movement-routine", "long-term-routine", "medication-literacy", "obesity-basics", "heart-kidney-health", "diabetes-weight", "glp1-foundations", "visit-prep"],
  "glp1-obesity": ["glp1-foundations", "medication-literacy", "obesity-basics", "diabetes-weight"],
  "diabetes-metabolism": ["lab-values-guide", "diabetes-weight", "heart-kidney-health", "glp1-foundations"],
  "everyday-lifestyle": ["food-habits", "movement-routine", "long-term-routine", "diabetes-weight"],
  "prepare-for-visit": ["visit-prep", "lab-values-guide", "heart-kidney-health", "medication-literacy"],
};

const doctorSeed = [
  { slug: "risa-okada", name: "岡田 莉沙 医師", specialty: "内分泌・代謝内科", affiliation: "glp1.diet 医療教育センター", initials: "RO", profile: "内分泌・代謝領域の診療と、一般の方に向けた医療リテラシー教育に携わっています。個別の治療を勧めるのではなく、医師との対話に役立つ基礎知識をわかりやすく整理します。" },
  { slug: "haruto-kamiya", name: "神谷 陽斗 医師", specialty: "糖尿病・生活習慣病内科", affiliation: "glp1.diet 医療教育センター", initials: "HK", profile: "糖尿病と生活習慣病の診療経験をもとに、日常の選択を支える中立的な医療教育を行っています。自己判断を避け、必要なときに医療機関へ相談するための視点を大切にしています。" },
  { slug: "mio-takase", name: "高瀬 澪 医師", specialty: "総合診療・予防医療", affiliation: "glp1.diet 医療教育センター", initials: "MT", profile: "予防医療と健康診断後の相談を中心に、生活背景をふまえた情報整理を支援しています。講座では特定の方法を一律に推奨せず、続けやすさを考える視点を紹介します。" },
  { slug: "seiji-nomura", name: "野村 誠司 医師", specialty: "循環器内科", affiliation: "glp1.diet 医療教育センター", initials: "SN", profile: "循環器疾患の予防と慢性疾患管理に携わっています。検査や治療の情報を受け取る際に、確認したいポイントを一般の方向けに解説します。" },
];

type CourseReferenceSeed = { label: string; url: string };

type CourseSeed = {
  slug: string;
  category: string;
  doctor: string;
  title: string;
  summary: string;
  description: string;
  intendedFor: string;
  learningPoints: string;
  referencesText: string;
  references: CourseReferenceSeed[];
  coiText: string;
  price: number;
  durationMinutes: number;
  publishedAt: string;
  reviewedAt: string;
  thumbnailTheme: string;
  previewLabel: string;
  isFeatured: boolean;
};

const healthNet = { label: "厚生労働省 e-ヘルスネット", url: "https://kennet.mhlw.go.jp/information/information/" };
const diabetesPublications = { label: "日本糖尿病学会｜刊行物", url: "https://www.jds.or.jp/modules/publication/index.php" };
const diabetesGlossary = { label: "日本糖尿病学会｜糖尿病学用語集", url: "https://www.jds.or.jp/modules/glossary/" };
const obesityAcademic = { label: "日本肥満学会｜学術情報", url: "https://www.jasso.or.jp/contents/Introduction/academic-information.html" };
const foodGuideline = { label: "農林水産省｜食生活指針", url: "https://www.maff.go.jp/j/syokuiku/shishinn.html" };
const activityGuideline = { label: "厚生労働省｜身体活動・運動の推進", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/undou/index.html" };
const activeGuide = { label: "e-ヘルスネット｜アクティブガイド2023", url: "https://kennet.mhlw.go.jp/information/information/exercise/s-00-013.html" };
const cardiologySociety = { label: "日本循環器学会", url: "https://www.j-circ.or.jp/" };
const cardiologyAssociation = { label: "日本循環器協会", url: "https://j-circ-assoc.or.jp/" };

const courseSeed: CourseSeed[] = [
  {
    slug: "glp1-foundations", category: "glp1-basics", doctor: "risa-okada", title: "GLP-1を学ぶための基礎レッスン",
    summary: "GLP-1が体内で担う一般的な役割と、医療で話題になる理由を、受診時の対話に役立つ基礎知識として整理する入門講座です。",
    description: "この講座では、GLP-1という言葉を見聞きしたときに押さえたい基本用語、医療で扱う目的、そして個人差があるため自己判断を避ける理由を、一般の方向けに順序立てて解説します。薬の開始・変更・中止や、個別の体重・血糖値への助言は行いません。視聴後は、気になる情報をそのまま鵜呑みにせず、医療者へ確認したい点を言葉にするための土台をつくれます。",
    intendedFor: "GLP-1、糖尿病、体重管理について基礎から理解したい方、ご家族、受診前に情報を整理したい方",
    learningPoints: "GLP-1に関する基本用語と一般的な役割を説明できる|医療上の適応と見た目だけを目的とする情報を区別する視点を持てる|不安や疑問を医師・薬剤師へ相談する準備ができる",
    referencesText: "日本肥満学会『肥満症治療薬の安全・適正使用に関するステートメント』|日本糖尿病学会『刊行物』|厚生労働省 e-ヘルスネット",
    references: [obesityAcademic, diabetesPublications, healthNet], coiText: "本講座に関して開示すべき利益相反はありません。", price: 2980, durationMinutes: 48, publishedAt: "2026-01-18 00:00:00", reviewedAt: "2026-06-01 00:00:00", thumbnailTheme: "gold", previewLabel: "無料プレビューを再生", isFeatured: true,
  },
  {
    slug: "lab-values-guide", category: "metabolic-health", doctor: "mio-takase", title: "健康診断の血糖値を読み解く",
    summary: "血糖値やHbA1cなど、健康診断で目にする数値の意味を、診断や判定ではなく受診時の会話につなげる一般知識として学ぶ講座です。",
    description: "健康診断の結果を受け取ったときに、血糖値やHbA1cがどのような場面で使われる言葉なのか、過去の結果とあわせて何を確認すると会話がしやすいのかを解説します。数値だけで病気の有無や治療の必要性を判断する内容ではありません。視聴後は、結果票・服薬状況・生活の変化を整理し、受診時に質問したいことを準備できます。",
    intendedFor: "健康診断の血糖関連の結果を理解したい方、数値の見方を学びたい方、受診前に質問を整理したい方",
    learningPoints: "血糖値とHbA1cの基本用語を理解できる|一回の数値だけで自己判断しない理由を説明できる|健診結果を持参して相談する際の確認事項を整理できる",
    referencesText: "日本糖尿病学会『糖尿病学用語集』|日本糖尿病学会『刊行物』|厚生労働省 e-ヘルスネット",
    references: [diabetesGlossary, diabetesPublications, healthNet], coiText: "本講座に関して開示すべき利益相反はありません。", price: 980, durationMinutes: 27, publishedAt: "2026-06-20 00:00:00", reviewedAt: "2026-06-20 00:00:00", thumbnailTheme: "cyan", previewLabel: "無料プレビューを再生", isFeatured: true,
  },
  {
    slug: "food-habits", category: "food-lifestyle", doctor: "mio-takase", title: "続けやすい食習慣の整え方",
    summary: "特定の食品を一律に勧めず、食事・生活リズム・周囲の環境を観察しながら、続けやすい食習慣を考えるための講座です。",
    description: "食べたものだけでなく、食事の時間、空腹の感じ方、忙しさ、家族や職場の環境なども含めて、日々の食習慣を振り返る視点を紹介します。個別の食事療法や減量計画を指示する内容ではありません。視聴後は、変えたいことを一度に増やさず、医療者・管理栄養士に共有しやすい記録や問いを用意できます。",
    intendedFor: "食事習慣を見直したい方、生活リズムを整えたい方、家族の食事を考える方",
    learningPoints: "食事を記録するときに注目する生活背景を知る|食事・睡眠・予定のつながりを振り返れる|無理のない小さな変化を考えるきっかけを得られる",
    referencesText: "農林水産省『食生活指針』|厚生労働省『食生活指針について』|厚生労働省 e-ヘルスネット",
    references: [foodGuideline, { label: "厚生労働省｜食生活指針について", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000128503.html" }, healthNet], coiText: "本講座に関して開示すべき利益相反はありません。", price: 1480, durationMinutes: 36, publishedAt: "2026-07-04 00:00:00", reviewedAt: "2026-07-01 00:00:00", thumbnailTheme: "green", previewLabel: "無料プレビューを再生", isFeatured: true,
  },
  {
    slug: "movement-routine", category: "food-lifestyle", doctor: "seiji-nomura", title: "日常に取り入れる運動習慣",
    summary: "身体活動を日常に取り入れる考え方と、体調や既往歴に応じて医療者へ確認したい安全面の視点を紹介する講座です。",
    description: "運動を始めようと思ったときに、いきなり強度や回数を決めるのではなく、普段の活動量、座っている時間、体調の変化をどう見直すかを解説します。症状・既往歴・治療内容によって注意が必要なため、個別の運動処方は行いません。視聴後は、自分の状況に合う相談先と、始める前に確認したいことを整理できます。",
    intendedFor: "日常の活動量を見直したい方、運動を始める準備をしたい方、家族と安全面を確認したい方",
    learningPoints: "身体活動と運動を考える基本的な視点を知る|体調変化があるときに自己判断を避ける理由を理解する|続けやすい小さな行動を相談する準備ができる",
    referencesText: "厚生労働省『身体活動・運動の推進』|e-ヘルスネット『アクティブガイド2023』",
    references: [activityGuideline, activeGuide], coiText: "本講座に関して開示すべき利益相反はありません。", price: 1480, durationMinutes: 32, publishedAt: "2026-05-26 00:00:00", reviewedAt: "2026-05-20 00:00:00", thumbnailTheme: "teal", previewLabel: "無料プレビューを再生", isFeatured: false,
  },
  {
    slug: "long-term-routine", category: "food-lifestyle", doctor: "mio-takase", title: "継続のための生活設計",
    summary: "短期的な結果だけでなく、生活環境、支援、振り返りの仕組みを含めて、健康に関する取り組みを続ける考え方を学ぶ講座です。",
    description: "習慣を続けるうえで、意思の強さだけに頼らず、予定、食事、移動、支援してくれる人、記録の方法をどう整えるかを考えます。特定の結果を保証したり、治療を代替したりする内容ではありません。視聴後は、取り組みが途切れたときにも振り返れるよう、無理のない目標と相談したい課題を整理できます。",
    intendedFor: "生活習慣の継続に悩む方、取り組みを振り返りたい方、ご家族と支え方を考えたい方",
    learningPoints: "大きな目標を小さな行動に分ける考え方を知る|環境と支援が継続に関わることを理解する|振り返りを医療者との対話に活かす準備ができる",
    referencesText: "厚生労働省 e-ヘルスネット|農林水産省『食生活指針』|厚生労働省『身体活動・運動の推進』",
    references: [healthNet, foodGuideline, activityGuideline], coiText: "本講座に関して開示すべき利益相反はありません。", price: 2480, durationMinutes: 46, publishedAt: "2026-05-07 00:00:00", reviewedAt: "2026-05-02 00:00:00", thumbnailTheme: "violet", previewLabel: "無料プレビューを再生", isFeatured: false,
  },
  {
    slug: "medication-literacy", category: "glp1-basics", doctor: "haruto-kamiya", title: "薬物療法を理解するための視点",
    summary: "薬物療法について、目的・経過確認・気になる症状の伝え方を理解し、開始・変更・中止を自己判断しないための視点を学ぶ講座です。",
    description: "治療に関する情報を受け取ったときに、何のために使うのか、どのような変化や困りごとを共有するのか、誰に相談するのかを整理します。特定の薬を勧める内容や、服薬の開始・変更・中止を促す内容ではありません。視聴後は、医師・薬剤師へ伝えるためのメモをつくり、確認すべき質問を準備できます。",
    intendedFor: "治療について一般的な知識を得たい方、受診時の質問を準備したい方、ご家族の相談を支えたい方",
    learningPoints: "治療の目的と経過確認を分けて考えられる|気になる症状や生活上の変化を共有する重要性を理解する|薬を自己判断で扱わず相談する理由を説明できる",
    referencesText: "日本肥満学会『肥満症治療薬の安全・適正使用に関するステートメント』|日本糖尿病学会『刊行物』",
    references: [obesityAcademic, diabetesPublications], coiText: "本講座に関して開示すべき利益相反はありません。", price: 3980, durationMinutes: 58, publishedAt: "2026-04-18 00:00:00", reviewedAt: "2026-04-10 00:00:00", thumbnailTheme: "gold", previewLabel: "無料プレビューを再生", isFeatured: false,
  },
  {
    slug: "obesity-basics", category: "glp1-basics", doctor: "haruto-kamiya", title: "肥満症の基本を医師と学ぶ",
    summary: "肥満症という言葉の考え方、体格だけで一律に判断しない理由、医療機関へ相談するときに整理したい情報を学ぶ講座です。",
    description: "体重と健康の関係を、医学的な用語と日常生活の困りごとの両方から一般向けに整理します。見た目や数値だけで自分や他人を評価すること、個別の診断や減量方法を決めることを目的とした講座ではありません。視聴後は、健康への影響や生活上の困りごとを含め、受診時に何を伝えたいかを考えられます。",
    intendedFor: "肥満症について基礎から学びたい方、健康相談を検討している方、ご家族と理解を共有したい方",
    learningPoints: "肥満と肥満症を区別する基本的な考え方を知る|体格だけで一律に評価しない視点を持つ|相談時に確認したい健康・生活上の情報を整理できる",
    referencesText: "日本肥満学会『学術情報』|日本糖尿病学会『刊行物』",
    references: [obesityAcademic, diabetesPublications], coiText: "本講座に関して開示すべき利益相反はありません。", price: 1980, durationMinutes: 34, publishedAt: "2026-03-21 00:00:00", reviewedAt: "2026-03-18 00:00:00", thumbnailTheme: "orange", previewLabel: "無料プレビューを再生", isFeatured: false,
  },
  {
    slug: "heart-kidney-health", category: "metabolic-health", doctor: "seiji-nomura", title: "代謝と心臓・腎臓の健康",
    summary: "糖代謝や体重管理の話題と、心臓・腎臓の健康が受診場面でどのように関連して語られるかを、一般知識として整理する講座です。",
    description: "健康診断や通院で耳にしやすい心臓・腎臓の役割と、検査結果や生活の変化を継続して確認する意義を紹介します。息苦しさ、胸の痛み、急なむくみなど気になる症状がある場合に、動画で様子を見ることを勧めるものではありません。視聴後は、症状・既往歴・検査結果を医療機関に伝え、質問を整理する視点を得られます。",
    intendedFor: "健康診断の結果をきっかけに学びたい方、家族の健康を支えたい方、検査について質問を準備したい方",
    learningPoints: "心臓・腎臓が健康確認で話題になる背景を大まかに理解する|定期的な確認と症状の共有の意義を知る|相談時に確認したい項目を整理できる",
    referencesText: "日本循環器学会|日本循環器協会|日本糖尿病学会『刊行物』",
    references: [cardiologySociety, cardiologyAssociation, diabetesPublications], coiText: "本講座に関して開示すべき利益相反はありません。", price: 4980, durationMinutes: 72, publishedAt: "2026-02-14 00:00:00", reviewedAt: "2026-02-10 00:00:00", thumbnailTheme: "blue", previewLabel: "無料プレビューを再生", isFeatured: false,
  },
  {
    slug: "diabetes-weight", category: "metabolic-health", doctor: "haruto-kamiya", title: "血糖と体重管理の関係",
    summary: "血糖と体重を、食事・活動・睡眠・治療などの生活背景とあわせて捉え、医療者との対話に活かすための一般向け講座です。",
    description: "血糖と体重に関する話題を、単一の数字や方法だけで考えず、生活の変化、健康診断、治療中のこと、困りごととあわせて整理する視点を紹介します。具体的な目標値や治療の選択は、体調や検査結果によって異なるため扱いません。視聴後は、継続して確認したい変化と、受診時に相談したいことを言葉にできます。",
    intendedFor: "糖尿病と体重の関係を学びたい方、健診結果をきっかけに生活を振り返りたい方、家族と知識を共有したい方",
    learningPoints: "血糖と体重に生活背景が関わることを理解する|単一の数値だけで自己判断しない視点を持つ|医療者との対話に必要な情報を整理できる",
    referencesText: "日本糖尿病学会『刊行物』|日本肥満学会『学術情報』|厚生労働省 e-ヘルスネット",
    references: [diabetesPublications, obesityAcademic, healthNet], coiText: "本講座に関して開示すべき利益相反はありません。", price: 1980, durationMinutes: 41, publishedAt: "2026-01-29 00:00:00", reviewedAt: "2026-01-22 00:00:00", thumbnailTheme: "cyan", previewLabel: "無料プレビューを再生", isFeatured: false,
  },
  {
    slug: "visit-prep", category: "care-prep", doctor: "risa-okada", title: "受診前に整理したいこと",
    summary: "医療機関で相談する前に、経過・困りごと・服薬や生活の変化・聞きたいことを整理し、限られた診察時間の対話に備える講座です。",
    description: "受診の目的を短い言葉で伝える方法、症状や生活の変化を時系列でメモする考え方、質問を優先順位づける方法を紹介します。個別の診断、緊急度の判定、受診先の決定を行う講座ではありません。視聴後は、持参したい情報と質問をまとめ、医療者に相談するための準備ができます。緊急性が疑われる症状がある場合は、講座の視聴より先に適切な医療機関へ連絡してください。",
    intendedFor: "受診を予定している方、質問を整理したい方、ご家族の受診を支える方",
    learningPoints: "相談目的を短く言語化する方法を知る|経過や生活の変化を記録する視点を学ぶ|診察で確認したい質問の優先順位を整理できる",
    referencesText: "厚生労働省 e-ヘルスネット|日本医師会『みんなの医療』",
    references: [healthNet, { label: "日本医師会｜みんなの医療", url: "https://www.med.or.jp/people/" }], coiText: "本講座に関して開示すべき利益相反はありません。", price: 2480, durationMinutes: 44, publishedAt: "2025-12-12 00:00:00", reviewedAt: "2025-12-08 00:00:00", thumbnailTheme: "rose", previewLabel: "無料プレビューを再生", isFeatured: false,
  },
];

let catalogSeedPromise: Promise<void> | null = null;

export async function ensureCatalogSeed(db: any) {
  if (!catalogSeedPromise) catalogSeedPromise = syncCatalogSeed(db);
  return catalogSeedPromise;
}

async function syncCatalogSeed(db: any) {
  const existingCategories = await db.select({ slug: schema.categories.slug }).from(schema.categories);
  if (existingCategories.length === 0) await db.insert(schema.categories).values(categorySeed);

  const existingDoctors = await db.select({ slug: schema.doctors.slug }).from(schema.doctors);
  if (existingDoctors.length === 0) await db.insert(schema.doctors).values(doctorSeed);

  const categoryRows = await db.select().from(schema.categories);
  const doctorRows = await db.select().from(schema.doctors);
  const categoryBySlug = new Map<string, number>(categoryRows.map((item: { slug: string; id: number }) => [item.slug, item.id]));
  const doctorBySlug = new Map<string, number>(doctorRows.map((item: { slug: string; id: number }) => [item.slug, item.id]));

  for (const course of courseSeed) {
    const values = {
      categoryId: categoryBySlug.get(course.category)!, doctorId: doctorBySlug.get(course.doctor)!, title: course.title,
      summary: course.summary, description: course.description, intendedFor: course.intendedFor, learningPoints: course.learningPoints,
      referencesText: course.referencesText, coiText: course.coiText, price: course.price, durationMinutes: course.durationMinutes,
      publishedAt: new Date(course.publishedAt), reviewedAt: new Date(course.reviewedAt), thumbnailTheme: course.thumbnailTheme,
      previewLabel: course.previewLabel, isFeatured: course.isFeatured,
    };
    const existing = await db.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.slug, course.slug)).limit(1);
    if (existing[0]) await db.update(schema.courses).set(values).where(eq(schema.courses.id, existing[0].id));
    else await db.insert(schema.courses).values({ slug: course.slug, ...values });
  }

  const courseRows = await db.select({ id: schema.courses.id, slug: schema.courses.slug }).from(schema.courses);
  const courseIdBySlug = new Map<string, number>(courseRows.map((item: { slug: string; id: number }) => [item.slug, item.id]));
  for (const course of courseSeed) {
    const courseId = courseIdBySlug.get(course.slug)!;
    await db.delete(schema.courseReferenceLinks).where(eq(schema.courseReferenceLinks.courseId, courseId));
    await db.insert(schema.courseReferenceLinks).values(course.references.map((reference, index) => ({
      courseId, label: reference.label, url: reference.url, sortOrder: index + 1,
    })));
  }

  const existingRows = await db.select({ id: schema.catalogRows.id }).from(schema.catalogRows);
  if (existingRows.length === 0) await db.insert(schema.catalogRows).values(catalogRowSeed);

  const existingMemberships = await db.select({ id: schema.courseCatalogRows.id }).from(schema.courseCatalogRows);
  if (existingMemberships.length === 0) {
    const rows = await db.select({ id: schema.catalogRows.id, slug: schema.catalogRows.slug }).from(schema.catalogRows);
    const rowIdBySlug = new Map<string, number>(rows.map((item: { slug: string; id: number }) => [item.slug, item.id]));
    const memberships = Object.entries(catalogRowMembershipSeed).flatMap(([rowSlug, courseSlugs]) => courseSlugs.map((courseSlug, index) => ({
      rowId: rowIdBySlug.get(rowSlug)!, courseId: courseIdBySlug.get(courseSlug)!, sortOrder: index + 1,
    })));
    await db.insert(schema.courseCatalogRows).values(memberships);
  }
}

export async function getSeededCourseId(db: any, slug: string) {
  const result = await db.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.slug, slug)).limit(1);
  return result[0]?.id;
}
