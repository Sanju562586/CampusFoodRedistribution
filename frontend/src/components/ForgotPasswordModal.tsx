import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import api from "@/lib/axios";
import { Loader2, ArrowRight, CheckCircle2, KeyRound, Mail, Lock, X, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
    const [step, setStep] = useState<"email" | "otp" | "reset">("email");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [success, setSuccess] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Step 1: Send OTP
    const handleSendOtp = async () => {
        if (!email) return;
        setLoading(true);
        try {
            await api.post("/auth/forgot-password", { email });
            setStep("otp");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async () => {
        if (!otp) return;
        setLoading(true);
        try {
            await api.post("/auth/verify-otp", { email, otp });
            setStep("reset");
        } catch (err: any) {
            alert(err.response?.data?.message || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) return alert("Please fill all fields");
        if (newPassword !== confirmPassword) return alert("Passwords do not match");

        setLoading(true);
        try {
            await api.post("/auth/reset-password", {
                email,
                otp,
                newPassword
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setStep("email");
                setSuccess(false);
                setEmail("");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
            }, 2000);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent showCloseButton={false} className="sm:max-w-[400px] bg-zinc-950/90 backdrop-blur-xl border border-white/5 text-white shadow-2xl rounded-[32px] overflow-hidden p-0 outline-none">
                {/* Refined Background Gradients */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-20%] right-[-20%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 p-8 pt-10">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all duration-300 transform hover:rotate-90"
                    >
                        <X className="size-5" />
                    </button>

                    <DialogHeader className="flex flex-col items-center text-center space-y-4 mb-8">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-400/20 to-purple-600/20 border border-white/5 flex items-center justify-center shadow-inner shadow-white/5 ring-1 ring-white/10">
                            <KeyRound className="size-7 text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]" />
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                                {success ? "All Set!" : step === "email" ? "Reset Password" : step === "otp" ? "Verify Code" : "New Password"}
                            </DialogTitle>
                            <DialogDescription className="text-white/40 text-sm font-medium tracking-wide">
                                {success
                                    ? "Your password has been updated."
                                    : step === "email"
                                        ? "Enter your email to receive a code"
                                        : step === "otp"
                                            ? `We sent a code to ${email}`
                                            : "Create a strong password"}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="flex flex-col items-center justify-center py-6"
                            >
                                <div className="w-24 h-24 bg-gradient-to-tr from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                                    <CheckCircle2 className="size-10 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {step === "email" && (
                                    <>
                                        <div className="space-y-1.5">
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Mail className="size-5 text-white/30 group-focus-within:text-orange-400 transition-colors duration-300" />
                                                </div>
                                                <Input
                                                    placeholder="name@example.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-12 h-14 bg-white/5 border-white/5 text-white placeholder:text-white/20 rounded-2xl focus:bg-white/10 focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleSendOtp}
                                            disabled={loading || !email}
                                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold text-lg hover:opacity-90 hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] active:scale-[0.98] transition-all duration-300"
                                        >
                                            {loading ? <Loader2 className="animate-spin size-6" /> : "Send Code"}
                                        </Button>
                                    </>
                                )}

                                {step === "otp" && (
                                    <>
                                        <div className="relative">
                                            <Input
                                                placeholder="000000"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                className="h-20 text-center text-4xl tracking-[0.5em] font-mono font-bold bg-white/5 border-white/5 text-white rounded-2xl focus:bg-white/10 focus:border-orange-500/30 ring-offset-0 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 selection:bg-orange-500/30"
                                                maxLength={6}
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setStep("email")}
                                                className="flex-1 h-14 rounded-2xl hover:bg-white/5 text-white/50 hover:text-white transition-all font-medium"
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                onClick={handleVerifyOtp}
                                                disabled={loading || otp.length < 6}
                                                className="flex-[2] h-14 rounded-2xl bg-white text-black font-bold text-lg hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all duration-300"
                                            >
                                                {loading ? <Loader2 className="animate-spin size-6" /> : "Verify"}
                                            </Button>
                                        </div>
                                    </>
                                )}

                                {step === "reset" && (
                                    <>
                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="size-5 text-white/30 group-focus-within:text-orange-400 transition-colors duration-300" />
                                                </div>
                                                <Input
                                                    type={showNewPassword ? "text" : "password"}
                                                    placeholder="New password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="pl-12 pr-12 h-14 bg-white/5 border-white/5 text-white placeholder:text-white/20 rounded-2xl focus:bg-white/10 focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/60 hover:bg-black p-1.5 rounded-full focus:outline-none transition-all duration-300 shadow-sm"
                                                >
                                                    {showNewPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                                </button>
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="size-5 text-white/30 group-focus-within:text-orange-400 transition-colors duration-300" />
                                                </div>
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="pl-12 pr-12 h-14 bg-white/5 border-white/5 text-white placeholder:text-white/20 rounded-2xl focus:bg-white/10 focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/60 hover:bg-black p-1.5 rounded-full focus:outline-none transition-all duration-300 shadow-sm"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleResetPassword}
                                            disabled={loading || !newPassword || !confirmPassword}
                                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold text-lg hover:opacity-90 hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] active:scale-[0.98] transition-all duration-300 mt-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin size-6" /> : "Reset Password"}
                                        </Button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
