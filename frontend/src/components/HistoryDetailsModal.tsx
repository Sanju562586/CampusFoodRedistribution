import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Hash } from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
    food: any;
};

export default function HistoryDetailsModal({ open, onClose, food }: Props) {
    if (!food) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-card border-border shadow-2xl p-0 overflow-hidden rounded-2xl">
                <div className="flex flex-col md:flex-row h-[600px]">
                    {/* Left Side: Food Info */}
                    <div className="w-full md:w-1/3 bg-muted/30 p-6 border-r border-border flex flex-col">
                        <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-background border border-border shadow-sm">
                            {food.image_url ? (
                                <img src={food.image_url} alt={food.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-6xl">🍔</div>
                            )}
                        </div>

                        <h2 className="text-xl font-bold mb-2">{food.name}</h2>

                        <div className="space-y-3 text-sm mt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Status</span>
                                {new Date(food.expiry_time) < new Date() ? (
                                    <Badge variant="destructive">Expired</Badge>
                                ) : food.quantity > 0 ? (
                                    <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                                ) : (
                                    <Badge variant="secondary">Sold Out</Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Listed On</span>
                                <span className="font-medium">{new Date(food.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Original Qty</span>
                                <span className="font-medium">{food.quantity + (food.Reservations?.reduce((a: any, b: any) => a + b.quantity, 0) || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Reservations */}
                    <div className="flex-1 p-6 flex flex-col">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <User className="size-6 text-blue-500" />
                                Reservations
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm">
                                {food.Reservations?.length || 0} students have reserved this item.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {food.Reservations && food.Reservations.length > 0 ? (
                                food.Reservations.map((res: any) => (
                                    <div key={res.id} className="p-4 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">
                                                {res.User?.name?.[0] || "U"}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground">{res.User?.name || "Unknown Student"}</h4>
                                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span>{res.User?.college || "N/A"}</span>
                                                    <span>•</span>
                                                    <span>{res.User?.roll_number}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-bold text-lg text-primary">{res.quantity}x</div>
                                            <Badge variant="outline" className="text-[10px] uppercase">{res.status}</Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                    <Hash className="size-12 mb-2" />
                                    <p>No reservations yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
