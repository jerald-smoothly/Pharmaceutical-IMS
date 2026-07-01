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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const phoneExamples = require("libphonenumber-js/examples.mobile.json");

const countryNames = en as Record<string, string>;
const PRIORITY: CountryCode[] = ["US", "GB", "CA", "AU", "PH"];
const allCountries = getCountries()
  .map((code) => ({ code: code as CountryCode, name: countryNames[code] ?? code, dial: getCountryCallingCode(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));
const priorityCountries = PRIORITY.map((c) => allCountries.find((x) => x.code === c)).filter(Boolean) as typeof allCountries;
const otherCountries = allCountries.filter((c) => !PRIORITY.includes(c.code));

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

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  department?: string | null;
  companyId?: string | null;
  notes?: string | null;
}

interface Company { id: string; name: string; }

interface Props {
  children: React.ReactNode;
  contact?: Contact;
  companies: Company[];
}

const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ContactFormDialog({ children, contact, companies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<CountryCode>("US");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhoneError("");
    setPhoneTouched(false);
    if (contact?.phone) {
      try {
        const parsed = parsePhoneNumber(contact.phone);
        if (parsed?.country) {
          const c = parsed.country as CountryCode;
          setCountry(c);
          setPhoneInput(formatPhoneInput(parsed.nationalNumber, c));
          return;
        }
      } catch { /* fall through */ }
    }
    setCountry("US");
    setPhoneInput("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handlePhoneChange(value: string) {
    const formatted = formatPhoneInput(value, country);
    setPhoneInput(formatted);
    if (phoneTouched && formatted) {
      setPhoneError(validatePhone(formatted, country) ? "" : `Invalid format. Example: ${getPlaceholder(country)}`);
    } else {
      setPhoneError("");
    }
  }

  function handlePhoneBlur() {
    setPhoneTouched(true);
    if (!phoneInput) { setPhoneError(""); return; }
    setPhoneError(validatePhone(phoneInput, country) ? "" : `Invalid format. Example: ${getPlaceholder(country)}`);
  }

  function handleCountryChange(code: CountryCode) {
    setCountry(code);
    setPhoneInput("");
    setPhoneError("");
    setPhoneTouched(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (phoneInput.trim() && !validatePhone(phoneInput, country)) {
      setPhoneTouched(true);
      setPhoneError(`Invalid format. Example: ${getPlaceholder(country)}`);
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string | null> = {};

    fd.forEach((v, k) => {
      if (k === "companyId") return;
      const val = String(v).trim();
      if (val) data[k] = val;
    });

    data.companyId = String(fd.get("companyId") ?? "").trim() || null;
    data.phone = phoneInput.trim() ? parseToE164(phoneInput, country) : null;

    const url = contact ? `/api/crm/contacts/${contact.id}` : "/api/crm/contacts";
    const method = contact ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to save contact");
      return;
    }

    toast.success(contact ? "Contact updated" : "Contact created");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">First Name *</label>
                <input
                  name="firstName"
                  required
                  defaultValue={contact?.firstName ?? ""}
                  className={inputClass}
                  onChange={(e) => { e.target.value = e.target.value.replace(/[^A-Za-z]/g, ""); }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) e.target.value = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Last Name *</label>
                <input
                  name="lastName"
                  required
                  defaultValue={contact?.lastName ?? ""}
                  className={inputClass}
                  onChange={(e) => { e.target.value = e.target.value.replace(/[^A-Za-z\s-]/g, ""); }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) e.target.value = v.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                  }}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
                <input name="email" type="email" required defaultValue={contact?.email ?? ""} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                <div className="flex gap-2">
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
                    className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-44 shrink-0"
                  >
                    <optgroup label="Common">
                      {priorityCountries.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} (+{c.dial})</option>
                      ))}
                    </optgroup>
                    <optgroup label="All countries">
                      {otherCountries.map((c) => (
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
                      className={inputClass}
                    />
                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Title</label>
                <input name="title" defaultValue={contact?.title ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Department</label>
                <input name="department" defaultValue={contact?.department ?? ""} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Company</label>
                <select name="companyId" defaultValue={contact?.companyId ?? ""} className={`${inputClass} bg-white`}>
                  <option value="">— None —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
                <textarea name="notes" defaultValue={contact?.notes ?? ""} rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
                {loading ? "Saving..." : contact ? "Save Changes" : "Create Contact"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
