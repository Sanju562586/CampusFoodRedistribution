"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ArrowLeft, Github, Twitter, Facebook, Eye, EyeOff } from "lucide-react";
import api from "@/lib/axios"; // Fixed import
import ForgotPasswordModal from "@/components/ForgotPasswordModal";


export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"student" | "donor" | "admin">("student");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [location, setLocation] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");

  // Loading State
  const [isLoading, setIsLoading] = useState(false);
  // Success State
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "student" || roleParam === "donor" || roleParam === "admin") {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    setIsLoading(true);

    // Basic Validation
    if (!email || !password) {
      toast.error("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    // Name Validation (No numbers allowed)
    if (mode === 'register') {
      const nameRegex = /^[^0-9]+$/;
      if (!nameRegex.test(name)) {
        toast.error("Name should not contain numbers");
        setIsLoading(false);
        return;
      }
    }

    // Email Regex Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    // Password Strength Validation (Register Mode Only)
    // Removed strict character class [A-Za-z\d] to allow special characters
    if (mode === 'register') {
      const passwordRegex = /.{8,}/; // Simplified to just length as requested "remove all other constraints", or use a more permissive complexity check if desired. 
      // User said "even a correct password with letters and numbers... error".
      // Previous regex was /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/ which forbade symbols.
      // New regex checks for at least 8 characters.

      if (!passwordRegex.test(password)) {
        toast.error("Password must be at least 8 characters long");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (mode === "register") {
        if (showOtpInput) {
          // Verify OTP
          await api.post("/auth/verify-email", { email, otp });

          setIsLoading(false);
          setIsSuccess(true);
          toast.success("Email verified successfully!");

          // Wait for animation then redirect
          setTimeout(() => {
            setIsSuccess(false);
            setShowOtpInput(false);
            setMode("login");
            // Reset form fields lightly if desired, but keeping email is often helpful
          }, 2500);

          return;
        }

        if (password !== confirmPassword) {
          toast.error("Passwords do not match!");
          setIsLoading(false);
          return;
        }

        await api.post("/auth/register", {
          email,
          password,
          name,
          college: role === 'student' ? college : undefined,
          roll_number: role === 'student' ? rollNumber : undefined,
          location,
          role
        });

        // Success - remove loading, show OTP input
        setIsLoading(false);
        setShowOtpInput(true);
        toast.message("Registration successful", {
          description: "Please check your email for the verification code",
        });
        return;
      }

      const res = await api.post("/auth/login", {
        email,
        password,
        role // Send the current page's role context (student/donor/admin)
      });

      saveAuth({
        id: res.data.user.id,
        role: res.data.user.role,
        token: res.data.token,
        name: res.data.user.name,
      }, rememberMe);

      toast.success(`Welcome back, ${res.data.user.name}!`);

      if (res.data.user.role === "admin") router.push("/admin");
      else if (res.data.user.role === "donor") router.push("/donor");
      else router.push("/dashboard");

    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed", {
        description: "Please check your inputs and try again",
      });
      setIsLoading(false);
    } finally {
      // Ensure loading is off in edge cases if not handled above
      // For register flow, we might want to keep loading ON until the transition completes
      // but here we handle it explicitly.
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1a1a1a] relative overflow-hidden p-4 font-sans">

      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-purple-600/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-orange-500/20 rounded-full blur-[150px]" />
      </div>

      <Button
        variant="ghost"
        className="absolute top-8 left-8 z-50 text-white/50 hover:text-white hover:bg-white/10"
        onClick={() => router.push('/')}
      >
        <ArrowLeft className="size-5 mr-2" /> Back to Home
      </Button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[1100px] lg:aspect-[16/9] min-h-[500px] lg:min-h-[600px] flex flex-col lg:flex-row rounded-[30px] lg:rounded-[40px] overflow-hidden shadow-2xl border border-white/5 bg-white/5 backdrop-blur-2xl my-10 lg:my-0 mt-20 lg:mt-0"
      >
        {/* Loading Overlay */}
        {isLoading && mode === 'register' && !showOtpInput && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full flex flex-col items-center"
            >
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sending One-Time Password</h3>
              <p className="text-white/60 text-sm">Please wait while we send a verification code to your email...</p>
            </motion.div>
          </div>
        )}

        {/* Success Overlay */}
        {isSuccess && (
          <div className="absolute inset-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                <motion.svg
                  className="w-12 h-12 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
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
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-white mb-2">
                {mode === "login" ? "Welcome back" : (showOtpInput ? "Verify Email" : "Get Started")}
              </h2>
              <p className="text-white/50">
                {showOtpInput ? `Enter the OTP sent to ${email}` : "Please enter your account details"}
              </p>
            </div>

            <div className="space-y-5">
              {/* Role Switcher */}
              {!showOtpInput && mode === 'login' && (
                <div className="flex justify-center mb-6">
                  <div className="bg-white/10 p-1 rounded-full flex gap-1">
                    {(['student', 'donor', 'admin'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${role === r
                            ? 'bg-white text-black shadow-lg'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showOtpInput ? (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp} onChange={e => setOtp(e.target.value)}
                    className="h-14 rounded-full bg-black/40 border-transparent text-white placeholder:text-white/20 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20 px-6 text-center text-xl tracking-widest"
                    maxLength={6}
                  />
                </div>
              ) : (
                <>
                  {mode === 'register' && (
                    <>
                      <Input
                        placeholder="Full Name / Organization"
                        value={name} onChange={e => setName(e.target.value)}
                        className="h-14 rounded-full bg-black/40 border-transparent text-white placeholder:text-white/20 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20 px-6"
                      />
                    </>
                  )}

                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="h-14 rounded-full bg-black/40 border-transparent text-white placeholder:text-white/20 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white/20 px-6"
                    />
                  </div>

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password} onChange={e => setPassword(e.target.value)}
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

                  {mode === 'register' && (
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
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
                <div className="flex justify-between items-center text-sm mt-2">
                  <label
                    className="flex items-center gap-2 text-white/50 cursor-pointer select-none"
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    <div className={`w-4 h-4 rounded border transition-colors ${rememberMe ? "get-white bg-white" : "border-white/20"}`} />
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

              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-14 rounded-full bg-gradient-to-r from-[#FF8C6B] to-[#FF6B6B] hover:opacity-90 transition-opacity text-black font-semibold text-lg mt-4 shadow-xl shadow-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  mode === "login" ? "Sign in" : (showOtpInput ? "Verify Email" : "Register Now")
                )}
              </Button>

              {showOtpInput && (
                <Button
                  variant="ghost"
                  onClick={() => setShowOtpInput(false)}
                  className="w-full text-white/50 hover:text-white"
                >
                  Cancel Verification
                </Button>
              )}
            </div>

            <div className="mt-10 flex gap-4 justify-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"><Github size={20} className="text-black" /></div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"><Twitter size={20} className="text-blue-400" /></div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"><Facebook size={20} className="text-blue-600" /></div>
            </div>

            {role !== 'admin' && (
              <p className="text-center mt-8 text-white/30 text-sm">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <span onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setShowOtpInput(false);
                }}
                  className="text-white ml-2 cursor-pointer font-medium hover:underline">
                  {mode === 'login' ? "Register" : "Login"}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Testimonial & Decorative */}
        <div className="hidden lg:flex w-[45%] bg-[#0f0f0f] relative p-12 flex-col justify-center items-center">

          {/* Abstract Lines */}
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
              <Button size="icon" variant="outline" className="rounded-lg border-white/10 hover:bg-white/10 text-white"><ArrowLeft className="size-5" /></Button>
              <Button size="icon" className="rounded-lg bg-green-900/50 hover:bg-green-900 text-green-400"><ArrowLeft className="size-5 rotate-180" /></Button>
            </div>
          </div>

          {/* Floating Card */}
          <div className="absolute bottom-10 right-[-30px] bg-white text-black p-6 rounded-3xl w-[280px] shadow-2xl skew-x-[-2deg] hover:translate-y-[-5px] transition-transform">
            <h4 className="font-bold text-lg mb-2 leading-tight">Get your right food at the right place</h4>
            <p className="text-xs text-black/60 mb-4">Be among the first students to experience the easiest way to find meals.</p>
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
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

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}