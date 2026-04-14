import { useState } from "react";
import { Loader2, ArrowRight, Sparkles, SlidersHorizontal, Leaf, Sprout, ShieldPlus, ChevronRight } from "lucide-react";
import api from "@/lib/axios";
import { motion } from "framer-motion";

const ALLERGEN_OPTIONS = [
    "Peanuts", "Tree Nuts", "Dairy", "Eggs", "Soy", "Wheat/Gluten", "Fish", "Shellfish"
];

export default function ProfileTab({ user, onUpdate }: { user: { dietary_preferences?: string; allergens?: string[] }, onUpdate: () => void }) {
    const [diet, setDiet] = useState(user.dietary_preferences || "Non-Veg");
    const [allergens, setAllergens] = useState<string[]>(user.allergens || []);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const toggleAllergen = (allergen: string) => {
        setAllergens(prev =>
            prev.includes(allergen)
                ? prev.filter(a => a !== allergen)
                : [...prev, allergen]
        );
    };

    const handleSave = async () => {
        setLoading(true);
        setSuccess(false);
        try {
            await api.put("/auth/profile", {
                dietary_preferences: diet,
                allergens
            });
            setSuccess(true);
            onUpdate();
            setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
            console.error("Failed to update profile", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full pb-10 h-full flex flex-col">
            {/* Header info */}
            <div className="mb-8">
                <span className="inline-block bg-[#dcfce7] dark:bg-emerald-900/30 text-[#166534] dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                    EXCELLENCE EDITION
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-gray-50 tracking-tight mb-6">Food Preferences</h1>
                
                {/* AI note */}
                <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md p-5 rounded-2xl flex items-start gap-4">
                    <Sparkles className="w-6 h-6 text-[#1a5c2e] dark:text-emerald-400 mt-1 shrink-0" />
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 italic leading-relaxed">
                        &quot;Help our AI recommend the best food for you by setting your dietary preferences. Our machine learning models curate a sensory journey tailored to your specific biometrics and palate.&quot;
                    </p>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[2fr_1.2fr] gap-6 lg:gap-10 grow">
                
                {/* Left side: Form */}
                <div className="bg-white dark:bg-white/5 md:backdrop-blur-xl rounded-[2rem] p-6 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-white/10 relative flex flex-col justify-between">
                    
                    <div>
                        {/* Diet */}
                        <div className="mb-10">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-1.5 h-6 bg-[#1a5c2e] dark:bg-emerald-500 rounded-full"></div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Dietary Restriction</h2>
                            </div>
                            <div className="grid grid-cols-3 gap-3 md:gap-5">
                                <button
                                    onClick={() => setDiet("Non-Veg")}
                                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-3xl transition-all duration-300 border-2 ${
                                        diet === "Non-Veg" 
                                        ? "bg-[#eaf5eb] dark:bg-emerald-900/20 border-[#1a5c2e] dark:border-emerald-500 text-[#1a5c2e] dark:text-emerald-400" 
                                        : "bg-[#f1f5f9] dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                                    }`}
                                >
                                    <SlidersHorizontal className="w-7 h-7" />
                                    <span className="text-sm font-bold">Non-Veg</span>
                                </button>
                                <button
                                    onClick={() => setDiet("Veg")}
                                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-3xl transition-all duration-300 border-2 ${
                                        diet === "Veg" 
                                        ? "bg-[#eaf5eb] dark:bg-emerald-900/20 border-[#1a5c2e] dark:border-emerald-500 text-[#1a5c2e] dark:text-emerald-400" 
                                        : "bg-[#f1f5f9] dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                                    }`}
                                >
                                    <Sprout className="w-7 h-7" />
                                    <span className="text-sm font-bold">Veg</span>
                                </button>
                                <button
                                    onClick={() => setDiet("Vegan")}
                                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-3xl transition-all duration-300 border-2 ${
                                        diet === "Vegan" 
                                        ? "bg-[#eaf5eb] dark:bg-emerald-900/20 border-[#1a5c2e] dark:border-emerald-500 text-[#1a5c2e] dark:text-emerald-400" 
                                        : "bg-[#f1f5f9] dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                                    }`}
                                >
                                    <Leaf className="w-7 h-7" />
                                    <span className="text-sm font-bold">Vegan</span>
                                </button>
                            </div>
                        </div>

                        {/* Allergens */}
                        <div className="mb-10">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-1.5 h-6 bg-[#1a5c2e] dark:bg-emerald-500 rounded-full"></div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Allergens to Avoid</h2>
                            </div>
                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                                {ALLERGEN_OPTIONS.map(allergen => {
                                    const isSelected = allergens.includes(allergen);
                                    return (
                                        <button
                                            key={allergen}
                                            onClick={() => toggleAllergen(allergen)}
                                            className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                                                isSelected
                                                ? "bg-[#1a5c2e] dark:bg-emerald-500/20 text-white dark:text-emerald-400 hover:bg-[#134621] dark:hover:bg-emerald-500/30"
                                                : "bg-[#e2e8f0] dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/10"
                                            }`}
                                        >
                                            {allergen}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2 mt-auto">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSave}
                            disabled={loading || success}
                            className="bg-[#294735] dark:bg-emerald-600 text-white px-8 py-3.5 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-[#1a3323] dark:hover:bg-emerald-700 transition-colors w-full sm:w-auto justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{success ? "Saved!" : "Save Changes"}</span>}
                            {!loading && !success && <ArrowRight className="w-5 h-5" />}
                        </motion.button>
                    </div>
                </div>

                {/* Right side: Cards */}
                <div className="space-y-6 flex flex-col justify-between h-full">
                    {/* Sourcing Card */}
                    <div className="rounded-[2rem] overflow-hidden relative shadow-lg group border border-gray-200 dark:border-white/10 grow min-h-[300px]">
                        <img 
                            src="/sourcing_produce.png" 
                            alt="Fresh Vegetables" 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                            <p className="text-[10px] font-bold text-white/80 tracking-widest uppercase mb-1 drop-shadow-sm">Our Sourcing</p>
                            <p className="text-xl font-bold text-white leading-tight drop-shadow-md">
                                100% Regenerative<br/>Agricultural Practices
                            </p>
                        </div>
                    </div>

                    {/* Protocol Card */}
                    <div className="bg-white dark:bg-white/5 md:backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-white/10 shrink-0">
                        <div className="w-10 h-10 bg-[#dcfce7] dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                            <ShieldPlus className="w-5 h-5 text-[#166534] dark:text-emerald-400" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">Safety Protocol</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                            VeridianPulse maintains strict isolation protocols for allergen-sensitive orders. Each meal is tagged with a unique digital ledger.
                        </p>
                        <button className="text-xs font-bold text-[#1a5c2e] dark:text-emerald-400 flex items-center gap-1 hover:underline group">
                            View Safety Standards 
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
