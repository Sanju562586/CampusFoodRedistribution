"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/axios";
import { getAuth, clearAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, History, PlusCircle, LogOutIcon, DollarSign, ScanLine, Utensils, Hash, Clock, MapPin, Tag, Camera, Upload, X } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { motion } from "framer-motion";
import HistoryDetailsModal from "@/components/HistoryDetailsModal";
import { Scanner } from '@yudiel/react-qr-scanner';

export default function DonorPage() {
    const [activeTab, setActiveTab] = useState<"post" | "pickup" | "history" | "analytics">("post");
    const [user, setUser] = useState<any>(null);

    // Form State
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState(""); // New Price State
    const [expiry, setExpiry] = useState("");
    const [hall, setHall] = useState("");
    const [landmark, setLandmark] = useState("");
    const [allergens, setAllergens] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [image, setImage] = useState<string | null>(null);

    // Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (isCameraOpen && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraOpen]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Camera access denied:", err);
            alert("Could not access camera. Please allow camera permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/jpeg");
                setImage(dataUrl);
            }
            stopCamera();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Pickup State
    const [pickupCode, setPickupCode] = useState("");
    const [pickupResult, setPickupResult] = useState<any>(null);
    const [pickupError, setPickupError] = useState("");
    const [pickupLoading, setPickupLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedFood, setSelectedFood] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        if (activeTab === "history") {
            setHistoryLoading(true);
            api.get("/food/my-listings")
                .then(res => setHistory(res.data))
                .catch(err => console.error("Failed to fetch history", err))
                .finally(() => setHistoryLoading(false));
        }
    }, [activeTab]);

    useEffect(() => {
        setUser(getAuth());
    }, []);

    const toggleAllergen = (a: string) => {
        setAllergens((prev) =>
            prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
        );
    };

    const handlePost = async () => {
        setLoading(true);
        setMessage("");

        try {
            // NOTE: Location is implicitly handled by backend for donors
            await api.post("/food/create", {
                name,
                quantity: Number(quantity),
                expiry_time: new Date(expiry).toISOString(),
                dining_hall: hall,
                location: hall, // Broad Area
                landmark: landmark, // Specific Location
                price: price ? Number(price) : 0, // Send price or 0
                allergens,
                image_url: image
            });

            setMessage("✅ Food posted successfully");
            setName("");
            setQuantity("");
            setPrice("");
            setExpiry("");
            setExpiry("");
            setHall("");
            setLandmark("");
            setAllergens([]);
            setImage(null);
        } catch (err: any) {
            setMessage("❌ Failed to post food");
            if (err.response?.data?.message) {
                setMessage(`❌ ${err.response.data.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPickup = async (overrideCode?: string) => {
        const codeToVerify = overrideCode || pickupCode;
        if (!codeToVerify) return;

        setPickupLoading(true);
        setPickupError("");
        setPickupResult(null);

        try {
            const res = await api.post("/reservation/pickup", {
                reservation_code: codeToVerify.trim().toUpperCase(),
            });
            setPickupResult(res.data);
            setPickupCode(""); // Clear code after success
        } catch (err: any) {
            setPickupError(err.response?.data?.message || "Verification failed");
        } finally {
            setPickupLoading(false);
        }
    };

    const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
        <div
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-md transition-all ${activeTab === id
                ? "bg-green-500/10 text-green-600 font-semibold"
                : "text-muted-foreground hover:bg-accent"
                }`}
        >
            <Icon className="size-5" />
            <span>{label}</span>
        </div>
    );

    return (
        <ProtectedRoute allowedRole="donor">
            <div className="flex min-h-screen bg-background">

                {/* Sidebar */}
                <aside className="w-64 border-r border-border p-6 flex flex-col hidden md:flex">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-700 bg-clip-text text-transparent">
                            Partner Portal
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1">Hello, {user?.name || "Partner"}</p>
                    </div>

                    <nav className="space-y-2 flex-1">
                        <SidebarItem id="post" label="Post New Food" icon={PlusCircle} />
                        <SidebarItem id="pickup" label="Verify Pickup" icon={ScanLine} />
                        <SidebarItem id="history" label="Donation History" icon={History} />
                        <SidebarItem id="analytics" label="Impact & Revenue" icon={DollarSign} />
                    </nav>

                    <Button
                        variant="ghost"
                        className="justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { clearAuth(); window.location.href = "/login"; }}
                    >
                        <LogOutIcon className="mr-2 size-4" />
                        Logout
                    </Button>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 overflow-y-auto relative">
                    <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
                        <ModeToggle />
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                            onClick={() => { clearAuth(); window.location.href = "/login"; }}
                        >
                            <LogOutIcon className="mr-2 size-4 hidden sm:inline" />
                            <span className="hidden sm:inline">Logout</span>
                            <LogOutIcon className="size-4 sm:hidden" />
                        </Button>
                    </div>
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === "post" && (
                            <div className="max-w-4xl mx-auto pb-12">
                                <div className="mb-10 text-center space-y-2">
                                    <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                                        Share Your Surplus
                                    </h2>
                                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                                        Turn your extra food into a meal for someone in need. It's quick, easy, and impactful.
                                    </p>
                                </div>

                                <Card className="overflow-hidden border-none shadow-2xl bg-card/80 backdrop-blur-xl ring-1 ring-border/50 rounded-[2.5rem]">
                                    <div className="p-8 md:p-10 space-y-10">

                                        {/* SECTION: BASIC DETAILS */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                                                <div className="p-2 bg-green-500/10 rounded-xl">
                                                    <Utensils className="size-5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-foreground">Food Details</h3>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                                                {/* Image Upload - Enhanced */}
                                                <div className="space-y-3">
                                                    <label className="text-sm font-semibold text-foreground/80 ml-1">Food Photo</label>
                                                    {isCameraOpen ? (
                                                        <div className="group relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden border-2 border-border shadow-sm bg-black">
                                                            <video 
                                                                ref={videoRef} 
                                                                autoPlay 
                                                                playsInline 
                                                                className="w-full h-full object-cover" 
                                                            />
                                                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-4 z-10">
                                                                <button 
                                                                    onClick={(e) => { e.preventDefault(); stopCamera(); }}
                                                                    className="bg-red-500/80 hover:bg-red-600 text-white font-bold py-2.5 px-6 rounded-full backdrop-blur-md transition-colors shadow-lg"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.preventDefault(); capturePhoto(); }}
                                                                    className="bg-white hover:bg-gray-200 text-black font-bold py-2.5 px-6 rounded-full backdrop-blur-md transition-colors shadow-xl flex items-center gap-2"
                                                                >
                                                                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" /> Capture
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : image ? (
                                                        <div className="group relative w-full aspect-square rounded-3xl overflow-hidden border-2 border-border shadow-sm">
                                                            <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                                            <button 
                                                                onClick={(e) => { e.preventDefault(); setImage(null); }}
                                                                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md transition-colors shadow-xl"
                                                                title="Remove Photo"
                                                            >
                                                                <X className="size-5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full aspect-square rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-border bg-muted/20 px-4 sm:px-6 text-center">
                                                            <div className="w-16 h-16 rounded-full bg-background shadow-sm flex items-center justify-center mb-4">
                                                                <Camera className="size-8 text-muted-foreground opacity-70" />
                                                            </div>
                                                            <p className="font-semibold text-foreground mb-1">Add a photo</p>
                                                            <p className="text-xs text-muted-foreground/80 mb-6 max-w-[200px]">Take a fresh picture or upload from your device gallery</p>
                                                            
                                                            <div className="flex flex-col gap-3 w-full max-w-[220px]">
                                                                <button 
                                                                    onClick={(e) => { e.preventDefault(); startCamera(); }}
                                                                    className="w-full flex items-center justify-center gap-2 bg-green-500/10 text-green-700 dark:text-green-500 hover:bg-green-500/20 py-3.5 rounded-xl font-bold transition-all border border-green-500/20 active:scale-95"
                                                                >
                                                                    <Camera className="size-5" /> Take Photo
                                                                </button>
                                                                <label className="w-full cursor-pointer relative overflow-hidden block">
                                                                    <div className="w-full flex items-center justify-center gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-500 hover:bg-blue-500/20 py-3.5 rounded-xl font-bold transition-all border border-blue-500/20 active:scale-95">
                                                                        <Upload className="size-5" /> Upload File
                                                                    </div>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleImageUpload}
                                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Fields */}
                                                <div className="space-y-6">
                                                    <div className="space-y-3">
                                                        <label className="text-sm font-semibold text-foreground/80 ml-1">Item Name</label>
                                                        <div className="relative group">
                                                            <Utensils className="absolute left-4 top-3.5 size-5 text-muted-foreground group-focus-within:text-green-500 transition-colors" />
                                                            <Input
                                                                value={name}
                                                                onChange={(e) => setName(e.target.value)}
                                                                placeholder="e.g. Spicy Chicken Wrap"
                                                                className="pl-12 h-12 bg-background/50 border-input group-hover:border-green-500/30 focus:border-green-500 focus:ring-green-500/20 rounded-2xl transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <label className="text-sm font-semibold text-foreground/80 ml-1">Quantity Available</label>
                                                        <div className="relative group">
                                                            <Hash className="absolute left-4 top-3.5 size-5 text-muted-foreground group-focus-within:text-green-500 transition-colors" />
                                                            <Input
                                                                type="number"
                                                                value={quantity}
                                                                onChange={(e) => setQuantity(e.target.value)}
                                                                placeholder="Qty"
                                                                className="pl-12 h-12 bg-background/50 border-input group-hover:border-green-500/30 focus:border-green-500 focus:ring-green-500/20 rounded-2xl transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label className="text-sm font-semibold text-foreground/80 ml-1">Price (₹)</label>
                                                        <div className="relative group">
                                                            <DollarSign className="absolute left-4 top-3.5 size-5 text-muted-foreground group-focus-within:text-green-500 transition-colors" />
                                                            <Input
                                                                type="number"
                                                                value={price}
                                                                onChange={(e) => setPrice(e.target.value)}
                                                                placeholder="0 for Free"
                                                                className="pl-12 h-12 bg-background/50 border-input group-hover:border-green-500/30 focus:border-green-500 focus:ring-green-500/20 rounded-2xl transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>


                                        {/* SECTION: LOGISTICS */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                                    <MapPin className="size-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-foreground">Logistics</h3>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <label className="text-sm font-semibold text-foreground/80 ml-1">Area / Campus Zone</label>
                                                    <div className="relative group">
                                                        <MapPin className="absolute left-4 top-3.5 size-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                                                        <Input
                                                            value={hall}
                                                            onChange={(e) => setHall(e.target.value)}
                                                            placeholder="e.g. North Campus"
                                                            className="pl-12 h-12 bg-background/50 border-input group-hover:border-blue-500/30 focus:border-blue-500 focus:ring-blue-500/20 rounded-2xl transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-sm font-semibold text-foreground/80 ml-1">Specific Landmark / Room</label>
                                                    <div className="relative group">
                                                        <MapPin className="absolute left-4 top-3.5 size-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                                                        <Input
                                                            value={landmark}
                                                            onChange={(e) => setLandmark(e.target.value)}
                                                            placeholder="e.g. Near Library, Room 304"
                                                            className="pl-12 h-12 bg-background/50 border-input group-hover:border-blue-500/30 focus:border-blue-500 focus:ring-blue-500/20 rounded-2xl transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-sm font-semibold text-foreground/80 ml-1">Best Before</label>
                                                    <div className="relative group">
                                                        <Clock className="absolute left-4 top-3.5 size-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                                                        <Input
                                                            type="datetime-local"
                                                            value={expiry}
                                                            onChange={(e) => setExpiry(e.target.value)}
                                                            className="pl-12 h-12 bg-background/50 border-input group-hover:border-blue-500/30 focus:border-blue-500 focus:ring-blue-500/20 rounded-2xl transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION: DIETARY */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                                                <div className="p-2 bg-orange-500/10 rounded-xl">
                                                    <Tag className="size-5 text-orange-600 dark:text-orange-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-foreground">Dietary & Allergens</h3>
                                            </div>

                                            <div className="bg-muted/20 rounded-3xl p-6 border border-border/40">
                                                <div className="flex flex-wrap gap-3">
                                                    {["Vegetarian", "Vegan", "Gluten-Free", "Nuts", "Dairy", "Spicy", "Halal", "Kosher"].map((a) => (
                                                        <div
                                                            key={a}
                                                            onClick={() => toggleAllergen(a)}
                                                            className={`
                                                                cursor-pointer px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 select-none flex items-center gap-2 border
                                                                ${allergens.includes(a)
                                                                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white border-transparent shadow-lg shadow-green-500/20 scale-[1.02]"
                                                                    : "bg-background border-border text-muted-foreground hover:border-green-500/30 hover:bg-green-500/5"
                                                                }
                                                            `}
                                                        >
                                                            {allergens.includes(a) && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                            {a}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* FOOTER ACTIONS */}
                                    <div className="bg-muted/30 p-8 border-t border-border/50 flex flex-col gap-6">
                                        <div className="flex items-center justify-between gap-4">
                                            {message && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 ${message.includes("✅")
                                                        ? "bg-green-500/10 text-green-700 border border-green-200 dark:border-green-900"
                                                        : "bg-red-500/10 text-red-700 border border-red-200 dark:border-red-900"
                                                        }`}
                                                >
                                                    {message}
                                                </motion.div>
                                            )}
                                        </div>

                                        <Button
                                            onClick={handlePost}
                                            disabled={loading}
                                            className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-xl shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.01] active:scale-[0.98] transition-all"
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Publishing Listing...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <PlusCircle className="size-6" />
                                                    Publish Listing Now
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </Card>
                            </div >
                        )
                        }


                        {
                            activeTab === "pickup" && (
                                <div className="max-w-md mx-auto">
                                    <h1 className="text-2xl font-bold mb-8 text-center">Pickup Verification 📷</h1>

                                    <Card className="p-6 space-y-6 shadow-md">
                                        {/* QR Scanner Toggle */}
                                        <div className="flex justify-center mb-2">
                                            <Button 
                                                variant={isScanning ? "destructive" : "outline"} 
                                                onClick={() => setIsScanning(!isScanning)}
                                                className="w-full"
                                            >
                                                <ScanLine className="mr-2 size-4" />
                                                {isScanning ? "Stop Scanning" : "Scan QR Code"}
                                            </Button>
                                        </div>

                                        {isScanning && (
                                            <div className="rounded-xl overflow-hidden border-2 border-green-500/50 mb-6 aspect-square w-full">
                                                <Scanner onScan={(result) => {
                                                    if (result && result.length > 0) {
                                                        const code = result[0].rawValue;
                                                        if (code) {
                                                            setPickupCode(code);
                                                            setIsScanning(false);
                                                            handleVerifyPickup(code);
                                                        }
                                                    }
                                                }} />
                                            </div>
                                        )}

                                        {!isScanning && (
                                            <div className="flex items-center gap-4 py-2">
                                                <div className="h-px flex-1 bg-border"></div>
                                                <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Or enter manually</span>
                                                <div className="h-px flex-1 bg-border"></div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Reservation Code</label>
                                            <Input
                                                value={pickupCode}
                                                onChange={(e) => setPickupCode(e.target.value)}
                                                placeholder="Enter 8-digit code"
                                                className="text-center text-lg uppercase tracking-widest"
                                            />
                                        </div>

                                        <Button
                                            className="w-full"
                                            onClick={() => handleVerifyPickup()}
                                            disabled={pickupLoading || !pickupCode}
                                        >
                                            {pickupLoading ? "Verifying..." : "Verify Pickup"}
                                        </Button>

                                        {/* Result */}
                                        {pickupResult && (
                                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-md text-center space-y-2">
                                                <p className="text-green-600 font-bold text-lg">✅ Pickup Confirmed</p>
                                                <div className="text-left text-sm text-foreground">
                                                    <p><b>Food:</b> {pickupResult.reservation.Food.name}</p>
                                                    <p><b>Qty:</b> {pickupResult.reservation.quantity}</p>
                                                    <p><b>Code:</b> {pickupResult.reservation.reservation_code}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Error */}
                                        {pickupError && (
                                            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md text-center">
                                                <p className="text-destructive font-bold">❌ {pickupError}</p>
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            )
                        }

                        {
                            activeTab === "history" && (
                                <div className="max-w-4xl mx-auto">
                                    <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
                                        <History className="size-6 text-green-600" />
                                        Donation History
                                    </h1>

                                    {historyLoading ? (
                                        <div className="flex justify-center p-10">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                        </div>
                                    ) : history.length === 0 ? (
                                        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
                                            <History className="size-12 mx-auto mb-4 opacity-50" />
                                            <h3 className="text-lg font-medium">No History Yet</h3>
                                            <p className="text-muted-foreground">Your past food listings will appear here.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {history.map((item: any) => {
                                                const isExpired = new Date(item.expiry_time) < new Date();
                                                const isAvailable = item.quantity > 0;
                                                const postDate = new Date(item.createdAt).toLocaleDateString();
                                                const expiryDate = new Date(item.expiry_time).toLocaleDateString();

                                                return (
                                                    <Card
                                                        key={item.id}
                                                        className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:shadow-lg transition-shadow border-l-4 border-l-green-500 cursor-pointer active:scale-[0.99]"
                                                        onClick={() => {
                                                            setSelectedFood(item);
                                                            setIsDetailsOpen(true);
                                                        }}
                                                    >
                                                        <div className="flex gap-4 items-center">
                                                            <div className="h-16 w-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                                                                {item.image_url ? (
                                                                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <div className="h-full w-full flex items-center justify-center text-2xl">🍔</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-lg">{item.name}</h3>
                                                                <div className="flex gap-2 text-sm text-muted-foreground">
                                                                    <span className="flex items-center gap-1"><Hash className="size-3" /> Qty: {item.quantity}</span>
                                                                    <span className="flex items-center gap-1"><Clock className="size-3" /> Exp: {expiryDate}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col md:items-end gap-1">
                                                            {isExpired ? (
                                                                <Badge variant="destructive">Expired</Badge>
                                                            ) : isAvailable ? (
                                                                <Badge variant="default" className="bg-green-500">Available</Badge>
                                                            ) : (
                                                                <Badge variant="secondary">Claimed</Badge>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                Posted: {postDate}
                                                            </span>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <HistoryDetailsModal
                                        open={isDetailsOpen}
                                        onClose={() => setIsDetailsOpen(false)}
                                        food={selectedFood}
                                    />
                                </div>
                            )
                        }

                        {
                            activeTab === "analytics" && (
                                <div className="text-center py-20 text-muted-foreground">
                                    <DollarSign className="size-12 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium">Analytics Dashboard</h3>
                                    <p>Revenue and impact statistics coming soon.</p>
                                </div>
                            )
                        }

                    </motion.div >
                </main >
            </div >
        </ProtectedRoute >
    );
}
