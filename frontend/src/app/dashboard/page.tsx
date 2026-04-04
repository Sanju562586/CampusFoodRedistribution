"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import FoodCard from "@/components/FoodCard";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuth } from "@/lib/auth";
import Pusher from "pusher-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileTab from "@/components/ProfileTab";
import { Sparkles, Utensils, Settings } from "lucide-react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "profile" ? "profile" : "food";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [foods, setFoods] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");

  const filteredFoods = selectedLocation === "all"
    ? foods
    : foods.filter(f => (f.location || f.dining_hall) === selectedLocation);

  // Sync state with URL if it changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "food") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch all initial data
  const fetchData = async () => {
    try {
      const [foodRes, userRes, aiRes] = await Promise.all([
        api.get("/food/available"),
        api.get("/auth/user/me").catch(() => ({ data: getAuth() })),
        api.get("/ai/recommend").catch(() => ({ data: null }))
      ]);

      setFoods(foodRes.data);
      setUserInfo(userRes.data);
      setRecommendations(aiRes.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Pusher real-time connection
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe("food-channel");

    channel.bind("food_update", (data: { foodId: number, quantity: number }) => {
      setFoods((prevFoods) =>
        prevFoods.map(food =>
          food.id === data.foodId ? { ...food, quantity: data.quantity } : food
        )
      );
    });

    channel.bind("food_added", (newFood: any) => {
      setFoods((prevFoods) => [newFood, ...prevFoods]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  const handleProfileUpdate = () => {
    fetchData();
  };

  if (!userInfo && loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Hello, {userInfo?.name || "Student"}! 👋</h1>
          <p className="text-muted-foreground">Find freshness around you.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl flex flex-wrap h-auto w-full md:w-auto justify-start">
          <TabsTrigger value="food" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4 md:px-6 flex-1 md:flex-initial">
            <Utensils className="mr-2 size-4" /> Available
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4 md:px-6 flex-1 md:flex-initial">
            <Settings className="mr-2 size-4" /> Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="food" className="space-y-8 animate-in fade-in-50 duration-500">
          {/* AI Recommendations Section */}
          {recommendations && recommendations.data && recommendations.data.length > 0 && activeTab === 'food' && (
            <div className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="size-32" />
              </div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                  <Sparkles className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-purple-900 dark:text-purple-100">Recommended For You</h3>
                  <p className="text-sm text-muted-foreground">{recommendations.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                {recommendations.data.map((food: any) => (
                  <FoodCard key={food.id} food={food} />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-2xl">🍱</span> All Available Food
              </h2>

              <div className="flex items-center gap-2 bg-background/50 p-1 rounded-xl border border-border/50 backdrop-blur-sm">
                <span className="text-sm font-medium ml-3 text-muted-foreground">📍 Filter:</span>
                <select
                  className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors outline-none"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="all">All Locations</option>
                  {[...new Set(foods.map(f => f.location || f.dining_hall))].filter(Boolean).sort().map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredFoods.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed border-border">
                <span className="text-4xl">🍽️</span>
                <h3 className="text-xl font-semibold mt-4">No food available {selectedLocation !== 'all' ? 'at this location' : 'right now'}</h3>
                <p className="text-muted-foreground">{selectedLocation !== 'all' ? 'Try checking other locations!' : 'Check back later for new listings!'}</p>
                {selectedLocation !== 'all' && (
                  <Button variant="link" onClick={() => setSelectedLocation('all')} className="mt-2 text-primary">
                    View All Locations
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFoods.map((food: any) => (
                  <FoodCard key={food.id} food={food} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile" className="animate-in fade-in-50 duration-500">
          <ProfileTab user={userInfo || {}} onUpdate={handleProfileUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRole="student">
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  )
}
