import { Currency } from "@prisma/client";

export function formatCurrency(
  amount: number,
  currency: Currency | string = "INR",
  locale: string = "en-IN"
): string {
  const currencyMap: Record<string, string> = {
    INR: "INR",
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP",
    JPY: "JPY",
    AUD: "AUD",
    CAD: "CAD",
    CHF: "CHF",
    CNY: "CNY",
    HKD: "HKD",
    NZD: "NZD",
    SEK: "SEK",
    SGD: "SGD",
    THB: "THB",
    TRY: "TRY",
    ZAR: "ZAR",
  };

  const localeMap: Record<string, string> = {
    INR: "en-IN",
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    JPY: "ja-JP",
    AUD: "en-AU",
    CAD: "en-CA",
    CHF: "de-CH",
    CNY: "zh-CN",
    HKD: "zh-HK",
    NZD: "en-NZ",
    SEK: "sv-SE",
    SGD: "en-SG",
    THB: "th-TH",
    TRY: "tr-TR",
    ZAR: "en-ZA",
  };

  const currencyStr = currency.toString();

  try {
    return new Intl.NumberFormat(localeMap[currencyStr] || locale, {
      style: "currency",
      currency: currencyMap[currencyStr] || currencyStr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currencyStr} ${amount.toFixed(2)}`;
  }
}

export function getCurrencySymbol(currency: Currency | string): string {
  const symbolMap: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CAD: "C$",
    CHF: "CHF",
    CNY: "¥",
    HKD: "HK$",
    NZD: "NZ$",
    SEK: "kr",
    SGD: "S$",
    THB: "฿",
    TRY: "₺",
    ZAR: "R",
  };

  const currencyStr = currency.toString();
  return symbolMap[currencyStr] || currencyStr;
}

export function getCurrencyOptions(): { value: Currency; label: string }[] {
  return [
    { value: "INR", label: "Indian Rupee (₹)" },
    { value: "USD", label: "US Dollar ($)" },
    { value: "EUR", label: "Euro (€)" },
    { value: "GBP", label: "British Pound (£)" },
    { value: "JPY", label: "Japanese Yen (¥)" },
    { value: "AUD", label: "Australian Dollar (A$)" },
    { value: "CAD", label: "Canadian Dollar (C$)" },
    { value: "CHF", label: "Swiss Franc (CHF)" },
    { value: "CNY", label: "Chinese Yuan (¥)" },
    { value: "HKD", label: "Hong Kong Dollar (HK$)" },
    { value: "NZD", label: "New Zealand Dollar (NZ$)" },
    { value: "SEK", label: "Swedish Krona (kr)" },
    { value: "SGD", label: "Singapore Dollar (S$)" },
    { value: "THB", label: "Thai Baht (฿)" },
    { value: "TRY", label: "Turkish Lira (₺)" },
    { value: "ZAR", label: "South African Rand (R)" },
  ];
}

export function parseCurrencyAmount(amountString: string): number {
  // Remove currency symbols and commas, then parse
  const cleaned = amountString.replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
