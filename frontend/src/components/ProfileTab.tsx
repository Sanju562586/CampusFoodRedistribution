import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Save } from "lucide-react";
import api from "@/lib/axios";

const ALLERGEN_OPTIONS = [
    "Peanuts", "Tree Nuts", "Dairy", "Eggs", "Soy", "Wheat/Gluten", "Fish", "Shellfish"
];

const DIET_OPTIONS = [
    "Non-Veg", "Veg", "Vegan"
];

export default function ProfileTab({ user, onUpdate }: { user: any, onUpdate: () => void }) {
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
            onUpdate(); // Refresh user data in parent
            setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
            console.error("Failed to update profile", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Food Preferences</CardTitle>
                    <CardDescription>
                        Help our AI recommend the best food for you by setting your dietary preferences.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">

                    {/* Dietary Preference */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Dietary Restriction</Label>
                        <RadioGroup
                            value={diet}
                            onValueChange={setDiet}
                            className="flex flex-col md:flex-row gap-4"
                        >
                            {DIET_OPTIONS.map((option) => (
                                <div key={option} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors w-full md:w-auto">
                                    <RadioGroupItem value={option} id={option} />
                                    <Label htmlFor={option} className="cursor-pointer flex-1">{option}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Allergens */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Allergens to Avoid</Label>
                        <p className="text-sm text-muted-foreground mb-2">Select any ingredients you are allergic to.</p>
                        <div className="flex flex-wrap gap-2">
                            {ALLERGEN_OPTIONS.map(allergen => {
                                const isSelected = allergens.includes(allergen);
                                return (
                                    <Badge
                                        key={allergen}
                                        variant={isSelected ? "destructive" : "outline"}
                                        className={`cursor-pointer px-4 py-2 text-sm select-none transition-all ${isSelected ? "hover:bg-red-600" : "hover:bg-accent"}`}
                                        onClick={() => toggleAllergen(allergen)}
                                    >
                                        {allergen}
                                        {isSelected && <Check className="ml-2 size-3" />}
                                    </Badge>
                                )
                            })}
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto min-w-[150px]">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : success ? <Check className="mr-2" /> : <Save className="mr-2" />}
                            {loading ? "Saving..." : success ? "Saved!" : "Save Changes"}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
