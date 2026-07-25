import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, Variants } from 'framer-motion';
import { 
  Sparkles, 
  Landmark, 
  Cpu, 
  ShieldAlert, 
  ArrowUpRight, 
  Mic, 
  Square, 
  Heart, 
  User,
  Users,
  Laptop
} from 'lucide-react';

// Character Assets
import citizenImg from '../assets/citizen.png';
import devImg from '../assets/dev.png';
import mpImg from '../assets/mp.png';
import colabImg from '../assets/colab.png';

// --- Framer Motion Animation Variants ---
const fadeInUp : Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer : Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

const scaleIn : Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "backOut" } }
};

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  // Interactive States
  const [ingestionState, setIngestionState] = useState<'idle' | 'recording' | 'completed'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState<number>(0);
  const [vouches, setVouches] = useState({ kolkata: 142, bengaluru: 98, mumbai: 76 });
  const [vouchedTeams, setVouchedTeams] = useState<Record<string, boolean>>({});
  const [proposalStatus, setProposalStatus] = useState<'idle' | 'compiling' | 'approved'>('idle');
  const [proposalProgress, setProposalProgress] = useState(0);
  const [newsletterName, setNewsletterName] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  // Simulators
  useEffect(() => {
    let interval: any;
    if (ingestionState === 'recording') {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 4) {
            setIngestionState('completed');
            setVoiceTranscript("The main-hole near Metro Station Gate 3 is completely clogged and overflowing into the street.");
            clearInterval(interval);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else { setSeconds(0); }
    return () => clearInterval(interval);
  }, [ingestionState]);

  useEffect(() => {
    let interval: any;
    if (proposalStatus === 'compiling') {
      setProposalProgress(0);
      interval = setInterval(() => {
        setProposalProgress((prev) => {
          if (prev >= 100) {
            setProposalStatus('approved');
            clearInterval(interval);
            return 100;
          }
          return prev + 15;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [proposalStatus]);

  const handleVouch = (team: 'kolkata' | 'bengaluru' | 'mumbai') => {
    if (vouchedTeams[team]) return;
    setVouches(prev => ({ ...prev, [team]: prev[team] + 1 }));
    setVouchedTeams(prev => ({ ...prev, [team]: true }));
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterName.trim() && newsletterEmail.trim()) {
      setNewsletterSuccess(true);
      setTimeout(() => { setNewsletterSuccess(false); setNewsletterName(''); setNewsletterEmail(''); }, 5000);
    }
  };

  if (user) {
    if (user.role === 'citizen') return <Navigate to="/citizen/dashboard" replace />;
    if (user.role === 'developer') return <Navigate to="/developer/dashboard" replace />;
    if (user.role === 'mp') return <Navigate to="/mp/dashboard" replace />;
  }

  const hotspots = [
    { id: 0, ward: "Ward 42 - Sector V", issue: "Water Deficit / Leakage", stress: 94, gap: "High (No sensor feedback)", coordinates: "85m from metro Hub" },
    { id: 1, ward: "Ward 18 - Salt Lake", issue: "Pothole Congestion", stress: 78, gap: "Medium (Periodic patches)", coordinates: "12m from main cross" },
    { id: 2, ward: "Ward 31 - Lake Town", issue: "Transformer Failure", stress: 88, gap: "Critical (Grid overload)", coordinates: "Inside Block B substation" },
  ];

  return (
    <div className="bg-[#F0F2F5] text-[#4B5563] font-sans relative overflow-hidden flex-1" id="landing-page">
      
      {/* Animated Floating Background Elements */}
      <motion.div 
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] left-[-10%] md:left-[5%] w-87.5 h-87.5 opacity-10 pointer-events-none"
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-[#F97316]">
          <path d="M10 90 L80 20 M80 20 L50 20 M80 20 L80 50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[5%] right-[-10%] md:right-[2%] w-112.5 h-112.5 opacity-[0.08] pointer-events-none"
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-[#F97316]">
          <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
        </svg>
      </motion.div>

      {/* SECTION 1: HERO DISPLAY */}
      <motion.section 
        initial="hidden" animate="visible" variants={staggerContainer}
        className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 z-10"
      >
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          
          <motion.div variants={fadeInUp} className="inline-flex items-center space-x-2 bg-[#F0F2F5] px-5 py-2.5 rounded-full mb-8 shadow-[6px_6px_12px_#D1D9E6,-6px_-6px_12px_#FFFFFF] border border-white/40">
            <Sparkles className="w-4 h-4 text-[#F97316] animate-pulse" />
            <span className="text-[10px] font-black text-[#111827] uppercase tracking-widest">
              AI-Powered Constituency Development Planning
            </span>
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.95] text-[#111827] uppercase max-w-4xl">
            FORGING DATA-DRIVEN <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#F97316] via-[#0D9488] to-[#1E3A8A]">
              CONSTITUENCY
            </span>{' '}
            PROGRESS.
          </motion.h1>

          <motion.div variants={scaleIn} className="w-24 h-1.5 bg-[#F97316] my-8 rounded-full shadow-sm"></motion.div>

          <motion.p variants={fadeInUp} className="text-sm sm:text-base text-[#4B5563] font-medium leading-relaxed max-w-3xl">
            A dual-engine civic-tech ecosystem. Citizens lodge localized infrastructure grievances; 
            developers construct deployable software prototypes, and MPs harness data fusion to prioritize funding-ready projects.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12 w-full sm:w-auto">
            <Link to="/register" className="w-full sm:w-auto text-center text-xs font-black text-white bg-[#F97316] hover:bg-[#ea6305] px-10 py-4 rounded-full transition-all uppercase tracking-widest shadow-[6px_6px_15px_rgba(249,115,22,0.35),-6px_-6px_15px_#FFFFFF] hover:-translate-y-0.5">
              Create Your Account
            </Link>
            <Link to="/login" className="w-full sm:w-auto text-center text-xs font-black text-[#111827] bg-[#F0F2F5] px-10 py-4 rounded-full transition-all uppercase tracking-widest shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] hover:text-[#F97316] hover:-translate-y-0.5">
              Sign In to Dashboard
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* SECTION 2: THREE-STEP CORE PROCESS CARDS */}
      <motion.section 
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
        className="py-20 bg-linear-to-b from-transparent to-[#EBF0F6]/40 px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          
          <motion.div variants={fadeInUp} className="text-center">
            <span className="text-[#10B981] text-xs font-black uppercase tracking-widest">HOW IT WORKS</span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-[#111827] mt-1 uppercase">
              The Three-Step Core Engine
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Step 1 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -8 }} className="bg-[#F0F2F5] p-8 rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] border border-white/50 relative flex flex-col justify-between cursor-default">
              <div className="space-y-4">
                <span className="block text-4xl font-black text-[#F97316] tracking-tighter">1.</span>
                <h3 className="text-lg font-black text-[#111827] uppercase tracking-tight">Citizens Submit</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-medium">Lodge geotagged complaints with photos or real-time voice notes. Gemini automatically transcribes and scores distress, creating 'Civic RFPs'.</p>
              </div>
              <div className="w-10 h-10 mt-6 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#F97316] shadow-[inset_2px_2px_5px_#D1D9E6,inset_-2px_-2px_5px_#FFFFFF]">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -8 }} className="bg-[#F0F2F5] p-8 rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] border border-white/50 relative flex flex-col justify-between cursor-default">
              <div className="space-y-4">
                <span className="block text-4xl font-black text-[#0D9488] tracking-tighter">2.</span>
                <h3 className="text-lg font-black text-[#111827] uppercase tracking-tight">Developers Prototype</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-medium">Browse classified community demands. Submit open-source technical solutions (apps, IoT hardware) to win public validation and vouches.</p>
              </div>
              <div className="w-10 h-10 mt-6 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#0D9488] shadow-[inset_2px_2px_5px_#D1D9E6,inset_-2px_-2px_5px_#FFFFFF]">
                <Cpu className="w-4 h-4" />
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -8 }} className="bg-[#F0F2F5] p-8 rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] border border-white/50 relative flex flex-col justify-between cursor-default">
              <div className="space-y-4">
                <span className="block text-4xl font-black text-[#1E3A8A] tracking-tighter">3.</span>
                <h3 className="text-lg font-black text-[#111827] uppercase tracking-tight">MPs Authorize</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-medium">Evaluate real-time urgency heatmaps. Match citizen issues to developer tools, and one-click generate budget proposals using Gemini.</p>
              </div>
              <div className="w-10 h-10 mt-6 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#1E3A8A] shadow-[inset_2px_2px_5px_#D1D9E6,inset_-2px_-2px_5px_#FFFFFF]">
                <Landmark className="w-4 h-4" />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* SECTION 3: CORE CHARACTER PILLARS (FIXED 3D OVERFLOW IMAGES) */}
      <motion.section 
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
        className="py-24 px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          
          <motion.div variants={fadeInUp} className="text-center">
            <span className="text-[#F97316] text-xs font-black uppercase tracking-widest font-sans">MEET THE ECOSYSTEM</span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-[#111827] mt-1 uppercase">
              Core Character Pillars
            </h2>
          </motion.div>

          {/* FIX: Added items-start to prevent flex children from stretching vertically when one expands */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-16 items-start">
            
            {/* Pillar 1: Citizen */}
            <motion.div variants={fadeInUp} className="bg-white rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] flex flex-col border border-[#D1D9E6]/30 group hover:shadow-2xl transition-all duration-500">
              <div className="bg-[#F97316] p-6 rounded-4xl text-white relative flex flex-col z-10">
                <div className="flex justify-between items-start z-10 relative">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">CIVIC ROLE</span>
                    {/* FIX: Increased heading font size */}
                    <h3 className="text-2xl lg:text-3xl font-black mt-2 uppercase tracking-tight">The Citizen</h3>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white transition-all group-hover:bg-white group-hover:text-[#F97316]">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="mt-4 relative h-75 flex items-center justify-center w-full">
                  <div className="absolute inset-4 rounded-2xl border border-white/20 bg-white/5"></div>
                  {/* FIX: Added stronger distinct drop shadows and improved hover scaling */}
                  <img src={citizenImg} alt="Citizen" className="relative z-10 h-[115%] object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.35)] group-hover:drop-shadow-[0_25px_25px_rgba(0,0,0,0.55)] group-hover:scale-105 transition-all duration-500 ease-out origin-bottom" />
                </div>
              </div>
              
              <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-in-out">
                <div className="overflow-hidden">
                  <div className="p-8 space-y-4 flex-1 bg-white rounded-b-4xl">
                    <span className="text-[#F97316] text-[10px] font-black uppercase tracking-widest block">Role Functions</span>
                    <p className="text-xs text-[#4B5563] leading-relaxed font-medium">Track active localized infrastructure demand feeds, review community validation lists, and deploy multi-format intake reports using real-time geolocation.</p>
                    <div className="pt-2">
                      <Link to="/register" className="inline-flex items-center space-x-1 text-xs font-black text-[#F97316] hover:text-[#ea6305] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                        <span>Lodge Complaints</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

           
            {/* Pillar 3: MP Representative */}
            <motion.div variants={fadeInUp} className="bg-white rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] flex flex-col border border-[#D1D9E6]/30 group hover:shadow-2xl transition-all duration-500">
              <div className="bg-[#1E3A8A] p-6 rounded-4xl text-white relative flex flex-col z-10">
                <div className="flex justify-between items-start z-10 relative">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">DECIDE ROLE</span>
                    <h3 className="text-2xl lg:text-3xl font-black mt-2 uppercase tracking-tight">The MP</h3>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white transition-all group-hover:bg-white group-hover:text-[#1E3A8A]">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="mt-4 relative h-75 flex items-center justify-center w-full">
                  <div className="absolute inset-4 rounded-2xl border border-white/20 bg-white/5"></div>
                  <img src={mpImg} alt="MP" className="relative z-10 h-[115%] object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.35)] group-hover:drop-shadow-[0_25px_25px_rgba(0,0,0,0.55)] group-hover:scale-105 transition-all duration-500 ease-out origin-bottom" />
                </div>
              </div>
              
              <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-in-out">
                <div className="overflow-hidden">
                  <div className="p-8 space-y-4 flex-1 bg-white rounded-b-4xl">
                    <span className="text-[#1E3A8A] text-[10px] font-black uppercase tracking-widest block">Role Functions</span>
                    <p className="text-xs text-[#4B5563] leading-relaxed font-medium">Analyze live constituency heatmaps, map public regional deficits, and confirm automated execution funding proposal metrics generated by Gemini AI.</p>
                    <div className="pt-2">
                      <Link to="/register" className="inline-flex items-center space-x-1 text-xs font-black text-[#1E3A8A] hover:text-[#162a63] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                        <span>Allocate Funds</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

 {/* Pillar 2: Developer */}
            <motion.div variants={fadeInUp} className="bg-white rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] flex flex-col border border-[#D1D9E6]/30 group hover:shadow-2xl transition-all duration-500">
              <div className="bg-[#0D9488] p-6 rounded-4xl text-white relative flex flex-col z-10">
                <div className="flex justify-between items-start z-10 relative">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">BUILD ROLE</span>
                    <h3 className="text-2xl lg:text-3xl font-black mt-2 uppercase tracking-tight">The Developer</h3>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white transition-all group-hover:bg-white group-hover:text-[#0D9488]">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="mt-4 relative h-75 flex items-center justify-center w-full">
                  <div className="absolute inset-4 rounded-2xl border border-white/20 bg-white/5"></div>
                  <img src={devImg} alt="Developer" className="relative z-10 h-[115%] object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.35)] group-hover:drop-shadow-[0_25px_25px_rgba(0,0,0,0.55)] group-hover:scale-105 transition-all duration-500 ease-out origin-bottom" />
                </div>
              </div>
              
              <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-in-out">
                <div className="overflow-hidden">
                  <div className="p-8 space-y-4 flex-1 bg-white rounded-b-4xl">
                    <span className="text-[#0D9488] text-[10px] font-black uppercase tracking-widest block">Role Functions</span>
                    <p className="text-xs text-[#4B5563] leading-relaxed font-medium">Browse priority system requests for proposal (RFPs), link operational GitHub repository links, and submit functional technical builds for the community.</p>
                    <div className="pt-2">
                      <Link to="/register" className="inline-flex items-center space-x-1 text-xs font-black text-[#0D9488] hover:text-[#0b7d73] uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                        <span>Browse Open RFPs</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
          </div>
        </div>
      </motion.section>

      {/* SECTION 4: SYSTEM FEATURE BREAKDOWN PANELS */}
      <motion.section 
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
        className="py-24 bg-linear-to-b from-[#EBF0F6]/20 to-[#F0F2F5] border-t border-[#D1D9E6]/30 px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="max-w-7xl mx-auto space-y-24">
          
          <motion.div variants={fadeInUp} className="text-center">
            <span className="text-[#0D9488] text-xs font-black uppercase tracking-widest block">PLATFORM REVELATIONS</span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-[#111827] mt-1 uppercase">System Feature Breakdown</h2>
            <p className="text-xs text-[#4B5563] mt-2 font-medium max-w-2xl mx-auto">Interactive playground dashboards demonstrating true backend power. Click, test, and experience the features below.</p>
          </motion.div>

          <div className="space-y-20">

            {/* Feature 1: Ingestion */}
            <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center space-x-2 bg-white px-3.5 py-1.5 rounded-full shadow-[4px_4px_10px_#D1D9E6,-4px_-4px_10px_#FFFFFF]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] animate-pulse"></span>
                  <span className="text-[9px] font-black text-[#111827] uppercase tracking-wider">MODULE 01</span>
                </div>
                <h3 className="text-2xl font-black text-[#111827] uppercase tracking-tight">Omnichannel Multilingual Ingestion</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-medium">Capture grassroots data seamlessly. Whisper AI processes verbal local complaints on-the-fly, transcribing multi-format recordings instantly.</p>
                <div className="bg-[#F0F2F5] p-4 rounded-2xl border border-white/60 shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF]">
                  <span className="text-[10px] font-black text-[#111827] uppercase block mb-1">Empirical Parameters:</span>
                  <p className="text-[11px] text-[#4B5563] font-medium leading-relaxed">• Multi-Format Intake (MPEG, WAV, PNG)<br />• Automatic Speech Recognition via AI<br />• Geotag Coordinate Binding</p>
                </div>
              </div>

              {/* Ingestion Interactive Panel */}
              <div className="lg:col-span-7 bg-[#F0F2F5] p-6 rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] border border-white/60 hover:shadow-[12px_12px_24px_#D1D9E6,-12px_-12px_24px_#FFFFFF] transition-shadow">
                <div className="bg-white rounded-2xl p-6 border border-[#D1D9E6]/30 space-y-6">
                  <div className="flex items-center justify-between border-b border-[#F0F2F5] pb-4">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-[10px] font-black text-[#111827] uppercase tracking-wider">Live Citizen Recorder</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#4B5563] uppercase bg-[#F0F2F5] px-2.5 py-1 rounded">Status: {ingestionState === 'idle' ? 'Ready' : ingestionState === 'recording' ? 'Recording' : 'Transcribed'}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    {ingestionState === 'idle' && (
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIngestionState('recording')} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[4px_4px_12px_rgba(239,68,68,0.3)]">
                        <Mic className="w-6 h-6 animate-pulse" />
                      </motion.button>
                    )}
                    {ingestionState === 'recording' && (
                      <button onClick={() => setIngestionState('completed')} className="w-16 h-16 rounded-full bg-[#111827] text-white flex items-center justify-center shadow-[4px_4px_12px_rgba(17,24,39,0.3)] animate-pulse">
                        <Square className="w-5 h-5" />
                      </button>
                    )}
                    {ingestionState === 'completed' && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setIngestionState('idle'); setVoiceTranscript(''); }} className="text-xs font-black text-[#F97316] uppercase tracking-widest bg-[#F0F2F5] px-4 py-2.5 rounded-xl shadow-[4px_4px_10px_#D1D9E6,-4px_-4px_10px_#FFFFFF]">
                        Record Again
                      </motion.button>
                    )}
                    <div className="text-center">
                      <p className="text-xs font-black text-[#111827] uppercase">
                        {ingestionState === 'idle' && "Click mic to record complaint"}
                        {ingestionState === 'recording' && `Recording Voice... 0:0${seconds}s`}
                        {ingestionState === 'completed' && "✓ Audio Processing Complete!"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#F0F2F5] p-4 rounded-xl shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] relative min-h-20 flex items-center justify-center text-center">
                    {ingestionState === 'recording' && (
                      <div className="flex space-x-1.5 items-center justify-center">
                        {[0.1, 0.2, 0.3, 0.4].map((delay, i) => (
                          <motion.span key={i} animate={{ height: [12, 32, 12] }} transition={{ repeat: Infinity, duration: 0.8, delay }} className="w-1.5 bg-[#F97316] rounded-full"></motion.span>
                        ))}
                      </div>
                    )}
                    {ingestionState === 'idle' && <p className="text-[11px] text-[#4B5563] italic">"Transcription results will display here..."</p>}
                    {ingestionState === 'completed' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                        <p className="text-xs text-[#111827] font-bold leading-relaxed">"{voiceTranscript}"</p>
                        <span className="text-[9px] bg-[#10B981]/20 text-[#10B981] px-2 py-0.5 rounded-full font-black uppercase inline-block">AI Transcribed • Distressed Level: High</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Heatmap */}
            <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 bg-[#F0F2F5] p-6 rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] border border-white/60 lg:order-1 order-2 hover:shadow-[12px_12px_24px_#D1D9E6,-12px_-12px_24px_#FFFFFF] transition-shadow">
                <div className="bg-white rounded-2xl p-6 border border-[#D1D9E6]/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F0F2F5] pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]"></span>
                      <span className="text-[10px] font-black text-[#111827] uppercase tracking-wider">Ward Urgency Matrix Map</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-[#F0F2F5] p-3.5 rounded-2xl">
                    {hotspots.map((h, idx) => (
                      <motion.div 
                        key={h.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveHotspot(idx)}
                        className={`p-4 rounded-xl cursor-pointer text-center relative ${activeHotspot === idx ? 'bg-white border-2 border-[#0D9488] shadow-md' : 'bg-[#F0F2F5] hover:bg-white/40 shadow-[4px_4px_10px_#D1D9E6,-4px_-4px_10px_#FFFFFF]'}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full absolute top-2 right-2 border-2 border-white ${h.stress >= 90 ? 'bg-red-500' : h.stress >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] font-black block text-[#111827] uppercase tracking-tighter">{h.ward}</span>
                        <span className="text-[14px] font-black block text-[#111827] mt-1">{h.stress}%</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div key={activeHotspot} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#F0F2F5] p-4.5 rounded-xl shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#111827] uppercase">{hotspots[activeHotspot].ward}</span>
                      <span className="text-[9px] font-extrabold text-[#0D9488] uppercase bg-white px-2 py-0.5 rounded shadow-sm">{hotspots[activeHotspot].coordinates}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div><span className="text-[9px] uppercase block text-[#4B5563] font-black">Identified Grievance:</span><p className="font-semibold text-[#111827]">{hotspots[activeHotspot].issue}</p></div>
                      <div><span className="text-[9px] uppercase block text-[#4B5563] font-black">Infrastructure Deficit:</span><p className="font-semibold text-[#111827]">{hotspots[activeHotspot].gap}</p></div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6 lg:order-2 order-1">
                <div className="inline-flex items-center space-x-2 bg-white px-3.5 py-1.5 rounded-full shadow-[4px_4px_10px_#D1D9E6,-4px_-4px_10px_#FFFFFF]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] animate-pulse"></span>
                  <span className="text-[9px] font-black text-[#111827] uppercase tracking-wider">MODULE 02</span>
                </div>
                <h3 className="text-2xl font-black text-[#111827] uppercase tracking-tight">Geospatial Data Fusion Engine</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-medium">MongoDB 2dsphere indexing audits physical travel gaps automatically. By cross-referencing citizen distress with locations, we define genuine priorities.</p>
              </div>
            </motion.div>

            {/* Feature 4: Blueprint Generator */}
            <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center space-x-2 bg-white px-3.5 py-1.5 rounded-full shadow-[4px_4px_10px_#D1D9E6,-4px_-4px_10px_#FFFFFF]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A] animate-pulse"></span>
                  <span className="text-[9px] font-black text-[#111827] uppercase tracking-wider">MODULE 03</span>
                </div>
                <h3 className="text-2xl font-black text-[#111827] uppercase tracking-tight">One-Click Funding Blueprints</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-medium">Representatives analyze verified data metrics alongside matched developer tools. Click to execute the Gemini blueprint engine, instantly formatting ready budget drafts.</p>
              </div>

              <div className="lg:col-span-7 bg-[#F0F2F5] p-6 rounded-4xl shadow-[8px_8px_16px_#D1D9E6,-8px_-8px_16px_#FFFFFF] border border-white/60 hover:shadow-[12px_12px_24px_#D1D9E6,-12px_-12px_24px_#FFFFFF] transition-shadow">
                <div className="bg-white rounded-2xl p-6 border border-[#D1D9E6]/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F0F2F5] pb-3">
                    <span className="text-[10px] font-black text-[#111827] uppercase tracking-wider">AI Procurement Drawer</span>
                  </div>

                  <div className="bg-[#F0F2F5] p-4.5 rounded-xl border border-white/40 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-black text-[#111827] uppercase border-b border-[#D1D9E6]/30 pb-2">
                      <span>PROJECT: WATER-WARD-42</span>
                      <span className="text-[10px] font-mono text-[#F97316]">
                        {proposalStatus === 'idle' && "PENDING SIGNATURE"}
                        {proposalStatus === 'compiling' && `COMPILING ${proposalProgress}%`}
                        {proposalStatus === 'approved' && "✓ APPROVED"}
                      </span>
                    </div>
                    <div className="space-y-2 text-[10px] leading-relaxed">
                      <p><strong>BUDGET PROPOSAL ALLOCATION:</strong> $45,000.00 authorized to cover regional LoRa sensor arrays and deployment pipeline.</p>
                    </div>
                    {proposalStatus === 'compiling' && (
                      <div className="w-full bg-white rounded-full h-2 shadow-[inset_1px_1px_3px_#D1D9E6]">
                        <div className="bg-[#1E3A8A] h-2 rounded-full transition-all duration-150" style={{ width: `${proposalProgress}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    {proposalStatus === 'idle' && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setProposalStatus('compiling')} className="bg-[#1E3A8A] text-white text-[10px] font-black uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-[4px_4px_10px_rgba(30,58,138,0.25)]">
                        Authorize Funds ($45K)
                      </motion.button>
                    )}
                    {proposalStatus === 'compiling' && <button disabled className="bg-[#4B5563] text-white text-[10px] font-black uppercase px-6 py-3.5 rounded-xl opacity-50">Compiling...</button>}
                    {proposalStatus === 'approved' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-2">
                        <span className="text-xs font-black text-[#10B981] uppercase">✓ Budget Released</span>
                        <button onClick={() => setProposalStatus('idle')} className="text-[9px] font-black uppercase text-[#1E3A8A] border-b border-[#1E3A8A] ml-2">Reset</button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.section>

      {/* SECTION 5: FINAL FOOTER */}
      <motion.footer 
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "100px" }} variants={fadeInUp}
        className="bg-linear-to-t from-[#E2E8F0] to-[#F0F2F5] border-t border-[#D1D9E6] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="bg-[#F0F2F5] p-10 rounded-[40px] shadow-[12px_12px_24px_#D1D9E6,-12px_-12px_24px_#FFFFFF] border border-white/80 space-y-8 text-center flex flex-col items-center">
            <div className="space-y-2">
              <span className="text-[#F97316] text-[10px] font-black uppercase tracking-widest block">JOIN THE MOVEMENT</span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-[-0.04em] text-[#111827] uppercase leading-tight max-w-4xl">ALIGNING VISION, TALENT, AND EXECUTION.</h2>
            </div>
            <div className="w-full max-w-4xl bg-[#F0F2F5] p-6 rounded-3xl relative overflow-hidden flex justify-center shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF]">
              <img src={colabImg} alt="Collaboration" className="relative z-10 w-full max-w-lg h-auto object-contain mix-blend-multiply drop-shadow-xl" />
            </div>
          </div>
          <div className="border-t border-[#D1D9E6] pt-8 flex flex-col md:flex-row items-center justify-between text-xs font-bold text-[#4B5563]">
            <p className="uppercase tracking-wider text-center md:text-left">&copy; 2026 CivicForge. Built under Open Data Directives.</p>
            <p className="uppercase tracking-[0.15em] text-center md:text-right font-black text-[#111827] mt-4 md:mt-0">A PROJECT BY TEAM TEESMAARKHACODERS</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};