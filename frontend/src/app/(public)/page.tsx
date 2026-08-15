"use client";

import { motion } from "framer-motion";
import { ArrowRight, User, Store, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import FoodWastageSection from "@/components/FoodWastageSection";
import BrandLogo from "@/components/BrandLogo";

export default function Home() {
  const roles = [
    {
      id: "student",
      label: "Student",
      desc: "Find food & earn points",
      icon: User,
      color: "from-blue-500 to-cyan-500",
      href: "/login?role=student"
    },
    {
      id: "donor",
      label: "Food Partner",
      desc: "Donate surplus & track impact",
      icon: Store,
      color: "from-green-500 to-emerald-500",
      href: "/login?role=donor"
    },
    {
      id: "admin",
      label: "Admin",
      desc: "Manage platform operations",
      icon: ShieldCheck,
      color: "from-purple-500 to-pink-500",
      href: "/login?role=admin"
    }
  ];

  const blogs = [
    {
      title: "Zero Waste Initiative Hits 500kg Milestone",
      category: "Impact",
      image: "/images/impact.png",
      desc: "Our campus has successfully diverted over 500kg of edible food from landfills this semester."
    },
    {
      title: "Top 3 Diners of the Month",
      category: "Community",
      image: "/images/dining.png",
      desc: "Congratulations to Hostel A for contributing the most surplus food this month!"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 font-sans overflow-x-hidden relative">

      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-orange-500/20 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* Navbar */}
        <nav className="flex justify-between items-center mb-16">
          <BrandLogo
            size={38}
            subtitle="Food Rescue Network"
            tone="light"
            wordmarkSize="md"
          />
          <div className="flex gap-4">
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">About</Button>
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">Contact</Button>
          </div>
        </nav>

        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* LEFT: Intro & Role Selection */}
          <div className="space-y-12">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-purple-300">
                🚀 Sustinability Revolution
              </span>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight bg-gradient-to-br from-white via-white/90 to-white/50 bg-clip-text text-transparent">
                Connecting Surplus <br className="hidden md:block" /> with Students.
              </h1>
              <p className="text-lg text-white/50 max-w-md">
                Join our mission to reduce food waste. Whether you&apos;re hungry or helping, there&apos;s a place for you.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-white/40 uppercase tracking-wider">Select your Role</p>
              <div className="grid gap-4">
                {roles.map((role) => (
                  <Link key={role.id} href={role.href} className="block group">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all flex items-center gap-4 backdrop-blur-sm"
                    >
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${role.color} shadow-lg`}>
                        <role.icon className="text-white size-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-white transition-colors">{role.label}</h3>
                        <p className="text-sm text-white/50 group-hover:text-white/70 transition-colors">{role.desc}</p>
                      </div>
                      <ArrowRight className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Content Feed / Blogs */}
          <div className="space-y-8 flex flex-col justify-center h-full">
            <h2 className="text-2xl font-bold mb-2">Latest Updates 📢</h2>
            <div className="space-y-6">
              {blogs.map((blog, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md flex flex-col sm:flex-row gap-4 md:gap-5 items-start">
                    <div className="shrink-0 w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-xl overflow-hidden relative">
                      {/* Placeholder for blog image if actual image fails or is dynamic */}
                      <div className="absolute inset-0 flex items-center justify-center text-4xl">
                        {blog.category === 'Impact' ? '🌍' : '🏆'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${blog.category === 'Impact' ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                          {blog.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-purple-300 transition-colors">
                        {blog.title}
                      </h3>
                      <p className="text-sm text-white/50 line-clamp-2">
                        {blog.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/20 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-green-400 size-5" />
                <h4 className="font-bold text-white">Live Impact</h4>
              </div>
              <div className="text-3xl font-bold tabular-nums">1,024 kg</div>
              <p className="text-sm text-white/50">Food rescued this month</p>
            </div>


          </div>
        </div>

        {/* NEW SECTION: Food Wastage Info */}
        <FoodWastageSection />

      </div>
    </div>
  );
}
