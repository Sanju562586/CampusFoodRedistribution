"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, AlertTriangle, Globe, ArrowUpRight, X, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const articles = [
    {
        title: "The Carbon Footprint of Wasted Food",
        date: "Oct 12, 2024",
        readTime: "5 min read",
        category: "Environment",
        content: `
      Did you know that if food waste were a country, it would be the third-largest emitter of greenhouse gases after China and the US? 
      
      When food rots in landfills, it produces methane—a gas 25 times more potent than carbon dioxide at trapping heat in the atmosphere.
      
      Reducing food waste is one of the most effective ways to reverse climate change. Every meal rescued not only feeds someone in need but also prevents valuable resources like water, land, and energy from going to waste.
      
      By using CampusFood, you are directly contributing to a lower carbon footprint for our university. Small actions, when multiplied by thousands of students, create massive change.
    `
    }
];

const blogs = [
    {
        id: 1,
        title: "5 Ways to Reduce Food Waste in Your Dorm",
        desc: "Simple hacks to keep your groceries fresh longer.",
        icon: Leaf,
        color: "text-green-400",
        bg: "bg-green-400/10",
        border: "border-green-400/20",
        fullContent: `
      Living in a dorm often means limited space and shared fridges, which can lead to forgotten food and waste. Here are 5 simple ways to keep your food stats high and waste low:

      1. First-In, First-Out (FIFO):
      Organize your fridge so older items are at the front. When you buy new snacks or milk, put them behind the open ones. It’s a simple retail trick that works wonders.

      2. The "Eat Me First" Box:
      Designate a small bin in your fridge for items that need to be eaten within 2 days. When you're hungry, check this box first before opening something new.

      3. Love Your Leftovers:
      Don't toss that half-eaten pizza or sandwich. If you don't want it for the next meal, repurpose it! Leftover veggies can go into instant ramen, and fruit can be added to yogurt.

      4. Share the Bounty:
      Going home for the weekend? Have extra unopened snacks? Don't let them go bad—share them with your roommate or drop them on the "Free Table" in your common room (or post them on CampusFood!).

      5. Understand Dates:
      "Sell by," "Use by," and "Best by" mean different things. "Best by" usually refers to quality, not safety. Uses your senses—if it smells fine and looks fine, it's likely safe to eat (except for meat/dairy, be careful there!).
    `
    },
    {
        id: 2,
        title: "Global Hunger vs. Food Waste",
        desc: "Why bridging the gap is a logistical challenge, not a production one.",
        icon: Globe,
        color: "text-blue-400",
        bg: "bg-blue-400/10",
        border: "border-blue-400/20",
        fullContent: `
      We produce enough food to feed 1.5x the global population, yet millions go to bed hungry every night. This paradox is one of the greatest challenges of our time.

      The problem isn't production; it's distribution and waste. 

      In developed nations, 40% of food waste occurs at the retail and consumer levels—perfectly good food thrown away because of cosmetic blemishes or over-purchasing.

      In developing nations, waste often happens due to poor infrastructure—lack of cold storage or transport means food rots before it reaches the market.

      Solving this requires a two-pronged approach:
      1. Better technology to connect surplus with need instantly (like CampusFood!).
      2. A cultural shift to value food as a resource, not a disposable commodity.
    `
    },
    {
        id: 3,
        title: "The Methane Problem",
        desc: "How rotting food accelerates global warming.",
        icon: AlertTriangle,
        color: "text-orange-400",
        bg: "bg-orange-400/10",
        border: "border-orange-400/20",
        fullContent: `
      When you throw an apple core into the trash, it ends up in a landfill. Buried under tons of other trash, it decomposes without oxygen (anaerobically).

      This process releases Methane (CH4), a greenhouse gas that is 28 to 36 times more effective than CO2 at trapping heat in the atmosphere over a 100-year period.

      Wait, isn't composting better?
      Yes! Composting allows food to decompose aerobically (with oxygen), which produces CO2 instead of Methane. While CO2 is still a greenhouse gas, the carbon released is part of the natural short-term carbon cycle, unlike the "extra" warming caused by Methane from landfills.

      Key Takeaway:
      If you can't eat it, compost it. If you can't compost it, try to prevent having the waste in the first place by planning your meals better.
    `
    }
];

export default function FoodWastageSection() {
    const [selectedBlog, setSelectedBlog] = useState<typeof blogs[0] | null>(null);

    return (
        <section className="py-24 relative">
            {/* Section Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16 space-y-4"
            >
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                    Why It Matters
                </h2>
                <p className="text-lg text-white/50 max-w-2xl mx-auto">
                    Food waste isn't just an ethical issue—it's an environmental crisis.
                    Here's how we're making a difference.
                </p>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN: Scrollable Article Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="lg:col-span-5 relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                    <div className="relative h-[500px] rounded-[2rem] bg-[#121212] border border-white/10 overflow-hidden flex flex-col">

                        {/* Card Header image placeholder */}
                        <div className="h-40 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 flex flex-col justify-end p-6 border-b border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                <Globe className="size-32 text-white rotate-12" />
                            </div>
                            <span className="relative z-10 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-purple-200 w-fit mb-2 backdrop-blur-md border border-white/10">
                                Featured Article
                            </span>
                            <h3 className="relative z-10 text-2xl font-bold text-white leading-tight">
                                {articles[0].title}
                            </h3>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <div className="flex items-center gap-4 text-xs text-white/40 font-mono mb-4">
                                <span>{articles[0].date}</span>
                                <span>•</span>
                                <span>{articles[0].readTime}</span>
                            </div>
                            <div className="prose prose-invert prose-sm">
                                {articles[0].content.split('\n').map((paragraph, i) => (
                                    <p key={i} className="text-white/70 leading-relaxed mb-4">
                                        {paragraph.trim()}
                                    </p>
                                ))}
                            </div>
                        </div>

                        {/* Fade at bottom to indicate scroll */}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#121212] to-transparent pointer-events-none" />
                    </div>
                </motion.div>

                {/* RIGHT COLUMN: Blog Grid */}
                <div className="lg:col-span-7 grid gap-6">
                    {blogs.map((blog, idx) => (
                        <motion.div
                            key={blog.id}
                            onClick={() => setSelectedBlog(blog)}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            className="group relative cursor-pointer"
                        >
                            <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${blog.bg.replace('/10', '/5')}`} />

                            <div className={`relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center gap-6 backdrop-blur-sm overflow-hidden`}>

                                {/* Icon Background */}
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${blog.bg} ${blog.border} border shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                    <blog.icon className={`size-8 ${blog.color}`} />
                                </div>

                                <div className="flex-1 z-10">
                                    <h4 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all">
                                        {blog.title}
                                    </h4>
                                    <p className="text-white/50 group-hover:text-white/70 transition-colors">
                                        {blog.desc}
                                    </p>
                                </div>

                                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                                    <ArrowUpRight className="size-5" />
                                </div>

                                {/* Decorative blob */}
                                <div className={`absolute -right-10 -bottom-10 w-40 h-40 ${blog.bg} rounded-full blur-[60px] opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
                            </div>
                        </motion.div>
                    ))}

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="p-8 rounded-3xl bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/20 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left mt-2"
                    >
                        <div>
                            <h4 className="text-2xl font-bold text-white mb-2">Ready to make an impact?</h4>
                            <p className="text-green-200/70">Join 1,200+ students fighting food waste today.</p>
                        </div>
                        <Button size="lg" className="rounded-full bg-green-500 hover:bg-green-400 text-black font-bold h-12 px-8 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                            Get Started Now
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Blog Detail Modal */}
            <AnimatePresence>
                {selectedBlog && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedBlog(null)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                        />
                        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[85vh]"
                            >
                                {/* Modal Header */}
                                <div className={`p-8 ${selectedBlog.bg} border-b ${selectedBlog.border} relative overflow-hidden`}>
                                    <button
                                        onClick={() => setSelectedBlog(null)}
                                        className="absolute top-6 right-6 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-50 cursor-pointer"
                                    >
                                        <X className="size-5" />
                                    </button>

                                    <div className="relative z-10">
                                        <div className={`w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center mb-6`}>
                                            <selectedBlog.icon className="size-6 text-white" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-white mb-2">{selectedBlog.title}</h2>
                                        <div className="flex items-center gap-4 text-white/60 text-sm">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="size-4" />
                                                <span>Today</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="size-4" />
                                                <span>3 min read</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decorative */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                                </div>

                                {/* Modal Content */}
                                <div className="p-8 overflow-y-auto custom-scrollbar">
                                    <div className="prose prose-invert prose-lg max-w-none">
                                        {selectedBlog.fullContent.split('\n').map((paragraph, i) => (
                                            <p key={i} className="text-white/80 leading-relaxed mb-4">
                                                {paragraph.trim()}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end">
                                    <Button onClick={() => setSelectedBlog(null)} variant="outline" className="border-white/10 hover:bg-white/10 text-white transition">
                                        Close Article
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

        </section>
    );
}
