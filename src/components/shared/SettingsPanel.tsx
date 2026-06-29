"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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

function formatPhoneInput(rawInput: string, country: CountryCode): string {
  try {
    const ex = getExampleNumber(country, phoneExamples);
    const hasTrunk = ex?.formatNational().startsWith("0") ?? false;
    if (hasTrunk) {
      const digits = rawInput.replace(/\D/g, "");
      if (!digits) return "";
      const prefixed = digits.startsWith("0") ? digits : "0" + digits;
      const formatted = new AsYouType(country).input(prefixed);
      return formatted.startsWith("0") ? formatted.slice(1).replace(/^\s+/, "") : formatted;
    }
    return new AsYouType(country).input(rawInput);
  } catch { return rawInput; }
}

function toTitleWord(str: string) {
  const t = str.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

function toTitleName(str: string) {
  return str.split(/(?<=[\s-])/).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("");
}

const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400";

export default function SettingsPanel() {
  // ── Profile state ──────────────────────────────────────────
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<CountryCode>("US");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // ── Password state ─────────────────────────────────────────
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((data) => {
        setCustomerId(data.customerId ?? null);
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setEmail(data.email ?? "");

        if (data.phone) {
          try {
            const parsed = parsePhoneNumber(data.phone);
            if (parsed?.country) {
              const c = parsed.country as CountryCode;
              setCountry(c);
              setPhoneInput(formatPhoneInput(parsed.nationalNumber, c));
            } else {
              setPhoneInput(data.phone);
            }
          } catch {
            setPhoneInput(data.phone);
          }
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setProfileLoading(false));
  }, []);

  function handlePhoneChange(value: string) {
    const formatted = formatPhoneInput(value, country);
    setPhoneInput(formatted);
    if (phoneTouched && formatted) {
      setPhoneError(isValidPhoneNumber(formatted, country) ? "" : `Invalid format. Example: ${getPlaceholder(country)}`);
    } else {
      setPhoneError("");
    }
  }

  function handlePhoneBlur() {
    setPhoneTouched(true);
    if (!phoneInput) { setPhoneError(""); return; }
    setPhoneError(isValidPhoneNumber(phoneInput, country) ? "" : `Invalid format. Example: ${getPlaceholder(country)}`);
  }

  function handleCountryChange(code: CountryCode) {
    setCountry(code);
    setPhoneInput("");
    setPhoneError("");
    setPhoneTouched(false);
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhoneNumber(phoneInput, country)) {
      setPhoneTouched(true);
      setPhoneError(`Invalid format. Example: ${getPlaceholder(country)}`);
      toast.error("Please enter a valid Phone Number");
      return;
    }
    const parsed = parsePhoneNumber(phoneInput, country);
    const fullPhone = parsed?.formatInternational() ?? `+${getCountryCallingCode(country)} ${phoneInput.replace(/\D/g, "")}`;

    setProfileSaving(true);
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: toTitleWord(firstName),
        lastName: toTitleName(lastName),
        email,
        phone: fullPhone,
      }),
    });
    setProfileSaving(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to update profile");
      return;
    }
    setFirstName(toTitleWord(firstName));
    setLastName(toTitleName(lastName));
    toast.success("Profile updated successfully");
  }

  async function onChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get("currentPassword") as string;
    const newPassword = fd.get("newPassword") as string;
    const confirmPassword = fd.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }
    setConfirmError("");
    setPasswordSaving(true);
    const res = await fetch("/api/settings/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPasswordSaving(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to change password");
      return;
    }
    toast.success("Password changed successfully");
    (e.target as HTMLFormElement).reset();
    setConfirmError("");
  }

  if (profileLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* ── Profile ── */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Profile</h2>
          <form onSubmit={onSaveProfile} className="space-y-4">
            {customerId && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Customer ID</label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm bg-gray-50 border rounded-lg px-3 py-2 text-gray-700 select-all">
                    {customerId}
                  </span>
                  <span className="text-xs text-muted-foreground">Unique account identifier — never changes</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value.replace(/[^A-Za-z]/g, ""))}
                  onBlur={() => setFirstName(toTitleWord(firstName))}
                  placeholder="John"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value.replace(/[^A-Za-z\s-]/g, ""))}
                  onBlur={() => setLastName(toTitleName(lastName))}
                  placeholder="Smith"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
                  className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white w-48 shrink-0"
                >
                  <optgroup label="Common">
                    {priorityCountries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name} (+{c.dial})</option>
                    ))}
                  </optgroup>
                  <optgroup label="All Countries">
                    {otherCountries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name} (+{c.dial})</option>
                    ))}
                  </optgroup>
                </select>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder={getPlaceholder(country)}
                  className={`${inputClass} flex-1 ${phoneError ? "border-red-400 focus:ring-red-400" : ""}`}
                />
              </div>
              {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Update Profile"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Change Password ── */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Change Password</h2>
          <form onSubmit={onChangePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Current Password</label>
              <input
                name="currentPassword"
                type="password"
                required
                placeholder="Current Password"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">New Password</label>
              <input
                ref={newPasswordRef}
                name="newPassword"
                type="password"
                required
                placeholder="New Password"
                className={inputClass}
                onChange={() => {
                  if (confirmPasswordRef.current?.value) {
                    setConfirmError(confirmPasswordRef.current.value !== newPasswordRef.current?.value ? "Passwords do not match" : "");
                  }
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Confirm Password</label>
              <input
                ref={confirmPasswordRef}
                name="confirmPassword"
                type="password"
                required
                placeholder="Confirm Password"
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) { setConfirmError(""); return; }
                  setConfirmError(val !== newPasswordRef.current?.value ? "Passwords do not match" : "");
                }}
                onBlur={(e) => {
                  if (e.target.value && e.target.value !== newPasswordRef.current?.value) setConfirmError("Passwords do not match");
                }}
                className={`${inputClass} ${confirmError ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {confirmError && <p className="text-xs text-red-500 mt-1">{confirmError}</p>}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {passwordSaving ? "Saving..." : "Change Password"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
