import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Shield, Search, Zap, Trophy, ArrowRight, Github, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-amber-500 flex items-center justify-center rounded-xl glow-gold">
            <Shield className="text-black" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tighter uppercase italic">ClueVault</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#rewards" className="hover:text-white transition-colors">Rewards</a>
          <a href="#crews" className="hover:text-white transition-colors">Crews</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>
        <Link 
          to="/app/home" 
          className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2.5 rounded-full font-bold text-sm transition-all glow-gold flex items-center gap-2"
        >
          Open App <ArrowRight size={16} />
        </Link>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic mb-6 leading-[0.9]">
            Solve Clues. <br />
            <span className="text-amber-500">Unlock Vaults.</span> <br />
            Build Your Crew.
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/50 mb-10 leading-relaxed">
            Join the underground network of mystery solvers. Complete daily missions, 
            earn rare resources, and lead your crew to total dominance in the ClueVault.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/app/home" 
              className="w-full sm:w-auto bg-amber-500 text-black px-10 py-4 rounded-full font-black text-lg transition-all glow-gold uppercase italic active:scale-95"
            >
              Play Now
            </Link>
            <a 
              href="https://t.me/" 
              target="_blank"
              className="w-full sm:w-auto glass px-10 py-4 rounded-full font-black text-lg transition-all uppercase italic border-white/20 hover:border-white/40 active:scale-95"
            >
              Join Telegram
            </a>
          </div>
        </motion.div>

        {/* Feature Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20 relative"
        >
          <div className="max-w-4xl mx-auto glass rounded-[2.5rem] p-4 border-white/10 glow-silver overflow-hidden">
             <div className="aspect-video bg-neutral-900 rounded-[2rem] overflow-hidden relative group">
                <img 
                  src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070" 
                  alt="Vault Dashboard" 
                  className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="glass p-8 rounded-full glow-gold animate-float">
                      <Shield size={64} className="text-amber-500" />
                   </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-10 left-10 text-left">
                  <div className="bg-amber-500 text-black px-3 py-1 rounded-md text-xs font-bold uppercase mb-2">Live Mission</div>
                  <h3 className="text-2xl font-bold uppercase tracking-tight italic">Operations: Sector 7</h3>
                </div>
             </div>
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-neutral-900/40 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic mb-4">How It Works</h2>
            <div className="w-20 h-1.5 bg-amber-500 mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Users, title: "Join a Crew", desc: "Form alliances with other agents and coordinate your strategy." },
              { icon: Search, title: "Solve Clues", desc: "Analyze daily mysterious clues to pinpoint your targets." },
              { icon: Shield, title: "Unlock Vaults", desc: "Gain access to high-security vaults and extract valuable resources." },
              { icon: Zap, title: "Rise Up", desc: "Build your secret base and climb the global leaderboards." }
            ].map((step, idx) => (
              <div key={idx} className="glass p-8 rounded-3xl border-white/5 hover:border-amber-500/30 transition-all group">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-all duration-500">
                  <step.icon size={28} className="text-amber-500 group-hover:text-black transition-colors" />
                </div>
                <h3 className="text-xl font-bold uppercase italic mb-3">0{idx + 1}. {step.title}</h3>
                <p className="text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 text-sm text-white/40">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="text-amber-500" size={24} />
              <span className="text-xl font-bold text-white tracking-tighter uppercase italic">ClueVault</span>
            </div>
            <p className="max-w-xs leading-relaxed">
              The premier underground network for digital mystery solvers. 
              Always solve. Always earn. Never get caught.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase mb-6 tracking-wider">Engagement</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-amber-500">Telegram Channel</a></li>
              <li><a href="#" className="hover:text-amber-500">Support</a></li>
              <li><a href="#" className="hover:text-amber-500">Referral Program</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase mb-6 tracking-wider">Legal</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-amber-500">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-amber-500">Terms of Service</a></li>
              <li><a href="#" className="hover:text-amber-500">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-16 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] uppercase tracking-[0.2em] opacity-40">
          <p>© 2026 ClueVault Underground Media Group. All Rights Reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">X (Twitter)</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
