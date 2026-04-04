"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { clearAuth, getAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Utensils,
  ScanLine,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Search,
  Trash2
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { motion } from "framer-motion";
import Pusher from "pusher-js";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "food" | "analytics">("overview");
  const [stats, setStats] = useState({ users: 0, activeFoodCount: 0, activeDonors: 0, activeStudents: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [food, setFood] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Fetch Data on Load & listen via Pusher
  useEffect(() => {
    fetchDashboardData();

    // Pusher real-time connection
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe("food-channel");

    channel.bind("food_added", (newFood: any) => {
      setFood((prevFood) => [newFood, ...prevFood]);
      setStats((prev) => ({ ...prev, activeFoodCount: prev.activeFoodCount + 1 }));
    });

    channel.bind("food_update", (data: { foodId: number, quantity: number }) => {
      setFood((prevFood) =>
        prevFood.map((f) =>
          f.id === data.foodId ? { ...f, quantity: data.quantity } : f
        )
      );
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  const fetchDashboardData = async () => {
    // Only show loading on initial load or if data is empty
    if (!users.length && !food.length) setLoading(true);

    try {
      const [usersRes, foodRes, statsRes, aiRes] = await Promise.all([
        api.get("/auth/users").catch(() => ({ data: [] })),
        api.get("/food/all").catch(() => ({ data: [] })),
        api.get("/food/stats").catch(() => ({ data: { activeCount: 0 } })),
        api.get("/ai/waste-prediction").catch(() => ({ data: null }))
      ]);

      setUsers(usersRes.data);
      setFood(foodRes.data);
      setAnalytics(aiRes.data);

      setStats({
        users: usersRes.data.length,
        activeFoodCount: statsRes.data.activeCount,
        activeDonors: usersRes.data.filter((u: any) => u.role === 'donor').length,
        activeStudents: usersRes.data.filter((u: any) => u.role === 'student').length
      });

    } catch (error) {
      console.error("Failed to load admin data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = async () => {
    if (!analytics?.suggestionType || analytics.suggestionType === 'NONE') return;

    setApplying(true);
    try {
      const res = await api.post("/ai/apply-suggestion", { type: analytics.suggestionType });
      alert(res.data.message); // Simple feedback
      fetchDashboardData(); // Refresh immediately
    } catch (error) {
      console.error("Failed to apply suggestion", error);
      alert("Failed to apply action.");
    } finally {
      setApplying(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.delete(`/auth/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setStats(prev => ({
        ...prev,
        users: prev.users - 1,
        activeDonors: users.find(u => u.id === userId)?.role === 'donor'
          ? prev.activeDonors - 1
          : prev.activeDonors,
        activeStudents: users.find(u => u.id === userId)?.role === 'student'
          ? prev.activeStudents - 1
          : prev.activeStudents
      }));
    } catch (error) {
      console.error("Failed to delete user", error);
      alert("Failed to delete user");
    }
  };

  const handleDeleteFood = async (foodId: number) => {
    if (!confirm("Are you sure you want to remove this food listing?")) return;

    try {
      await api.delete(`/food/${foodId}`);
      setFood(prev => prev.filter(f => f.id !== foodId));
      setStats(prev => ({
        ...prev,
        activeFoodCount: prev.activeFoodCount - 1
      }));
    } catch (error) {
      console.error("Failed to delete food", error);
      alert("Failed to remove food listing");
    }
  };

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
    <div
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl transition-all mb-2 ${activeTab === id
        ? "bg-purple-600 text-white font-semibold shadow-lg shadow-purple-900/20"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
    >
      <Icon className="size-5" />
      <span>{label}</span>
    </div>
  );

  return (
    <ProtectedRoute allowedRole="admin">
      <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-purple-500/30">

        {/* SIDEBAR */}
        <aside className="w-72 border-r border-border p-6 hidden lg:flex flex-col bg-card/40 backdrop-blur-xl fixed h-full z-50">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="h-10 w-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Portal</h1>
              <p className="text-xs text-muted-foreground">God Mode</p>
            </div>
          </div>

          <nav className="flex-1">
            <SidebarItem id="overview" label="Overview" icon={LayoutDashboard} />
            <SidebarItem id="users" label="User Management" icon={Users} />
            <SidebarItem id="food" label="Food Oversight" icon={Utensils} />
            <SidebarItem id="analytics" label="AI Analytics" icon={TrendingUp} />
          </nav>

          <Button
            variant="ghost"
            className="justify-start text-red-400 hover:text-red-300 hover:bg-red-900/10 mt-auto"
            onClick={() => { clearAuth(); window.location.href = "/login"; }}
          >
            <LogOut className="mr-2 size-4" /> Sign Out
          </Button>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 lg:ml-72 p-4 sm:p-10 relative mb-24 lg:mb-0">
          <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
              onClick={() => { clearAuth(); window.location.href = "/login"; }}
            >
              <LogOut className="mr-2 size-4 hidden sm:inline" />
              <span className="hidden sm:inline">Logout</span>
              <LogOut className="size-4 sm:hidden" />
            </Button>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold">System Overview</h2>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="p-6 bg-purple-600/10 border-purple-600/20">
                    <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">Total Users</h3>
                    <p className="text-4xl font-bold text-purple-400">{Math.max((stats?.users ?? 0) - 1, 0)}</p>
                  </Card>
                  <Card className="p-6 bg-blue-600/10 border-blue-600/20">
                    <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">Active Food Listings</h3>
                    <p className="text-4xl font-bold text-blue-400">{stats.activeFoodCount}</p>
                  </Card>
                  <Card className="p-6 bg-green-600/10 border-green-600/20">
                    <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">Registered Donors</h3>
                    <p className="text-4xl font-bold text-green-400">{stats.activeDonors}</p>
                  </Card>
                  <Card className="p-6 bg-orange-600/10 border-orange-600/20">
                    <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-2">Registered Students</h3>
                    <p className="text-4xl font-bold text-orange-400">{stats.activeStudents}</p>
                  </Card>
                </div>

                {analytics && (
                  <Card className="p-8 bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="text-orange-500" />
                        <h3 className="text-xl font-bold text-orange-400">AI Waste Prediction Alert</h3>
                      </div>
                      <p className="text-xl font-medium mb-3">{analytics.details}</p>
                      <p className="text-muted-foreground">Suggestion: {analytics.suggestion}</p>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold">User Management</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <Input placeholder="Search users..." className="pl-10 bg-muted/50 border-input rounded-full w-64 text-foreground" />
                  </div>
                </div>

                {/* Donors Section */}
                <div>
                  <h3 className="text-xl font-bold mb-4 text-green-400">Donors</h3>
                  <div className="rounded-2xl border border-border overflow-x-auto bg-card mb-8">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                        <tr>
                          <th className="p-4">User</th>
                          <th className="p-4">Points</th>
                          <th className="p-4">Joined</th>
                          <th className="p-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {users.filter(u => u.role === 'donor').map(u => (
                          <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                            <td className="p-4">
                              <div className="font-medium text-foreground">{u.name || "Unknown"}</div>
                              <div className="text-sm text-muted-foreground">{u.email}</div>
                            </td>
                            <td className="p-4 font-mono text-muted-foreground">{u.points}</td>
                            <td className="p-4 text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="p-4">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full"
                                onClick={() => handleDeleteUser(u.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Students Section */}
                <div>
                  <h3 className="text-xl font-bold mb-4 text-blue-400">Students</h3>
                  <div className="rounded-2xl border border-border overflow-x-auto bg-card">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                        <tr>
                          <th className="p-4">User</th>
                          <th className="p-4">Points</th>
                          <th className="p-4">Joined</th>
                          <th className="p-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {users.filter(u => u.role === 'student').map(u => (
                          <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                            <td className="p-4">
                              <div className="font-medium text-foreground">{u.name || "Unknown"}</div>
                              <div className="text-sm text-muted-foreground">{u.email}</div>
                            </td>
                            <td className="p-4 font-mono text-muted-foreground">{u.points}</td>
                            <td className="p-4 text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="p-4">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-full"
                                onClick={() => handleDeleteUser(u.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'food' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold">Food Oversight</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Array.isArray(food) && food.map((f: any) => {
                    const isExpired = new Date(f.expiry_time) < new Date();
                    const isAvailable = f.quantity > 0;
                    
                    return (
                      <Card key={f.id} className="p-4 bg-card border-border flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg mb-1">{f.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-semibold text-foreground/80">{f.donor?.name || "Unknown Donor"}</span> • {f.dining_hall} • Qty: {f.quantity}
                          </p>
                          <div className="flex gap-2 mb-3">
                            {isExpired ? (
                              <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">Expired</Badge>
                            ) : isAvailable ? (
                              <Badge variant="default" className="bg-green-500 text-[10px] uppercase font-bold tracking-wider">Available</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">Claimed</Badge>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {Array.isArray(f.allergens) && f.allergens.map((a: string) => (
                              <Badge key={a} variant="outline" className="text-xs border-border text-muted-foreground">{a}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50"
                          onClick={() => handleDeleteFood(f.id)}
                        >
                          Remove
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <TrendingUp className="text-purple-400" /> AI Analytics & Predictions
                </h2>

                {analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/20">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <AlertTriangle className="text-orange-400" /> Waste Risk Assessment
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground uppercase tracking-wider">Risk Level</p>
                            <p className="text-2xl font-bold text-orange-400">{analytics.analysis || "Moderate"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground uppercase tracking-wider">At Risk Items</p>
                            <p className="text-4xl font-bold text-foreground">{analytics.atRiskCount || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground uppercase tracking-wider">Prediction</p>
                            <p className="text-lg">{analytics.details}</p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <ScanLine className="text-green-400" /> AI Optimization Suggestion
                        </h3>
                        <div className="flex flex-col justify-between h-full">
                          <p className="text-xl font-medium italic text-green-100/80">"{analytics.suggestion}"</p>
                          <div className="mt-6">
                            <Button
                              variant="outline"
                              className="w-full border-green-500/30 hover:bg-green-500/10 text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={handleApplySuggestion}
                              disabled={!analytics.suggestionType || analytics.suggestionType === 'NONE' || applying}
                            >
                              {applying ? "Applying..." : "Apply Suggestion"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Environmental Impact Section */}
                    <div className="mt-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="text-green-400" /> Environmental Impact
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 bg-green-900/10 border-green-900/20">
                          <p className="text-sm text-muted-foreground uppercase tracking-wider">CO2 Saved</p>
                          <p className="text-3xl font-bold text-green-400">{analytics.environmental?.savedCO2 || 0} kg</p>
                          <p className="text-xs text-muted-foreground mt-1">From rescued food</p>
                        </Card>
                        <Card className="p-6 bg-emerald-900/10 border-emerald-900/20">
                          <p className="text-sm text-muted-foreground uppercase tracking-wider">Trees Equivalent</p>
                          <p className="text-3xl font-bold text-emerald-400">{analytics.environmental?.treesPlanted || 0}</p>
                          <p className="text-xs text-muted-foreground mt-1">Trees planted/year</p>
                        </Card>
                        <Card className="p-6 bg-red-900/10 border-red-900/20">
                          <p className="text-sm text-muted-foreground uppercase tracking-wider">Potential Waste Footprint</p>
                          <p className="text-3xl font-bold text-red-400">{analytics.environmental?.potentialWasteCO2 || 0} kg</p>
                          <p className="text-xs text-muted-foreground mt-1">If current at-risk items expire</p>
                        </Card>
                      </div>
                    </div>

                    {/* Food Lifecycle Section */}
                    <div className="mt-8 p-6 bg-card border border-border rounded-xl">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Utensils className="text-blue-400" /> Food Lifecycle & Waste Analysis
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Posted</p>
                          <p className="text-3xl font-bold text-foreground">{analytics.lifecycle?.totalPosted || 0}</p>
                          <p className="text-[10px] text-muted-foreground">All time listings</p>
                        </div>
                        <div className="p-4 bg-blue-900/10 border border-blue-900/20 rounded-lg">
                          <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">Current Active</p>
                          <p className="text-3xl font-bold text-blue-400">{analytics.lifecycle?.currentAvailable || 0}</p>
                          <p className="text-[10px] text-blue-400/70">Available now</p>
                        </div>
                        <div className="p-4 bg-green-900/10 border border-green-900/20 rounded-lg">
                          <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Successfully Rescued</p>
                          <p className="text-3xl font-bold text-green-400">{analytics.lifecycle?.pickedUp || 0}</p>
                          <p className="text-[10px] text-green-400/70">Picked up by students</p>
                        </div>
                        <div className="p-4 bg-red-900/10 border border-red-900/20 rounded-lg">
                          <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Unclaimed / Waste</p>
                          <p className="text-3xl font-bold text-red-400">{analytics.lifecycle?.expiredWaste || 0}</p>
                          <p className="text-[10px] text-red-400/70">Expired</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-12 text-muted-foreground">
                    <p>AI Model is gathering data...</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </main>
        
        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 w-full bg-card/90 backdrop-blur-md border-t border-border flex lg:hidden items-center justify-around p-2 z-50 pb-safe">
            <Button variant="ghost" className={`flex-col h-14 w-14 ${activeTab === 'overview' ? 'text-purple-400' : 'text-muted-foreground'}`} onClick={() => setActiveTab('overview')}>
              <LayoutDashboard size={20} />
            </Button>
            <Button variant="ghost" className={`flex-col h-14 w-14 ${activeTab === 'users' ? 'text-purple-400' : 'text-muted-foreground'}`} onClick={() => setActiveTab('users')}>
              <Users size={20} />
            </Button>
            <Button variant="ghost" className={`flex-col h-14 w-14 ${activeTab === 'food' ? 'text-purple-400' : 'text-muted-foreground'}`} onClick={() => setActiveTab('food')}>
              <Utensils size={20} />
            </Button>
            <Button variant="ghost" className={`flex-col h-14 w-14 ${activeTab === 'analytics' ? 'text-purple-400' : 'text-muted-foreground'}`} onClick={() => setActiveTab('analytics')}>
              <TrendingUp size={20} />
            </Button>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
