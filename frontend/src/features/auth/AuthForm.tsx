import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  authClient,
  setTwoFactorRequiredHandler,
  signIn,
  signUp,
  setLocalTestSession,
} from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  OTPField,
  OTPFieldInput,
  OTPFieldSeparator,
} from "@/shared/ui/otp-field";
import { toastManager } from "@/shared/ui/toast";

export type AuthMode = "signIn" | "signUp";
type Step =
  | "credentials"
  | "otp"
  | "twoFactor"
  | "forgotEmail"
  | "forgotReset";
type TwoFactorMethod = "totp" | "backup";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 8;

function isEmailNotVerified(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const code = error.code?.toUpperCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";
  return (
    code === "EMAIL_NOT_VERIFIED" ||
    message.includes("email not verified") ||
    message.includes("email verification")
  );
}

function isEmailTaken(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const code = error.code?.toUpperCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";
  return (
    code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
    message.includes("already exists")
  );
}

export interface AuthFormProps {
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
}

export function AuthForm({ mode: externalMode, onModeChange }: AuthFormProps) {
  const { t } = useTranslation("auth");
  const [internalMode, setInternalMode] = useState<AuthMode>("signIn");
  const mode = externalMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;

  const [step, setStep] = useState<Step>("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] =
    useState<TwoFactorMethod>("totp");
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const isSignUp = mode === "signUp";

  const enterTwoFactorStep = () => {
    setTwoFactorCode("");
    setTwoFactorMethod("totp");
    setStep("twoFactor");
    setPending(false);
  };

  useEffect(() => {
    setTwoFactorRequiredHandler(enterTwoFactorStep);
    return () => setTwoFactorRequiredHandler(null);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => {
      setResendIn((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  /**
   * True only when the request never reached the API — DNS/offline/connection
   * refused, which `fetch` reports as a TypeError. A 4xx from the server is a
   * real answer and must never be mistaken for "the backend is down".
   */
  function isNetworkFailure(err: unknown): boolean {
    return err instanceof TypeError;
  }

  function showAuthError() {
    toastManager.add({
      title: t("errors.toastTitle"),
      description: t("errors.generic"),
      type: "error",
    });
  }

  function showEmailTakenError() {
    toastManager.add({
      title: t("errors.toastTitle"),
      description: t("errors.emailTaken"),
      type: "error",
    });
  }

  function showOtpError() {
    toastManager.add({
      title: t("errors.toastTitle"),
      description: t("errors.otpInvalid"),
      type: "error",
    });
  }

  function showPasswordMismatchError() {
    toastManager.add({
      title: t("errors.passwordMismatch"),
      type: "error",
    });
  }

  function showPasswordResetSuccess() {
    toastManager.add({
      title: t("forgotPassword.done"),
      type: "success",
    });
  }

  function enterOtpStep() {
    setOtp("");
    setStep("otp");
    setResendIn(RESEND_COOLDOWN_SECONDS);
  }

  function enterForgotEmail() {
    setStep("forgotEmail");
  }

  function enterCredentials() {
    setStep("credentials");
    setOtp("");
    setTwoFactorCode("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function sendOtpFor(targetEmail: string, type: "sign-in" | "email-verification" | "forget-password") {
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: targetEmail,
        type,
      });
      if (result.error) {
        showAuthError();
        return false;
      }
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch {
      // Local dev fallback
      setResendIn(RESEND_COOLDOWN_SECONDS);
    }
    return true;
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();

    setPending(true);
    try {
      // The local test session is an offline development fallback, so it may
      // only be entered when the API is genuinely unreachable. Falling back on
      // a *rejected* credential would sign the visitor into a shared
      // browser-local fixture under whatever email they typed, which reads as
      // "every account sees the same trips".
      let unreachable = false;
      const onFailure = (err: unknown) => {
        unreachable = isNetworkFailure(err);
        return null;
      };

      if (isSignUp) {
        const result = await signUp.email({
          name: name || "Danial",
          email,
          password,
        }).catch(onFailure);
        if (result && !result.error) {
          return;
        }
        if (unreachable) {
          setLocalTestSession({ name: name || "Danial", email });
          return;
        }
        if (result?.error && isEmailTaken(result.error)) {
          showEmailTakenError();
          return;
        }
        showAuthError();
        return;
      }

      const result = await signIn.email({
        email,
        password,
      }).catch(onFailure);
      if (result && !result.error) {
        return;
      }
      if (result?.error && isEmailNotVerified(result.error)) {
        enterOtpStep();
        return;
      }
      if (unreachable) {
        setLocalTestSession({ email });
        return;
      }
      showAuthError();
    } catch (err) {
      if (isNetworkFailure(err)) {
        setLocalTestSession({ email });
        return;
      }
      showAuthError();
    } finally {
      setPending(false);
    }
  }

  async function submitForgotEmail(e: React.FormEvent) {
    e.preventDefault();

    setPending(true);
    try {
      const ok = await sendOtpFor(email, "forget-password");
      if (ok) {
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setStep("forgotReset");
      }
    } finally {
      setPending(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) return;

    setPending(true);
    try {
      if (isSignUp) {
        const result = await authClient.emailOtp.verifyEmail({
          email,
          otp,
        });
        if (result.error) {
          showOtpError();
          return;
        }
        return;
      }

      const result = await signIn.emailOtp({
        email,
        otp,
      });
      if (result.error) {
        showOtpError();
      }
    } catch (err) {
      // Offline dev fallback only; a rejected code must stay rejected.
      if (isNetworkFailure(err)) {
        setLocalTestSession({ name: name || "Danial", email });
        return;
      }
      showOtpError();
    } finally {
      setPending(false);
    }
  }

  async function submitTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;

    setPending(true);
    try {
      const result =
        twoFactorMethod === "totp"
          ? await authClient.twoFactor.verifyTotp({
              code: twoFactorCode.trim(),
            })
          : await authClient.twoFactor.verifyBackupCode({
              code: twoFactorCode.trim(),
            });
      if (result.error) {
        toastManager.add({
          title: t("errors.twoFactorInvalid"),
          type: "error",
        });
      }
    } catch {
      setLocalTestSession({ email });
    } finally {
      setPending(false);
    }
  }

  async function submitForgotReset(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) return;
    if (newPassword !== confirmPassword) {
      showPasswordMismatchError();
      return;
    }

    setPending(true);
    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password: newPassword,
      });
      if (result.error) {
        showOtpError();
        return;
      }
      showPasswordResetSuccess();
      enterCredentials();
    } catch {
      showPasswordResetSuccess();
      enterCredentials();
    } finally {
      setPending(false);
    }
  }

  function resendOtp() {
    if (resendIn > 0 || pending) return;
    const type = step === "forgotReset" ? "forget-password" : isSignUp ? "email-verification" : "sign-in";
    void sendOtpFor(email, type);
  }

  if (step === "twoFactor") {
    return (
      <form onSubmit={submitTwoFactor} className="flex flex-col gap-4 wf-enter-stagger">
        <div className="wf-enter flex flex-col gap-1 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading">
            {t("twoFactor.title")}
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            {twoFactorMethod === "totp"
              ? t("twoFactor.subtitle")
              : t("twoFactor.backupSubtitle")}
          </p>
        </div>

        <label className="wf-enter flex flex-col gap-1.5 text-sm font-medium">
          {twoFactorMethod === "totp"
            ? t("twoFactor.label")
            : t("twoFactor.backupLabel")}
          <Input
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            placeholder={twoFactorMethod === "totp" ? "123456" : "abcdef-12345"}
            autoComplete="one-time-code"
            inputMode={twoFactorMethod === "totp" ? "numeric" : "text"}
            className="rounded-2xl py-3.5 px-4 text-sm bg-input/40 border-border"
            required
            autoFocus
          />
        </label>

        <Button
          type="submit"
          size="lg"
          disabled={pending || !twoFactorCode.trim()}
          className="mt-2 w-full rounded-2xl bg-[#20BCED] py-4 text-sm font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#20BCED]/90 dark:bg-brand dark:hover:bg-brand/90"
        >
          {t("twoFactor.submit")}
        </Button>

        <div className="wf-enter flex items-center justify-between pt-1">
          <button
            type="button"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={() => {
              setTwoFactorMethod((prev) =>
                prev === "totp" ? "backup" : "totp",
              );
              setTwoFactorCode("");
            }}
          >
            {twoFactorMethod === "totp"
              ? t("twoFactor.useBackup")
              : t("twoFactor.useApp")}
          </button>
          <button
            type="button"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={enterCredentials}
          >
            {t("forgotPassword.back")}
          </button>
        </div>
      </form>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={submitOtp} className="flex flex-col gap-5 wf-enter-stagger">
        <div className="wf-enter flex flex-col gap-1 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading">
            {t("otp.title")}
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            {t("otp.subtitle", { email })}
          </p>
        </div>

        <div className="wf-enter flex flex-col items-center gap-2 py-2">
          <OTPField
            length={OTP_LENGTH}
            value={otp}
            onValueChange={(value) => setOtp(value)}
            disabled={pending}
            aria-label={t("otp.label")}
          >
            <OTPFieldInput />
            <OTPFieldInput aria-label={t("otp.slot", { n: 2 })} />
            <OTPFieldInput aria-label={t("otp.slot", { n: 3 })} />
            <OTPFieldSeparator />
            <OTPFieldInput aria-label={t("otp.slot", { n: 4 })} />
            <OTPFieldInput aria-label={t("otp.slot", { n: 5 })} />
            <OTPFieldInput aria-label={t("otp.slot", { n: 6 })} />
          </OTPField>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending || otp.length !== OTP_LENGTH}
          className="w-full rounded-2xl bg-[#20BCED] py-4 text-sm font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#20BCED]/90 dark:bg-brand dark:hover:bg-brand/90"
        >
          {t("otp.submit")}
        </Button>

        <div className="wf-enter flex items-center justify-between text-xs font-medium text-muted-foreground pt-1">
          <button
            type="button"
            onClick={resendOtp}
            disabled={resendIn > 0 || pending}
            className="font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {resendIn > 0
              ? t("otp.resendIn", { seconds: resendIn })
              : t("otp.resend")}
          </button>
          <button
            type="button"
            className="font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={enterCredentials}
          >
            {t("otp.back")}
          </button>
        </div>
      </form>
    );
  }

  if (step === "forgotEmail") {
    return (
      <form onSubmit={submitForgotEmail} className="flex flex-col gap-4 wf-enter-stagger">
        <div className="wf-enter flex flex-col gap-1 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading">
            {t("forgotPassword.title")}
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            {t("forgotPassword.subtitle")}
          </p>
        </div>

        <div className="wf-enter flex flex-col gap-1.5">
          <Input
            type="email"
            placeholder={t("forgotPassword.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-2xl border border-border/80 bg-input/40 px-4 py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={pending || !email.trim()}
          className="mt-2 w-full rounded-2xl bg-[#20BCED] py-4 text-sm font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#20BCED]/90 dark:bg-brand dark:hover:bg-brand/90"
        >
          {t("forgotPassword.submit")}
        </Button>

        <button
          type="button"
          className="mt-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          onClick={enterCredentials}
        >
          {t("forgotPassword.back")}
        </button>
      </form>
    );
  }

  if (step === "forgotReset") {
    return (
      <form onSubmit={submitForgotReset} className="flex flex-col gap-4 wf-enter-stagger">
        <div className="wf-enter flex flex-col gap-1 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading">
            {t("forgotPassword.otpTitle")}
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            {t("forgotPassword.otpSubtitle", { email })}
          </p>
        </div>

        <div className="wf-enter flex flex-col items-center gap-2 py-2">
          <OTPField
            length={OTP_LENGTH}
            value={otp}
            onValueChange={(value) => setOtp(value)}
            disabled={pending}
            aria-label={t("otp.label")}
          >
            <OTPFieldInput />
            <OTPFieldInput aria-label={t("otp.slot", { n: 2 })} />
            <OTPFieldInput aria-label={t("otp.slot", { n: 3 })} />
            <OTPFieldSeparator />
            <OTPFieldInput aria-label={t("otp.slot", { n: 4 })} />
            <OTPFieldInput aria-label={t("otp.slot", { n: 5 })} />
            <OTPFieldInput aria-label={t("otp.slot", { n: 6 })} />
          </OTPField>
        </div>

        <Input
          type="password"
          placeholder={t("forgotPassword.newPassword")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          className="w-full rounded-2xl border border-border/80 bg-input/40 px-4 py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
          required
        />

        <Input
          type="password"
          placeholder={t("forgotPassword.confirmPassword")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          className="w-full rounded-2xl border border-border/80 bg-input/40 px-4 py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
          required
        />

        <Button
          type="submit"
          size="lg"
          disabled={
            pending ||
            otp.length !== OTP_LENGTH ||
            newPassword.length < MIN_PASSWORD_LENGTH ||
            newPassword !== confirmPassword
          }
          className="mt-2 w-full rounded-2xl bg-[#20BCED] py-4 text-sm font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#20BCED]/90 dark:bg-brand dark:hover:bg-brand/90"
        >
          {t("forgotPassword.submitReset")}
        </Button>

        <div className="wf-enter flex items-center justify-between text-xs font-medium text-muted-foreground pt-1">
          <button
            type="button"
            onClick={resendOtp}
            disabled={resendIn > 0 || pending}
            className="font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {resendIn > 0
              ? t("otp.resendIn", { seconds: resendIn })
              : t("otp.resend")}
          </button>
          <button
            type="button"
            className="font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={enterCredentials}
          >
            {t("forgotPassword.back")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitCredentials} className="flex flex-col gap-3.5">
      {/* Centered Clean Heading */}
      <div className="mb-2 flex flex-col items-center text-center">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {isSignUp ? "Create your profile" : "Log in"}
        </h1>
      </div>

      {isSignUp ? (
        <div>
          <Input
            placeholder="Name (e.g. Danial)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-2xl border border-border/80 bg-input/40 px-4 py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
            required
          />
        </div>
      ) : null}

      <div>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-2xl border border-border/80 bg-input/40 px-4 py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
          required
        />
      </div>

      {/* Password Bar with embedded FORGOT? button */}
      <div className="relative flex items-center">
        <Input
          id="auth-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="w-full rounded-2xl border border-border/80 bg-input/40 px-4 py-3.5 pr-24 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/20"
          required
        />
        {!isSignUp ? (
          <button
            type="button"
            onClick={enterForgotEmail}
            className="absolute right-4 text-xs font-bold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            FORGOT?
          </button>
        ) : null}
      </div>

      {/* Large Rounded Cyan / Blue Action Button */}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="mt-3 w-full rounded-2xl bg-[#20BCED] py-4 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#20BCED]/90 active:scale-[0.99] dark:bg-brand dark:hover:bg-brand/90"
      >
        {isSignUp ? "CREATE ACCOUNT" : "LOG IN"}
      </Button>

      {/* Terms and Privacy Policy Note */}
      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        By signing in to Gebook, you agree to our{" "}
        <span className="font-semibold text-foreground/80 underline decoration-muted-foreground/40 underline-offset-2">Terms</span> and{" "}
        <span className="font-semibold text-foreground/80 underline decoration-muted-foreground/40 underline-offset-2">Privacy Policy</span>.
      </p>
    </form>
  );
}
