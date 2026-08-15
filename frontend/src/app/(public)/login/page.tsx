"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveAuth, getAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, User, Store, Sparkles, CheckCircle2 } from "lucide-react";
import api from "@/lib/axios";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import { useGoogleLogin } from "@react-oauth/google";
import TiltSurface from "@/components/TiltSurface";

// ─── Google "G" SVG ─────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"student" | "donor" | "admin">("student");
  const [googleRole, setGoogleRole] = useState<"student" | "donor">("student");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form fields
  const [email, setEmail]                             = useState("");
  const [password, setPassword]                       = useState("");
  const [name, setName]                               = useState("");
  const [college, setCollege]                         = useState("");
  const [rollNumber, setRollNumber]                   = useState("");
  const [location, setLocation]                       = useState("");
  const [confirmPassword, setConfirmPassword]         = useState("");
  const [rememberMe, setRememberMe]                   = useState(false);
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp]                   = useState("");

  // UI state
  const [isLoading, setIsLoading]           = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess]           = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "student" || roleParam === "donor" || roleParam === "admin") {
      setRole(roleParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    const auth = getAuth();
    if (auth?.token) {
      if (auth.role === "admin") router.replace("/admin");
      else if (auth.role === "donor") router.replace("/donor");
      else router.replace("/dashboard");
    }
  }, [router]);

  // ─── Email/password submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsLoading(true);

    if (!email || !password) {
      toast.error("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    if (mode === "register") {
      if (!/^[^0-9]+$/.test(name)) {
        toast.error("Name should not contain numbers");
        setIsLoading(false);
        return;
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (mode === "register" && password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    try {
      if (mode === "register") {
        if (showOtpInput) {
          await api.post("/auth/verify-email", { email, otp });
          setIsLoading(false);
          setIsSuccess(true);
          toast.success("Email verified successfully!");
          setTimeout(() => { setIsSuccess(false); setShowOtpInput(false); setMode("login"); }, 2500);
          return;
        }

        if (password !== confirmPassword) {
          toast.error("Passwords do not match!");
          setIsLoading(false);
          return;
        }

        await api.post("/auth/register", {
          email, password, name,
          college: role === "student" ? college : undefined,
          roll_number: role === "student" ? rollNumber : undefined,
          location, role,
        });

        setIsLoading(false);
        setShowOtpInput(true);
        toast.message("Registration successful", { description: "Please check your email for the verification code" });
        return;
      }

      const res = await api.post("/auth/login", { email, password, role });
      saveAuth({ id: res.data.user.id, role: res.data.user.role, token: res.data.token, name: res.data.user.name }, rememberMe);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      if (res.data.user.role === "admin") router.push("/admin");
      else if (res.data.user.role === "donor") router.push("/donor");
      else router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed", { description: "Please check your inputs and try again" });
      setIsLoading(false);
    }
  };

  // ─── Google OAuth login ──────────────────────────────────────────────────
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      try {
        const roleToSend = role !== "admin"
          ? (mode === "register" ? googleRole : role)
          : "student";

        const res = await api.post("/auth/google", {
          access_token: tokenResponse.access_token,
          role: roleToSend,
        });

        saveAuth(
          { id: res.data.user.id, role: res.data.user.role, token: res.data.token, name: res.data.user.name },
          true
        );

        if (res.data.isNewUser) {
          toast.success(`Welcome to CampusFood, ${res.data.user.name}! 🎉`, {
            description: "Your account has been created with Google.",
          });
        } else {
          toast.success(`Welcome back, ${res.data.user.name}!`);
        }

        if (res.data.user.role === "admin") router.push("/admin");
        else if (res.data.user.role === "donor") router.push("/donor");
        else router.push("/dashboard");
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Google sign-in failed", {
          description: "Please try again or use email & password.",
        });
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (err) => {
      console.error("Google sign-in error:", err);
      toast.error("Google sign-in cancelled or failed");
      setIsGoogleLoading(false);
    },
  });

  const isAdminMode = role === "admin";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#07120d] text-white relative overflow-hidden p-4 sm:p-6 font-sans">
      {/* Background radial gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[700px] h-[700px] bg-emerald-500/20 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[700px] h-[700px] bg-indigo-600/25 rounded-full blur-[160px]" />
        <div className="absolute top-[40%] right-[30%] w-[450px] h-[450px] bg-lime-400/15 rounded-full blur-[140px]" />
      </div>

      {/* Back Button */}
      <Button
        variant="ghost"
        className="absolute top-6 left-6 z-50 text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="size-5 mr-2" /> Back to Home
      </Button>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[1060px] my-12 lg:my-0"
      >
        <TiltSurface intensity={4} className="w-full">
          <div className="relative w-full flex flex-col lg:flex-row rounded-[2.5rem] overflow-hidden border border-white/15 bg-white/[0.04] backdrop-blur-2xl shadow-[0_32px_90px_rgba(0,0,0,0.6)]">
            
            {/* Loading Overlay */}
            {isLoading && mode === "register" && !showOtpInput && (
              <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-[#0e1e17] p-8 rounded-3xl border border-white/15 shadow-2xl max-w-sm w-full flex flex-col items-center"
                >
                  <div className="relative w-16 h-16 mb-5">
                    <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-emerald-400 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Sending OTP Code</h3>
                  <p className="text-white/60 text-xs">Sending a 6-digit verification code to your email...</p>
                </motion.div>
              </div>
            )}

            {/* Success Overlay */}
            {isSuccess && (
              <div className="absolute inset-0 z-50 bg-[#07120d]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(34,197,94,0.5)]">
                    <CheckCircle2 className="w-10 h-10 text-black" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">Email Verified!</h3>
                  <p className="text-white/60 text-sm">Redirecting to sign in...</p>
                </motion.div>
              </div>
            )}

            {/* LEFT COLUMN: Form */}
            <div className="w-full lg:w-[55%] p-6 sm:p-10 lg:p-12 flex flex-col justify-center relative bg-gradient-to-br from-white/[0.06] to-transparent">
              <div className="max-w-[400px] mx-auto w-full">
                <div className="mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lime-300/20 bg-lime-300/10 text-xs font-bold text-lime-200 uppercase tracking-widest mb-3">
                    <Sparkles className="w-3.5 h-3.5" /> Portal Access
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {mode === "login" ? "Welcome Back" : showOtpInput ? "Verify Email" : "Create Account"}
                  </h2>
                  <p className="text-white/55 text-sm mt-1">
                    {showOtpInput ? `Enter the verification code sent to ${email}` : "Enter your credentials to access the campus network"}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Role Switcher Pill */}
                  {!showOtpInput && mode === "login" && (
                    <div className="flex justify-center mb-4">
                      <div className="bg-white/10 p-1.5 rounded-full flex gap-1 w-full border border-white/10">
                        {(["student", "donor", "admin"] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all relative ${
                              role === r ? "text-black font-extrabold" : "text-white/60 hover:text-white"
                            }`}
                          >
                            {role === r && (
                              <motion.div
                                layoutId="login-role-pill"
                                className="absolute inset-0 bg-gradient-to-r from-lime-200 via-emerald-300 to-lime-300 rounded-full shadow-md"
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              />
                            )}
                            <span className="relative z-10">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form Inputs */}
                  {showOtpInput ? (
                    <Input
                      type="text"
                      placeholder="ENTER 6-DIGIT OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="h-14 rounded-2xl bg-black/40 border-white/15 text-white placeholder:text-white/30 text-center text-xl font-mono tracking-[0.3em] font-bold focus:border-lime-300"
                      maxLength={6}
                    />
                  ) : (
                    <>
                      {mode === "register" && (
                        <Input
                          placeholder="Full Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-13 rounded-2xl bg-black/40 border-white/15 text-white placeholder:text-white/30 focus:border-lime-300 px-5 text-sm"
                        />
                      )}

                      <Input
                        type="email"
                        placeholder="Campus Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-13 rounded-2xl bg-black/40 border-white/15 text-white placeholder:text-white/30 focus:border-lime-300 px-5 text-sm"
                      />

                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-13 rounded-2xl bg-black/40 border-white/15 text-white placeholder:text-white/30 focus:border-lime-300 px-5 pr-12 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {mode === "register" && (
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-13 rounded-2xl bg-black/40 border-white/15 text-white placeholder:text-white/30 focus:border-lime-300 px-5 pr-12 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {!showOtpInput && (
                    <div className="flex justify-between items-center text-xs text-white/60 pt-1">
                      <label
                        className="flex items-center gap-2 cursor-pointer select-none hover:text-white"
                        onClick={() => setRememberMe(!rememberMe)}
                      >
                        <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${rememberMe ? "bg-lime-300 border-lime-300 text-black font-bold" : "border-white/30"}`}>
                          {rememberMe && "✓"}
                        </div>
                        Keep me signed in
                      </label>
                      <span
                        onClick={() => setShowForgotPassword(true)}
                        className="underline cursor-pointer hover:text-lime-200 transition-colors"
                      >
                        Forgot Password?
                      </span>
                    </div>
                  )}

                  {/* Submit CTA Button */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading || isGoogleLoading}
                      className="w-full h-13 rounded-2xl bg-gradient-to-r from-lime-300 via-emerald-400 to-lime-200 hover:from-lime-200 hover:to-emerald-300 text-[#07120d] font-extrabold text-base shadow-lg shadow-lime-300/20 transition-all disabled:opacity-60"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        mode === "login" ? "Sign In" : showOtpInput ? "Verify Code" : "Create Account"
                      )}
                    </Button>
                  </motion.div>

                  {/* Google OAuth Section */}
                  {!isAdminMode && !showOtpInput && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/40 text-xs font-medium uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>

                      {mode === "register" && (
                        <div className="flex gap-2 mb-2">
                          {(["student", "donor"] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setGoogleRole(r)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                                googleRole === r
                                  ? "bg-lime-300 text-black border-lime-300"
                                  : "text-white/60 border-white/10 hover:border-white/30"
                              }`}
                            >
                              Sign up as {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleGoogleLogin()}
                        disabled={isGoogleLoading || isLoading}
                        className="relative w-full h-13 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 transition-all flex items-center justify-center gap-3 text-white font-bold text-sm cursor-pointer overflow-hidden group disabled:opacity-50"
                      >
                        {isGoogleLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            <span>Connecting to Google...</span>
                          </div>
                        ) : (
                          <>
                            <GoogleIcon />
                            <span>Continue with Google</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {role !== "admin" && (
                  <p className="text-center mt-6 text-white/40 text-xs">
                    {mode === "login" ? "Don't have an account?" : "Already registered?"}
                    <span
                      onClick={() => { setMode(mode === "login" ? "register" : "login"); setShowOtpInput(false); }}
                      className="text-lime-200 ml-1.5 cursor-pointer font-bold hover:underline"
                    >
                      {mode === "login" ? "Register now" : "Sign in here"}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Showcase */}
            <div className="hidden lg:flex w-[45%] bg-gradient-to-br from-[#0e2419] to-[#07120d] relative p-10 flex-col justify-between items-center overflow-hidden border-l border-white/10">
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute top-[20%] right-[10%] w-[250px] h-[250px] bg-lime-400/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[10%] left-[10%] w-[250px] h-[250px] bg-indigo-500/20 rounded-full blur-3xl" />
              </div>

              {/* Live Impact Card */}
              <div className="relative z-10 text-left w-full space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-lime-300/30 bg-lime-300/10 text-xs font-bold text-lime-200">
                  <Sparkles className="w-3.5 h-3.5" /> Direct Campus Impact
                </div>
                <h3 className="text-3xl font-extrabold leading-tight text-white">
                  Turn Surplus Meals Into Shared Impact.
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Join hundreds of students and local dining halls redirecting fresh meals across campus every day.
                </p>
              </div>

              {/* Floating 3D Stat Box */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-full glass-card p-5 rounded-2xl border border-white/15 shadow-2xl bg-white/[0.08]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Campus Network</span>
                  <span className="size-2 rounded-full bg-lime-300 shadow-[0_0_10px_#bef264]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-lime-200">1,024 kg</span>
                  <span className="text-xs text-white/60 font-semibold">rescued this month</span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-lime-300" />
                  <span>Real-time instant QR pickup code verification</span>
                </div>
              </motion.div>
            </div>
          </div>
        </TiltSurface>
      </motion.div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#07120d]">
          <div className="w-10 h-10 border-4 border-lime-300 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}