"use client";

import { useState } from "react";
import api from "@/lib/axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function PickupPage() {
    const [code, setCode] = useState("");
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const res = await api.post("/reservation/pickup", {
                reservation_code: code.trim().toUpperCase(),
            });
            console.log("Verification Result:", res.data);
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute allowedRole="admin">
            <div className="min-h-screen bg-background text-foreground p-10 flex flex-col items-center">
                <h1 className="text-3xl font-bold mb-8">Pickup Verification 📷</h1>

                <Card className="w-full max-w-md p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reservation Code</label>
                        <Input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter 8-digit code"
                            className="text-center text-lg uppercase tracking-widest"
                        />
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleVerify}
                        disabled={loading || !code}
                    >
                        {loading ? "Verifying..." : "Verify Pickup"}
                    </Button>

                    {/* Result */}
                    {result && (
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-md text-center space-y-2">
                            <p className="text-green-600 font-bold text-lg">✅ Pickup Confirmed</p>
                            <div className="text-left text-sm text-foreground">
                                <p><b>Code:</b> {result.reservation.reservation_code}</p>
                                <div className="mt-4 pt-4 border-t border-border">
                                    <p className="font-semibold mb-1">Reserver Details:</p>
                                    <p><b>Name:</b> {result.reservation.User?.name}</p>
                                    <p><b>Email:</b> {result.reservation.User?.email}</p>
                                    <p><b>Roll No:</b> {result.reservation.User?.roll_number}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md text-center">
                            <p className="text-destructive font-bold">❌ {error}</p>
                        </div>
                    )}
                </Card>
            </div>
        </ProtectedRoute>
    );
}
