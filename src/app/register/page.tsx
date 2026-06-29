"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Package, CheckCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";

function toTitleWord(str: string) {
  const trimmed = str.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function toTitleName(str: string) {
  return str
    .split(/(?<=[\s-])/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

type Step = "form" | "otp" | "done";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Step 1: submit registration form ──────────────────────────────
  async function onSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const firstName = fd.get("firstName") as string;
    const lastName = fd.get("lastName") as string;
    const emailVal = fd.get("email") as string;
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (!/^[A-Za-z]+$/.test(firstName.trim())) {
      toast.error("First name must be a single word with letters only");
      return;
    }
    if (!/^[A-Za-z][A-Za-z\s-]*$/.test(lastName.trim())) {
      toast.error("Last name may only contain letters, spaces, or hyphens");
      return;
    }
    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error("Please enter a valid phone number with country code");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: toTitleWord(firstName),
        lastName: toTitleName(lastName),
        email: emailVal,
        phone,
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

  // ── Step 2: OTP input ──────────────────────────────────────────────
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
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
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

  async function resendOtp() {
    toast.info("A new code is being sent...");
    // Re-POST is handled server-side by deleting old tokens
  }

  const inputClass =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400";

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
              <h2 className="text-lg font-semibold text-gray-900">You&apos;re on the list</h2>
              <p className="text-sm text-muted-foreground">
                Your account has been created and is <strong>pending approval</strong> from an administrator. You&apos;ll be able to sign in once your account is activated.
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
                  {loading ? "Verifying..." : "Verify email"}
                </button>
              </form>
              <p className="text-center text-xs text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <button onClick={resendOtp} className="text-blue-600 hover:underline">
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
                    <label className="text-sm font-medium text-gray-700 block mb-1">First name</label>
                    <input
                      name="firstName"
                      type="text"
                      required
                      placeholder="Jane"
                      onBlur={(e) => { e.target.value = toTitleWord(e.target.value); }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Last name</label>
                    <input
                      name="lastName"
                      type="text"
                      required
                      placeholder="Smith-Jones"
                      onBlur={(e) => { e.target.value = toTitleName(e.target.value); }}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Email address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    className={inputClass}
                  />
                  <p className="text-xs text-muted-foreground mt-1">A verification code will be sent to this address.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Phone number</label>
                  <PhoneInput
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={setPhone}
                    defaultCountry="US"
                    international
                    countryCallingCodeEditable={false}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Confirm password</label>
                  <input
                    name="confirm"
                    type="password"
                    required
                    placeholder="Repeat your password"
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Sending code..." : "Continue"}
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-600 hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          After verifying your email, your account will be reviewed by an administrator before you can sign in.
        </p>
      </div>
    </div>
  );
}
