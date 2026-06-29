"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Package, CheckCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
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
  .map((code) => ({
    code: code as CountryCode,
    name: countryNames[code] ?? code,
    dial: getCountryCallingCode(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const priorityCountries = PRIORITY.map((c) => allCountries.find((x) => x.code === c)).filter(Boolean) as typeof allCountries;
const otherCountries = allCountries.filter((c) => !PRIORITY.includes(c.code));

function getPlaceholder(country: CountryCode): string {
  try {
    const example = getExampleNumber(country, phoneExamples);
    if (!example) return "Phone number";
    const national = example.formatNational();
    // Countries whose national format starts with "0" (trunk prefix) store numbers
    // without that 0 (e.g. PH stores "+63 905 123 4567", not "+63 0905 123 4567").
    // Show the placeholder as the international format minus the country code so
    // what the user sees in the placeholder matches what ends up in the record.
    if (national.startsWith("0")) {
      const code = getCountryCallingCode(country);
      return example.formatInternational().replace(`+${code} `, "");
    }
    return national;
  } catch {
    return "Phone number";
  }
}

function formatPhoneInput(rawInput: string, country: CountryCode): string {
  try {
    const ex = getExampleNumber(country, phoneExamples);
    const hasTrunk = ex?.formatNational().startsWith("0") ?? false;
    if (hasTrunk) {
      const digits = rawInput.replace(/\D/g, "");
      if (!digits) return "";
      // Prepend trunk prefix so AsYouType spaces correctly, then strip it back off
      const prefixed = digits.startsWith("0") ? digits : "0" + digits;
      const formatted = new AsYouType(country).input(prefixed);
      return formatted.startsWith("0") ? formatted.slice(1).replace(/^\s+/, "") : formatted;
    }
    return new AsYouType(country).input(rawInput);
  } catch {
    return rawInput;
  }
}

function toTitleWord(str: string) {
  const t = str.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

function toTitleName(str: string) {
  return str
    .split(/(?<=[\s-])/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
}

type Step = "form" | "otp" | "done";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const [country, setCountry] = useState<CountryCode>("US");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [confirmError, setConfirmError] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  function handleCountryChange(code: CountryCode) {
    setCountry(code);
    setPhoneInput("");
    setPhoneError("");
    setPhoneTouched(false);
  }

  function handlePhoneChange(value: string) {
    const formatted = formatPhoneInput(value, country);
    setPhoneInput(formatted);
    // Live validation once the user has started typing
    if (phoneTouched && formatted) {
      const valid = isValidPhoneNumber(formatted, country);
      setPhoneError(valid ? "" : `Invalid format. Example: ${getPlaceholder(country)}`);
    } else {
      setPhoneError("");
    }
  }

  function handlePhoneBlur() {
    setPhoneTouched(true);
    if (!phoneInput) {
      setPhoneError("");
      return;
    }
    const valid = isValidPhoneNumber(phoneInput, country);
    setPhoneError(valid ? "" : `Invalid format. Example: ${getPlaceholder(country)}`);
  }

  async function onSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const firstName = fd.get("firstName") as string;
    const lastName = fd.get("lastName") as string;
    const emailVal = fd.get("email") as string;
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (!/^[A-Za-z]+$/.test(firstName.trim())) {
      toast.error("First Name must be a single word with letters only");
      return;
    }
    if (!/^[A-Za-z][A-Za-z\s-]*$/.test(lastName.trim())) {
      toast.error("Last Name may only contain letters, spaces, or hyphens");
      return;
    }
    if (!phoneInput || !isValidPhoneNumber(phoneInput, country)) {
      setPhoneTouched(true);
      setPhoneError(`Invalid format. Example: ${getPlaceholder(country)}`);
      toast.error("Please enter a valid Phone Number");
      return;
    }
    if (password !== confirm) {
      setConfirmError("Passwords do not match");
      return;
    }
    setConfirmError("");

    // Build full E.164 phone number (+63 912 345 6789 → +639123456789)
    const parsed = parsePhoneNumber(phoneInput, country);
    const fullPhone = parsed?.formatInternational() ?? `+${getCountryCallingCode(country)} ${phoneInput.replace(/\D/g, "")}`;

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: toTitleWord(firstName),
        lastName: toTitleName(lastName),
        email: emailVal,
        phone: fullPhone,
        password,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Registration failed");
      return;
    }

    setEmail(emailVal);
    setStep("otp");
  }

  function handleOtpKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  async function onSubmitOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: code }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Verification failed");
      return;
    }
    setStep("done");
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">RxPharmas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {step === "form" && "Create your account"}
            {step === "otp" && "Verify your email"}
            {step === "done" && "Registration complete"}
          </p>
        </div>

        {/* ── Done ── */}
        {step === "done" && (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900">You&apos;re all set!</h2>
              <p className="text-sm text-muted-foreground">
                Your account has been verified and is ready to use. You can sign in now.
              </p>
              <Link href="/login" className="inline-block mt-2 text-sm text-blue-600 hover:underline">
                Back to sign in
              </Link>
            </CardContent>
          </Card>
        )}

        {/* ── OTP step ── */}
        {step === "otp" && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <button
                onClick={() => setStep("form")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <p className="text-sm text-gray-600">
                We sent a 6-digit verification code to <strong>{email}</strong>. Enter it below.
              </p>
              <form onSubmit={onSubmitOtp} className="space-y-5">
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKey(i, e)}
                      className="w-11 h-12 text-center text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify Email"}
                </button>
              </form>
              <p className="text-center text-xs text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <button onClick={() => { setStep("form"); toast.info("Edit your details and submit again to resend."); }} className="text-blue-600 hover:underline">
                  Resend code
                </button>
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Registration form ── */}
        {step === "form" && (
          <Card>
            <CardContent className="p-6">
              <form onSubmit={onSubmitForm} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">First Name</label>
                    <input
                      name="firstName"
                      type="text"
                      required
                      placeholder="John"
                      onChange={(e) => { e.target.value = e.target.value.replace(/[^A-Za-z]/g, ""); }}
                      onBlur={(e) => { e.target.value = toTitleWord(e.target.value); }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Last Name</label>
                    <input
                      name="lastName"
                      type="text"
                      required
                      placeholder="Smith"
                      onChange={(e) => { e.target.value = e.target.value.replace(/[^A-Za-z\s-]/g, ""); }}
                      onBlur={(e) => { e.target.value = toTitleName(e.target.value); }}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    className={inputClass}
                  />
                  <p className="text-xs text-muted-foreground mt-1">A confirmation code will be sent to your email address. You must verify your email to activate your account.</p>
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
                          <option key={c.code} value={c.code}>
                            {c.name} (+{c.dial})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="All Countries">
                        {otherCountries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} (+{c.dial})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="flex-1 flex flex-col">
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onBlur={handlePhoneBlur}
                        placeholder={getPlaceholder(country)}
                        className={`${inputClass} ${phoneError ? "border-red-400 focus:ring-red-400" : ""}`}
                      />
                    </div>
                  </div>
                  {phoneError && (
                    <p className="text-xs text-red-500 mt-1">{phoneError}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
                  <input
                    ref={passwordRef}
                    name="password"
                    type="password"
                    required
                    placeholder="Password"
                    className={inputClass}
                    onChange={(e) => {
                      if (confirmRef.current?.value) {
                        setConfirmError(confirmRef.current.value !== e.target.value ? "Passwords do not match" : "");
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Confirm Password</label>
                  <input
                    ref={confirmRef}
                    name="confirm"
                    type="password"
                    required
                    placeholder="Confirm Password"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) { setConfirmError(""); return; }
                      setConfirmError(val !== passwordRef.current?.value ? "Passwords do not match" : "");
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val && val !== passwordRef.current?.value) setConfirmError("Passwords do not match");
                    }}
                    className={`${inputClass} ${confirmError ? "border-red-400 focus:ring-red-400" : ""}`}
                  />
                  {confirmError && <p className="text-xs text-red-500 mt-1">{confirmError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Sending Code..." : "Continue"}
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-600 hover:underline">
                    Sign In
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          After verifying your email, you can sign in immediately.
        </p>
      </div>
    </div>
  );
}
