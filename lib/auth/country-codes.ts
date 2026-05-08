export interface DialCodeOption {
  countryCode: string;
  label: string;
  dialCode: string;
}

export const DEFAULT_DIAL_CODE = "+66";

export const DIAL_CODE_OPTIONS: DialCodeOption[] = [
  { countryCode: "TH", label: "Thailand", dialCode: "+66" },
  { countryCode: "US", label: "United States", dialCode: "+1" },
  { countryCode: "CN", label: "China", dialCode: "+86" },
  { countryCode: "HK", label: "Hong Kong", dialCode: "+852" },
  { countryCode: "SG", label: "Singapore", dialCode: "+65" },
  { countryCode: "MY", label: "Malaysia", dialCode: "+60" },
  { countryCode: "VN", label: "Vietnam", dialCode: "+84" },
  { countryCode: "KH", label: "Cambodia", dialCode: "+855" },
  { countryCode: "LA", label: "Laos", dialCode: "+856" },
  { countryCode: "MM", label: "Myanmar", dialCode: "+95" },
  { countryCode: "AU", label: "Australia", dialCode: "+61" },
  { countryCode: "GB", label: "United Kingdom", dialCode: "+44" },
  { countryCode: "JP", label: "Japan", dialCode: "+81" },
  { countryCode: "KR", label: "South Korea", dialCode: "+82" },
  { countryCode: "IN", label: "India", dialCode: "+91" },
];

export function getDialCodeForCountry(countryCode?: string | null) {
  if (!countryCode) {
    return DEFAULT_DIAL_CODE;
  }

  return DIAL_CODE_OPTIONS.find((option) => option.countryCode === countryCode.toUpperCase())?.dialCode ?? DEFAULT_DIAL_CODE;
}
