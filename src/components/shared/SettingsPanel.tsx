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

function toTitleWord(str: string) {
  const t = str.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

function toTitleName(str: string) {
  return str.split(/(?<=[\s-])/).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("");
}

const inputClass = "w-full border border-[var(--rx-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--rx-text-strong)] placeholder:text-[var(--rx-text-muted)] bg-[var(--rx-surface)]";

type Tab = "profile" | "password" | "appearance";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "password", label: "Change Password" },
  { id: "appearance", label: "Appearance" },
];

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

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

  // ── Appearance state ───────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

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

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    let fullPhone: string | null = null;
    if (phoneInput.trim()) {
      if (!validatePhone(phoneInput, country)) {
        setPhoneTouched(true);
        setPhoneError(`Invalid format. Example: ${getPlaceholder(country)}`);
        toast.error("Please enter a valid Phone Number");
        return;
      }
      fullPhone = parseToE164(phoneInput, country);
    }

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

  return (
    <div>
      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-[var(--rx-border)] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
              activeTab === tab.id
                ? "bg-[var(--rx-surface)] border border-b-[var(--rx-surface)] border-[var(--rx-border)] text-blue-600"
                : "text-[var(--rx-text-muted)] hover:text-[var(--rx-text-strong)] hover:bg-[var(--rx-border-subtle)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {activeTab === "profile" && (
        <div className="max-w-2xl">
          {profileLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={onSaveProfile} className="space-y-4">
                  {customerId && (
                    <div>
                      <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Customer ID</label>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-[var(--rx-border)] border border-[var(--rx-border)] rounded-lg px-3 py-2 text-[var(--rx-text-body)] select-all">
                          {customerId}
                        </span>
                        <span className="text-xs text-muted-foreground">Unique account identifier — never changes</span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value.replace(/[^A-Za-z]/g, ""))}
                        onBlur={() => setFirstName(toTitleWord(firstName))}
                        placeholder="John"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value.replace(/[^A-Za-z\s-]/g, ""))}
                        onBlur={() => setLastName(toTitleName(lastName))}
                        placeholder="Smith"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Phone Number</label>
                    <div className="flex gap-2">
                      <select
                        value={country}
                        onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
                        className="border border-[var(--rx-border)] rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--rx-text-strong)] bg-[var(--rx-surface)] w-48 shrink-0"
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
                      className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      {profileSaving ? "Saving..." : "Update Profile"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Change Password tab ── */}
      {activeTab === "password" && (
        <div className="max-w-2xl">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={onChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Current Password</label>
                  <input
                    name="currentPassword"
                    type="password"
                    required
                    placeholder="Current Password"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">New Password</label>
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
                  <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Confirm Password</label>
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
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {passwordSaving ? "Saving..." : "Change Password"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Appearance tab ── */}
      {activeTab === "appearance" && (
        <div className="max-w-2xl">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--rx-text-body)]">Dark Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Switch the interface to a dark colour scheme
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !darkMode;
                    setDarkMode(next);
                    document.documentElement.classList.toggle("dark", next);
                    const val = next ? "dark" : "light";
                    localStorage.setItem("theme", val);
                    document.cookie = `theme=${val}; path=/; max-age=31536000`;
                  }}
                  role="switch"
                  aria-checked={darkMode}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    darkMode ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                      darkMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
