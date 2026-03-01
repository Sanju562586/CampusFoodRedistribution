"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MyReservationsPage() {
    const [reservations, setReservations] = useState([]);

    useEffect(() => {
        api.get("/reservation/my")
            .then((res) => setReservations(res.data))
            .catch((err) => console.error(err));
    }, []);

    return (
        <ProtectedRoute allowedRole="student">
            <div className="min-h-screen bg-background text-foreground p-10">
                <h1 className="text-3xl font-bold mb-8">My Reservations 🎟️</h1>

                <div className="grid gap-4">
                    {reservations.length === 0 && (
                        <p className="text-muted-foreground">No reservations yet.</p>
                    )}

                    {reservations.map((res: any) => (
                        <Card key={res.id} className="p-6 flex justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                {/* QR Code */}
                                <div className="bg-white p-2 rounded-md shadow-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={res.qrCodeUrl}
                                        alt="QR Code"
                                        className="w-16 h-16 object-contain"
                                    />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold">{res.Food?.name || "Unknown Food"}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Code: <span className="font-mono bg-muted px-2 py-1 rounded">{res.reservation_code}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Qty: {res.quantity} • {res.Food?.dining_hall}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <Badge variant={res.status === "reserved" ? "default" : "secondary"}>
                                    {res.status.toUpperCase()}
                                </Badge>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </ProtectedRoute> // Fixed missing closing tag
    );
}
