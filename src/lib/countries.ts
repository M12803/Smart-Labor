import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Country = {
  code: string;
  name_ar: string;
  name_en: string;
  flag: string;
  currency: string;
  engine: string;
  calculator_path: string;
  description_ar: string | null;
  description_en: string | null;
  sort_order: number;
};

const STORAGE_KEY = "slc.country";

export const DEFAULT_COUNTRIES: Country[] = [
  {
    code: "SA",
    name_ar: "المملكة العربية السعودية",
    name_en: "Kingdom of Saudi Arabia",
    flag: "🇸🇦",
    currency: "SAR",
    engine: "saudi_v1",
    calculator_path: "/sa/calculator",
    description_ar: "حساب الحقوق العمالية ومكافأة نهاية الخدمة وفق نظام العمل السعودي واللوائح التنفيذية.",
    description_en: "Labor rights and EOSB calculation under Saudi Labor Law.",
    sort_order: 1,
  },
  {
    code: "YE",
    name_ar: "الجمهورية اليمنية",
    name_en: "Republic of Yemen",
    flag: "🇾🇪",
    currency: "YER",
    engine: "yemen_v1",
    calculator_path: "/calculator",
    description_ar: "حساب مستحقات العمال ومكافأة نهاية الخدمة وفق قانون العمل اليمني رقم 5 لسنة 1995م.",
    description_en: "Labor rights and EOSB calculation under Yemeni Labor Law No. 5 of 1995.",
    sort_order: 2,
  },
];

export function getStoredCountry(): string | null {
  if (typeof window === "undefined") return "YE";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v || "YE";
  } catch {
    return "YE";
  }
}

export function setStoredCountry(code: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage unavailable */
  }
}

/** الدول المفعّلة — تُدار بالكامل من لوحة التحكم مع توفر افتراضي أوفلاين */
export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async (): Promise<Country[]> => {
      try {
        const { data, error } = await supabase
          .from("countries")
          .select(
            "code,name_ar,name_en,flag,currency,engine,calculator_path,description_ar,description_en,sort_order",
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (error || !data || data.length === 0) return DEFAULT_COUNTRIES;
        return data as Country[];
      } catch {
        return DEFAULT_COUNTRIES;
      }
    },
    initialData: DEFAULT_COUNTRIES,
    staleTime: 5 * 60_000,
  });
}

/** الدولة المختارة في الجلسة الحالية (تُحفظ محلياً حتى يغيّرها المستخدم) */
export function useSelectedCountry() {
  const [code, setCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCode(getStoredCountry());
    setReady(true);
  }, []);

  const select = useCallback((next: string) => {
    setStoredCountry(next);
    setCode(next);
  }, []);

  return { code, ready, select };
}
