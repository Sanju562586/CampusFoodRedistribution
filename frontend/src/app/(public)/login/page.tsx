"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveAuth, getAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import api from "@/lib/axios";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import { GoogleLogin } from "@react-oauth/google";

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

  // ─── Google credential success (from GoogleLogin component) ───────────────
  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      toast.error("Google did not return a credential. Please try again.");
      return;
    }
    setIsGoogleLoading(true);
    try {
      const roleToSend = role !== "admin"
        ? (mode === "register" ? googleRole : role)
        : "student";

      const res = await api.post("/auth/google", {
        credential: credentialResponse.credential,
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
  };

  const isAdminMode = role === "admin";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1a1a1a] relative overflow-hidden p-4 font-sans">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-purple-600/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-orange-500/20 rounded-full blur-[150px]" />
      </div>

      <Button
        variant="ghost"
        className="absolute top-8 left-8 z-50 text-white/50 hover:text-white hover:bg-white/10"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="size-5 mr-2" /> Back to Home
      </Button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[1100px] lg:aspect-[16/9] min-h-[500px] lg:min-h-[600px] flex flex-col lg:flex-row rounded-[30px] lg:rounded-[40px] overflow-hidden shadow-2xl border border-white/5 bg-white/5 backdrop-blur-2xl my-10 lg:my-0 mt-20 lg:mt-0"
      >
        {/* Loading overlay — register only */}
        {isLoading && mode === "register" && !showOtpInput && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full flex flex-col items-center"
            >
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sending One-Time Password</h3>
              <p className="text-white/60 text-sm">Please wait while we send a verification code to your email...</p>
            </motion.div>
          </div>
        )}

        {/* Success overlay */}
        {isSuccess && (
          <div className="absolute inset-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                <motion.svg className="w-12 h-12 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">Verification Successful!</h3>
              <p className="text-white/60 text-lg">Redirecting to login...</p>
            </motion.div>
          </div>
        )}

        {/* LEFT COLUMN: Form */}
        <div className="w-full lg:w-[55%] p-6 py-12 lg:p-12 flex flex-col items-center relative bg-gradient-to-br from-white/5 to-transparent overflow-y-auto max-h-[100%] scrollbar-hide">
          <div className="max-w-[400px] mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">
                {mode === "login" ? "Welcome back" : showOtpInput ? "Verify Email" : "Get Started"}
              </h2>
              <p className="text-white/50">
                {showOtpInput ? `Enter the OTP sent to ${email}` : "Please enter your account details"}
              </p>
            </div>

            <div className="space-y-4">
              {/* Role switcher (login mode) */}
              {!showOtpInput && mode === "login" && (
                <div className="flex justify-center mb-2">
                  <div className="bg-white/10 p-1 rounded-full flex gap-1">
                    {(["student", "donor", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          role === r ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* OTP input */}
              {showOtpInput ? (
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="h-14 rounded-full bg-black/40 border-transparent text-white placeholder:text-white/20 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20 px-6 text-center text-xl tracking-widest"
                  maxLength={6}
                />
              ) : (
                <>
                  {mode === "register" && (
                    <Input
                      placeholder="Full Name / Organization"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-14 rounded-full bg-black/40 border-transparent text-white placeholder:text-white/20 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20 px-6"
                    />
                  )}

                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 rounded-full bg-black/40 border-transparent text-white placeholder:text-white/20 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20 px-6"
                  />

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 rounded-full bg-black/40 border-transparent text-white placeholder:text-white/20 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20 px-6 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/60 hover:bg-black p-2 rounded-full focus:outline-none transition-all shadow-sm"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {mode === "register" && (
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-14 rounded-full bg-black/40 border-transparent text-white placeholder:text-white/20 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20 px-6 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/60 hover:bg-black p-2 rounded-full focus:outline-none transition-all shadow-sm"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  )}
                </>
              )}

              {!showOtpInput && (
                <div className="flex justify-between items-center text-sm">
                  <label
                    className="flex items-center gap-2 text-white/50 cursor-pointer select-none"
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    <div className={`w-4 h-4 rounded border transition-colors ${rememberMe ? "bg-white border-white" : "border-white/20"}`} />
                    Keep me logged in
                  </label>
                  <span
                    onClick={() => setShowForgotPassword(true)}
                    className="text-white/50 underline cursor-pointer hover:text-white"
                  >
                    Forgot Password?
                  </span>
                </div>
              )}

              {/* Primary CTA */}
              <Button
                onClick={handleSubmit}
                disabled={isLoading || isGoogleLoading}
                className="w-full h-14 rounded-full bg-gradient-to-r from-[#FF8C6B] to-[#FF6B6B] hover:opacity-90 transition-opacity text-black font-semibold text-lg shadow-xl shadow-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  mode === "login" ? "Sign in" : showOtpInput ? "Verify Email" : "Register Now"
                )}
              </Button>

              {showOtpInput && (
                <Button variant="ghost" onClick={() => setShowOtpInput(false)} className="w-full text-white/50 hover:text-white">
                  Cancel Verification
                </Button>
              )}

              {/* ── Google Sign-In ─────────────────────────────────────────── */}
              {/* Hidden for admin — admins must use email/password for security */}
              {!isAdminMode && !showOtpInput && (
                <div className="space-y-3 pt-1">
                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-xs font-medium">or continue with</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Role picker — only visible in register mode */}
                  <AnimatePresence>
                    {mode === "register" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-white/40 text-xs text-center mb-2">Sign up as:</p>
                        <div className="flex gap-2">
                          {(["student", "donor"] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setGoogleRole(r)}
                              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all border ${
                                googleRole === r
                                  ? "bg-white text-black border-white"
                                  : "text-white/60 border-white/10 hover:border-white/30 hover:text-white"
                              }`}
                            >
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Google button — styled wrapper around GoogleLogin */}
                  {isGoogleLoading ? (
                    <div className="w-full h-14 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center gap-3 text-white font-medium">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Signing in with Google...</span>
                    </div>
                  ) : (
                    <div
                      className="relative w-full h-14 rounded-full overflow-hidden group"
                      style={{ isolation: "isolate" }}
                    >
                      {/* Visual layer — always visible */}
                      <div className="absolute inset-0 rounded-full bg-white/[0.06] border border-white/10 group-hover:bg-white/[0.12] group-hover:border-white/20 transition-all flex items-center justify-center gap-3 text-white font-medium pointer-events-none z-10">
                        <GoogleIcon />
                        <span>Continue with Google</span>
                        {/* Shimmer */}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-full" />
                      </div>

                      {/* Real GoogleLogin button — fills the container and is invisible.
                          The visual layer above is purely decorative (pointer-events:none).
                          Clicking anywhere on the container triggers Google's popup. */}
                      <div className="absolute inset-0 opacity-0 z-20 flex items-center justify-center">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => toast.error("Google sign-in failed. Please try again.")}
                          useOneTap={false}
                          theme="filled_black"
                          size="large"
                          width="400"
                          shape="rectangular"
                          text={mode === "login" ? "signin_with" : "signup_with"}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {role !== "admin" && (
              <p className="text-center mt-6 text-white/30 text-sm">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                <span
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setShowOtpInput(false); }}
                  className="text-white ml-2 cursor-pointer font-medium hover:underline"
                >
                  {mode === "login" ? "Register" : "Login"}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hidden lg:flex w-[45%] bg-[#0f0f0f] relative p-12 flex-col justify-center items-center">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] border border-purple-500/30 rounded-full" />
            <div className="absolute top-[35%] left-[25%] w-[200px] h-[200px] border border-blue-500/30 rounded-full" />
            <div className="absolute bottom-0 right-0 w-full h-[300px] bg-gradient-to-t from-[#0f0f0f] to-transparent z-10" />
          </div>

          <div className="relative z-20 max-w-[320px]">
            <h3 className="text-4xl font-serif text-white mb-6 leading-tight">
              What our <br /> Students Said.
            </h3>
            <p className="text-xl text-white/80 italic font-light leading-relaxed mb-6">
              "Finding affordable meals on campus used to be a struggle. CampusFood changed everything—now I save money and help reduce waste."
            </p>
            <div>
              <h4 className="font-bold text-white">Verified Student</h4>
              <span className="text-white/40 text-sm">Campus Resident</span>
            </div>
            <div className="flex gap-4 mt-12">
              <Button size="icon" variant="outline" className="rounded-lg border-white/10 hover:bg-white/10 text-white">
                <ArrowLeft className="size-5" />
              </Button>
              <Button size="icon" className="rounded-lg bg-green-900/50 hover:bg-green-900 text-green-400">
                <ArrowLeft className="size-5 rotate-180" />
              </Button>
            </div>
          </div>

          <div className="absolute bottom-10 right-[-30px] bg-white text-black p-6 rounded-3xl w-[280px] shadow-2xl skew-x-[-2deg] hover:translate-y-[-5px] transition-transform">
            <h4 className="font-bold text-lg mb-2 leading-tight">Get your right food at the right place</h4>
            <p className="text-xs text-black/60 mb-4">Be among the first students to experience the easiest way to find meals.</p>
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={`https://ui-avatars.com/api/?name=User+${i}&background=random`}
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}