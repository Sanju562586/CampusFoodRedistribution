"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { TrophyIcon } from "lucide-react";

export default function LeaderboardPage() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        api.get("/auth/leaderboard")
            .then((res) => setUsers(res.data))
            .catch((err) => console.error(err));
    }, []);

    return (
        <ProtectedRoute allowedRole="student">
            <div className="min-h-screen bg-background text-foreground p-10">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                    <TrophyIcon className="text-yellow-500" /> Leaderboard
                </h1>

                <div className="grid gap-4 max-w-2xl">
                    {users.map((user: any, index) => (
                        <Card key={user.id} className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? "bg-yellow-500 text-black" :
                                        index === 1 ? "bg-gray-400 text-black" :
                                            index === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                                    }`}>
                                    {index + 1}
                                </div>
                                <p className="font-medium">{user.name}</p>
                            </div>
                            <p className="font-bold text-lg">{user.points} pts</p>
                        </Card>
                    ))}
                </div>
            </div>
        </ProtectedRoute>
    );
}
