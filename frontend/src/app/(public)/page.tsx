"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Leaf, ShieldCheck, Sparkles, Store, TrendingUp, User } from "lucide-react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import FoodWastageSection from "@/components/FoodWastageSection";
import TiltSurface from "@/components/TiltSurface";
import { Button } from "@/components/ui/button";

const roles = [
  { id: "student", label: "Student", desc: "Discover good food nearby and turn every rescue into impact.", icon: User, color: "from-sky-400 to-indigo-500", href: "/login?role=student", index: "01" },
  { id: "donor", label: "Food partner", desc: "Share surplus in minutes and see its journey in real time.", icon: Store, color: "from-emerald-400 to-green-600", href: "/login?role=donor", index: "02" },
  { id: "admin", label: "Admin", desc: "Keep the movement flowing across your whole campus.", icon: ShieldCheck, color: "from-violet-400 to-fuchsia-600", href: "/login?role=admin", index: "03" },
];

const updates = [
  { tag: "Impact", title: "500 kg of food saved this semester", copy: "A campus-wide effort is turning surplus into shared meals.", tone: "from-emerald-300/25 to-lime-300/5", icon: Leaf },
  { tag: "Community", title: "New partners joined the network", copy: "More kitchens, more choices, more meals with meaning.", tone: "from-violet-300/25 to-sky-300/5", icon: Sparkles },
];

const reveal = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07120d] text-white selection:bg-lime-300/30">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_76%_18%,rgba(163,230,53,.22),transparent_24%),radial-gradient(circle_at_15%_18%,rgba(139,92,246,.28),transparent_28%)]" />
      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-6 sm:px-8 lg:px-10">
        <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3 backdrop-blur-xl sm:px-5">
          <BrandLogo size={36} subtitle="Food rescue network" tone="light" wordmarkSize="md" />
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="#impact" className="hidden sm:block"><Button variant="ghost" className="text-white/65 hover:bg-white/10 hover:text-white">Our impact</Button></Link>
            <Link href="/login"><Button className="rounded-xl bg-lime-300 px-4 font-bold text-[#102015] shadow-[0_10px_30px_rgba(163,230,53,.22)] hover:bg-lime-200">Join the movement <ArrowUpRight className="size-4" /></Button></Link>
          </div>
        </motion.nav>

        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: .12 } } }} className="relative z-10">
            <motion.div variants={reveal} className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-200/20 bg-lime-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-lime-200"><Sparkles className="size-3.5" /> Food has a second chance</motion.div>
            <motion.h1 variants={reveal} className="max-w-3xl text-5xl font-extrabold leading-[.96] tracking-[-.065em] sm:text-6xl lg:text-8xl">Good food deserves a <span className="bg-gradient-to-r from-lime-200 via-emerald-300 to-indigo-300 bg-clip-text text-transparent">better ending.</span></motion.h1>
            <motion.p variants={reveal} className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg">CampusFood makes it effortless to redirect surplus meals to the people who need them—before they become waste.</motion.p>
            <motion.div variants={reveal} className="mt-8 flex flex-wrap items-center gap-3"><Link href="/login?role=student"><Button size="lg" className="h-12 rounded-xl bg-white px-5 font-bold text-[#102015] shadow-xl hover:bg-lime-100">Find a meal <ArrowRight className="size-4" /></Button></Link><Link href="/login?role=donor"><Button size="lg" variant="ghost" className="h-12 rounded-xl border border-white/15 bg-white/[.04] px-5 text-white hover:bg-white/10 hover:text-white">Share surplus</Button></Link></motion.div>
            <motion.div variants={reveal} className="mt-11 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6">{[["1,024 kg", "rescued this month"], ["32", "active food partners"], ["4.9/5", "student experience"]].map(([value, label]) => <div key={label}><p className="text-xl font-extrabold tracking-tight text-lime-100">{value}</p><p className="mt-1 text-xs font-medium text-white/45">{label}</p></div>)}</motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: .94, rotate: 3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: .75, delay: .15, type: "spring", bounce: .22 }} className="relative mx-auto w-full max-w-xl [perspective:1400px]">
            <TiltSurface className="overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/[.16] to-white/[.025] p-4 shadow-[0_32px_80px_rgba(0,0,0,.4)] sm:p-5" intensity={5}>
              <div className="relative min-h-[440px] overflow-hidden rounded-[1.45rem] bg-[linear-gradient(145deg,#183f2b_0%,#0e2018_52%,#0b1612_100%)] p-6 sm:p-8">
                <motion.div animate={{ y: [0, -12, 0], rotate: [0, 4, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute -right-14 -top-12 size-56 rounded-full bg-lime-300/25 blur-3xl" />
                <motion.div animate={{ y: [0, 18, 0], x: [0, -9, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-20 -left-10 size-64 rounded-full bg-violet-500/30 blur-3xl" />
                <div className="relative flex items-center justify-between"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70">Live rescue</span><span className="size-2 rounded-full bg-lime-300 shadow-[0_0_14px_#bef264]" /></div>
                <div className="relative mt-12"><p className="text-sm text-lime-100/70">Available near you</p><h2 className="mt-2 text-4xl font-extrabold tracking-tight">Fresh & ready<br />to be shared.</h2></div>
                <div className="relative mt-8 space-y-3">{[["12:30 PM", "Vegetable biryani", "48 servings"], ["1:15 PM", "Fresh bakery box", "16 servings"]].map(([time, item, count], index) => <motion.div key={item} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .55 + index * .14 }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.10] p-3.5 backdrop-blur-xl"><div className="grid size-11 place-items-center rounded-xl bg-lime-200 text-xs font-black text-green-950">{time}</div><div className="min-w-0 flex-1"><p className="font-bold">{item}</p><p className="text-xs text-white/50">{count} available</p></div><ArrowRight className="size-4 text-lime-200" /></motion.div>)}</div>
                <div className="relative mt-8 flex items-center gap-3 text-sm text-white/65"><span className="grid size-9 place-items-center rounded-full bg-white/10"><TrendingUp className="size-4 text-lime-200" /></span>Every rescued meal is a win for the campus.</div>
              </div>
            </TiltSurface>
            <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-6 -left-5 rounded-2xl border border-white/15 bg-[#0d2117]/90 px-4 py-3 shadow-2xl backdrop-blur-xl"><p className="text-[10px] font-bold uppercase tracking-widest text-white/45">This week</p><p className="mt-1 text-lg font-extrabold text-lime-200">+142 meals saved</p></motion.div>
          </motion.div>
        </section>

        <section className="grid gap-3 md:grid-cols-3" aria-label="Choose your role">{roles.map((role, index) => <motion.div key={role.id} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}><Link href={role.href} className="block [perspective:1000px]"><TiltSurface className="group h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[.055] p-5 transition-colors hover:border-white/25 hover:bg-white/[.09]"><div className="relative flex items-start justify-between"><div className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${role.color} shadow-lg`}><role.icon className="size-5" /></div><span className="text-xs font-bold text-white/30">{role.index}</span></div><h3 className="relative mt-7 text-xl font-bold">{role.label}</h3><p className="relative mt-2 text-sm leading-6 text-white/55">{role.desc}</p><div className="relative mt-6 flex items-center gap-2 text-sm font-bold text-lime-200">Explore portal <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></div></TiltSurface></Link></motion.div>)}</section>

        <section className="mt-20 grid gap-4 lg:grid-cols-[1.1fr_.9fr]" aria-label="Latest updates"><div className="rounded-[2rem] border border-white/10 bg-white/[.045] p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[.2em] text-lime-200">From the network</p><h2 className="mt-3 max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">Small decisions. Meaningful change.</h2><p className="mt-4 max-w-md text-white/55">A more thoughtful food system begins with a simple connection between abundance and need.</p></div><div className="space-y-3">{updates.map((update, index) => <motion.article key={update.tag} initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * .1 }} className={`group flex gap-4 rounded-2xl border border-white/10 bg-gradient-to-r ${update.tone} p-5 transition-transform hover:-translate-y-1`}><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10"><update.icon className="size-5 text-lime-100" /></div><div><p className="text-[10px] font-bold uppercase tracking-widest text-lime-100/70">{update.tag}</p><h3 className="mt-1 font-bold">{update.title}</h3><p className="mt-1 text-sm text-white/55">{update.copy}</p></div></motion.article>)}</div></section>
        <div id="impact"><FoodWastageSection /></div>
      </div>
    </main>
  );
}
