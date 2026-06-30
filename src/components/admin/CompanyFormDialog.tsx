"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getCountries, getCountryCallingCode } from "react-phone-number-input/input";
import en from "react-phone-number-input/locale/en.json";
import {
  getExampleNumber,
  AsYouType,
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from "libphonenumber-js";
import { Country, State, City } from "country-state-city";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const phoneExamples = require("libphonenumber-js/examples.mobile.json");

// ── Phone helpers ──────────────────────────────────────────────────────────────
const phoneCountryNames = en as Record<string, string>;
const PRIORITY: CountryCode[] = ["US", "GB", "CA", "AU", "PH"];
const allPhoneCountries = getCountries()
  .map((code) => ({ code: code as CountryCode, name: phoneCountryNames[code] ?? code, dial: getCountryCallingCode(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));
const priorityPhoneCountries = PRIORITY.map((c) => allPhoneCountries.find((x) => x.code === c)).filter(Boolean) as typeof allPhoneCountries;
const otherPhoneCountries = allPhoneCountries.filter((c) => !PRIORITY.includes(c.code));

function getPlaceholder(country: CountryCode): string {
  try {
    const example = getExampleNumber(country, phoneExamples);
    if (!example) return "Phone number";
    const national = example.formatNational();
    if (national.startsWith("0")) {
      const code = getCountryCallingCode(country);
      return example.formatInternational().replace(`+${code} `, "");
    }
    return national;
  } catch { return "Phone number"; }
}

function hasTrunkPrefix(country: CountryCode): boolean {
  try { return getExampleNumber(country, phoneExamples)?.formatNational().startsWith("0") ?? false; }
  catch { return false; }
}

function formatPhoneInput(rawInput: string, country: CountryCode): string {
  try {
    const digits = rawInput.replace(/\D/g, "");
    if (!digits) return "";
    if (hasTrunkPrefix(country)) {
      const prefixed = digits.startsWith("0") ? digits : "0" + digits;
      const formatted = new AsYouType(country).input(prefixed);
      return formatted.startsWith("0") ? formatted.slice(1).trimStart() : formatted;
    }
    return new AsYouType(country).input(digits);
  } catch { return rawInput; }
}

function validatePhone(phoneInput: string, country: CountryCode): boolean {
  try {
    const digits = phoneInput.replace(/\D/g, "");
    if (!digits) return false;
    if (hasTrunkPrefix(country)) {
      const prefixed = digits.startsWith("0") ? digits : "0" + digits;
      return isValidPhoneNumber(prefixed, country);
    }
    return isValidPhoneNumber(phoneInput, country);
  } catch { return false; }
}

function parseToE164(phoneInput: string, country: CountryCode): string {
  try {
    const digits = phoneInput.replace(/\D/g, "");
    const toParse = hasTrunkPrefix(country) && !digits.startsWith("0") ? "0" + digits : phoneInput;
    const parsed = parsePhoneNumber(toParse, country);
    return parsed?.formatInternational() ?? `+${getCountryCallingCode(country)} ${digits}`;
  } catch { return `+${getCountryCallingCode(country)} ${phoneInput.replace(/\D/g, "")}`; }
}

// ── Location data ──────────────────────────────────────────────────────────────
const allCountries = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name));

interface Company {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
}

interface Props {
  children: React.ReactNode;
  company?: Company;
}

const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectClass = (disabled: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white${disabled ? " opacity-50 cursor-not-allowed" : ""}`;

export default function CompanyFormDialog({ children, company }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Phone state
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("US");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Location state (ISO codes internally, names stored to DB)
  const [selectedCountry, setSelectedCountry] = useState("");   // isoCode e.g. "US"
  const [selectedState, setSelectedState]     = useState("");   // isoCode e.g. "CA"
  const [selectedCity, setSelectedCity]       = useState("");   // name e.g. "Los Angeles"

  const [postalCode, setPostalCode] = useState(company?.postalCode ?? "");

  // Derived lists
  const stateOptions = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
  const cityOptions = (() => {
    if (!selectedCountry) return [];
    if (stateOptions.length > 0) {
      if (!selectedState) return [];
      return City.getCitiesOfState(selectedCountry, selectedState);
    }
    return City.getCitiesOfCountry(selectedCountry) ?? [];
  })();

  // Reset controlled fields whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setPhoneError("");
    setPhoneTouched(false);

    // Phone
    if (company?.phone) {
      try {
        const parsed = parsePhoneNumber(company.phone);
        if (parsed?.country) {
          const c = parsed.country as CountryCode;
          setPhoneCountry(c);
          setPhoneInput(formatPhoneInput(parsed.nationalNumber, c));
        } else {
          setPhoneCountry("US");
          setPhoneInput(company.phone);
        }
      } catch {
        setPhoneCountry("US");
        setPhoneInput(company.phone ?? "");
      }
    } else {
      setPhoneCountry("US");
      setPhoneInput("");
    }

    // Country — stored value may be a name ("Philippines") or isoCode ("PH")
    if (company?.country) {
      const found = allCountries.find(
        (c) => c.isoCode === company.country || c.name === company.country
      );
      const isoCode = found?.isoCode ?? "";
      setSelectedCountry(isoCode);

      // State
      if (company.state && isoCode) {
        const states = State.getStatesOfCountry(isoCode);
        const foundState = states.find(
          (s) => s.isoCode === company.state || s.name === company.state
        );
        setSelectedState(foundState?.isoCode ?? "");
      } else {
        setSelectedState("");
      }
    } else {
      setSelectedCountry("");
      setSelectedState("");
    }

    setSelectedCity(company?.city ?? "");
    setPostalCode(company?.postalCode ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleCountryChange(isoCode: string) {
    setSelectedCountry(isoCode);
    setSelectedState("");
    setSelectedCity("");
  }

  function handleStateChange(stateCode: string) {
    setSelectedState(stateCode);
    setSelectedCity("");
  }

  function handlePhoneChange(value: string) {
    const formatted = formatPhoneInput(value, phoneCountry);
    setPhoneInput(formatted);
    if (phoneTouched && formatted) {
      setPhoneError(validatePhone(formatted, phoneCountry) ? "" : `Invalid format. Example: ${getPlaceholder(phoneCountry)}`);
    } else {
      setPhoneError("");
    }
  }

  function handlePhoneBlur() {
    setPhoneTouched(true);
    if (!phoneInput) { setPhoneError(""); return; }
    setPhoneError(validatePhone(phoneInput, phoneCountry) ? "" : `Invalid format. Example: ${getPlaceholder(phoneCountry)}`);
  }

  function handlePhoneCountryChange(code: CountryCode) {
    setPhoneCountry(code);
    setPhoneInput("");
    setPhoneError("");
    setPhoneTouched(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (phoneInput.trim() && !validatePhone(phoneInput, phoneCountry)) {
      setPhoneTouched(true);
      setPhoneError(`Invalid format. Example: ${getPlaceholder(phoneCountry)}`);
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string | null> = {};

    // Only include non-empty text fields from FormData
    fd.forEach((v, k) => {
      const val = String(v).trim();
      if (val) data[k] = val;
    });

    // Phone (controlled)
    if (phoneInput.trim()) {
      data.phone = parseToE164(phoneInput, phoneCountry);
    } else {
      data.phone = null;
    }

    // Country → store the full name
    if (selectedCountry) {
      const countryObj = allCountries.find((c) => c.isoCode === selectedCountry);
      data.country = countryObj?.name ?? selectedCountry;
    } else {
      data.country = null;
    }

    // State → store the full name
    if (selectedState) {
      const stateObj = State.getStatesOfCountry(selectedCountry).find((s) => s.isoCode === selectedState);
      data.state = stateObj?.name ?? selectedState;
    } else {
      data.state = null;
    }

    // City → already a name
    data.city = selectedCity || null;

    const url = company ? `/api/crm/companies/${company.id}` : "/api/crm/companies";
    const method = company ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);

    if (!res.ok) {
      toast.error("Failed to save company");
      return;
    }

    toast.success(company ? "Company updated" : "Company created");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{company ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">

              {/* Company Name */}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Company Name *</label>
                <input
                  name="name"
                  required
                  defaultValue={company?.name ?? ""}
                  placeholder="Acme Corp Inc."
                  className={inputClass}
                />
              </div>

              {/* Website */}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Website</label>
                <input
                  name="website"
                  defaultValue={company?.website ?? ""}
                  placeholder="acmecorp.com"
                  className={inputClass}
                />
              </div>

              {/* Phone with country dropdown */}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                <div className="flex gap-2">
                  <select
                    value={phoneCountry}
                    onChange={(e) => handlePhoneCountryChange(e.target.value as CountryCode)}
                    className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-44 shrink-0"
                  >
                    <optgroup label="Common">
                      {priorityPhoneCountries.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} (+{c.dial})</option>
                      ))}
                    </optgroup>
                    <optgroup label="All countries">
                      {otherPhoneCountries.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} (+{c.dial})</option>
                      ))}
                    </optgroup>
                  </select>
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={handlePhoneBlur}
                      placeholder={getPlaceholder(phoneCountry)}
                      className={inputClass}
                    />
                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Address</label>
                <input
                  name="address"
                  defaultValue={company?.address ?? ""}
                  placeholder="123 Guyabano St."
                  className={inputClass}
                />
              </div>

              {/* Country */}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Country</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className={selectClass(false)}
                >
                  <option value="">— Select Country —</option>
                  {allCountries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* State / Province */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">State / Province</label>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={!selectedCountry || stateOptions.length === 0}
                  className={selectClass(!selectedCountry || stateOptions.length === 0)}
                >
                  <option value="">
                    {!selectedCountry
                      ? "Select a country first"
                      : stateOptions.length === 0
                      ? "Not applicable"
                      : "— Select State / Province —"}
                  </option>
                  {stateOptions.map((s) => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">City</label>
                {cityOptions.length > 0 ? (
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className={selectClass(false)}
                  >
                    <option value="">— Select City —</option>
                    {cityOptions.map((c) => (
                      <option key={`${c.name}-${c.stateCode ?? ""}`} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedCountry}
                    placeholder={
                      !selectedCountry
                        ? "Select a country first"
                        : stateOptions.length > 0 && !selectedState
                        ? "Select a state first"
                        : "Enter city"
                    }
                    className={`${inputClass}${!selectedCountry ? " opacity-50 cursor-not-allowed" : ""}`}
                  />
                )}
              </div>

              {/* Postal Code */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Postal Code</label>
                <input
                  name="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="10001"
                  className={inputClass}
                />
              </div>

              {/* Tax ID */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tax ID</label>
                <input
                  name="taxId"
                  defaultValue={company?.taxId ?? ""}
                  placeholder="XX-XXXXXXX"
                  className={inputClass}
                />
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {loading ? "Saving..." : company ? "Save Changes" : "Create Company"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
