import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** نتيجة تحليل نص المخالصة بالذكاء الاصطناعي القانوني. */
export type SettlementAiAnalysis = {
  mentionedRights: string[];
  amounts: { label: string; amount: number }[];
  waivedRights: string[];
  paidRights: string[];
  specialClauses: string[];
  exceptions: string[];
  reviewFlags: string[];
  summary: string;
};

const RIGHT_CODES = [
  "unpaid_salaries",
  "overtime",
  "annual_leave",
  "sick_leave",
  "maternity",
  "eosb",
  "compensation",
  "social_insurance",
  "other",
] as const;

const SYSTEM = `أنت مساعد قانوني متخصص في نظام العمل. تُحلل مستند مخالصة/تسوية عمالية وتستخرج البيانات فقط دون إصدار أحكام.
أعد النتيجة بصيغة JSON فقط بالمفاتيح التالية:
{
 "mentionedRights": [أكواد من: ${RIGHT_CODES.join(", ")}],
 "amounts": [{"label":"وصف المبلغ","amount": رقم}],
 "waivedRights": [أكواد الحقوق التي تنازل عنها العامل صراحة],
 "paidRights": [أكواد الحقوق التي ورد أنها سُددت فعلاً],
 "specialClauses": ["البنود الخاصة"],
 "exceptions": ["الاستثناءات الواردة"],
 "reviewFlags": ["نصوص تحتاج مراجعة قانونية أو تنازلاً عن حقوق آمرة"],
 "summary": "ملخص موجز بالعربية"
}
لا تُضف أي نص خارج JSON.`;

const parseResult = (raw: string): SettlementAiAnalysis => {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const v = JSON.parse(json) as Record<string, unknown>;
  const arr = (x: unknown) =>
    Array.isArray(x) ? x.map((i) => String(i)).filter(Boolean) : ([] as string[]);
  const codes = (x: unknown) =>
    arr(x).filter((c) => (RIGHT_CODES as readonly string[]).includes(c));
  return {
    mentionedRights: codes(v.mentionedRights),
    amounts: Array.isArray(v.amounts)
      ? (v.amounts as Record<string, unknown>[])
          .map((a) => ({ label: String(a.label ?? ""), amount: Number(a.amount) || 0 }))
          .filter((a) => a.label || a.amount)
      : [],
    waivedRights: codes(v.waivedRights),
    paidRights: codes(v.paidRights),
    specialClauses: arr(v.specialClauses),
    exceptions: arr(v.exceptions),
    reviewFlags: arr(v.reviewFlags),
    summary: String(v.summary ?? ""),
  };
};

/** تحليل نص/مستند المخالصة واستخراج الحقوق والمبالغ والبنود. */
export const analyzeSettlementDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        text: z.string().trim().max(20000).optional(),
        filePath: z.string().trim().max(500).optional(),
      })
      .refine((v) => !!v.text || !!v.filePath, "يجب إدخال نص المخالصة أو رفع مستندها")
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<SettlementAiAnalysis> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة التحليل الذكي غير مهيأة حالياً");

    const parts: Record<string, unknown>[] = [
      {
        type: "text",
        text: data.text
          ? `حلل نص المخالصة التالي:\n\n${data.text}`
          : "حلل مستند المخالصة المرفق.",
      },
    ];

    if (data.filePath) {
      const { data: file, error } = await context.supabase.storage
        .from("case-proofs")
        .download(data.filePath);
      if (error || !file) throw new Error("تعذّر قراءة مستند المخالصة");
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.byteLength > 8 * 1024 * 1024)
        throw new Error("حجم المستند كبير جداً للتحليل الذكي (الحد 8 ميجابايت)");
      const mime = file.type || "application/octet-stream";
      const b64 = buf.toString("base64");
      if (mime.startsWith("image/")) {
        parts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
      } else {
        parts.push({
          type: "file",
          file: {
            filename: data.filePath.split("/").pop() ?? "settlement",
            file_data: `data:${mime};base64,${b64}`,
          },
        });
      }
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: parts },
        ],
      }),
    });

    if (res.status === 429) throw new Error("تم تجاوز حد الاستخدام، يرجى المحاولة بعد قليل");
    if (res.status === 402)
      throw new Error("انتهى رصيد خدمة التحليل الذكي، يرجى مراجعة الإدارة");
    if (!res.ok) throw new Error(`تعذّر تحليل المخالصة (${res.status})`);

    const body = (await res.json()) as any;
    const raw: string = body?.choices?.[0]?.message?.content ?? "";
    try {
      return parseResult(raw);
    } catch {
      throw new Error("تعذّر قراءة نتيجة التحليل الذكي، يرجى إعادة المحاولة");
    }
  });
