import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, Rocket, LogOut, Building2, Sparkles, Target, 
  User, MapPin, Phone, Globe, ChevronRight, ChevronLeft,
  Instagram, Linkedin, Twitter, Github, TrendingUp, Settings2, X, Lock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COUNTRY_CODES = [
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+1", name: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", name: "UK", flag: "🇬🇧" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
];

const SME_SECTORS = ["Food & Beverage", "Retail & Fashion", "Beauty & Wellness", "Professional Services", "Logistics & Transport", "Health & Medical", "Creative & Media", "Other"];
const TECH_SECTORS = ["FinTech", "HealthTech", "EdTech", "E-commerce", "SaaS (B2B)", "AgTech", "AI / ML", "Logistics Tech", "Other"];

// Core metrics always tracked for every business — these power the main dashboard charts
const CORE_METRICS = [
  { key: "revenue", label: "Monthly Revenue", description: "Total income this month" },
  { key: "expenses", label: "Monthly Expenses", description: "Total costs this month" },
  { key: "new_customers", label: "New Customers", description: "Customers gained this month" },
  { key: "lost_customers", label: "Lost Customers (Churn)", description: "Customers who left this month" },
];

const METRIC_TEMPLATES: Record<string, string[]> = {
  // SMEs
  "Food & Beverage": ["Total Revenue", "Total Expenses", "Table Turnover", "Avg Order Value", "Foot Traffic"],
  "Retail & Fashion": ["Total Revenue", "Total Expenses", "Inventory Value", "Avg Order Value", "Foot Traffic"],
  "Beauty & Wellness": ["Total Revenue", "Total Expenses", "Total Appointments", "Repeat Rate", "Walk-ins"],
  "Professional Services": ["Total Revenue", "Total Expenses", "Active Clients", "Billable Hours", "Lead Conversion"],
  "Logistics & Transport": ["Total Revenue", "Total Expenses", "Total Deliveries", "Fuel Costs", "Vehicle Uptime"],
  "Health & Medical": ["Total Revenue", "Total Expenses", "Patient Visits", "Returning Patients", "Avg Wait Time"],
  "Creative & Media": ["Total Revenue", "Total Expenses", "Active Projects", "Client Retention", "Avg Project Value"],
  // Tech Startups
  "FinTech": ["MRR", "Monthly Burn", "Active Users", "Transaction Volume", "CAC"],
  "HealthTech": ["MRR", "Monthly Burn", "Active Users", "Patient Consults", "CAC"],
  "EdTech": ["MRR", "Monthly Burn", "Active Students", "Course Completion %", "CAC"],
  "E-commerce": ["MRR", "Monthly Burn", "Active Customers", "GMV", "CAC"],
  "SaaS (B2B)": ["MRR", "Monthly Burn", "Active Accounts", "Churn Rate", "CAC"],
  "AgTech": ["MRR", "Monthly Burn", "Active Users", "Platform Usage", "CAC"],
  "AI / ML": ["MRR", "Monthly Burn", "API Calls", "Active Users", "CAC"],
  "Logistics Tech": ["MRR", "Monthly Burn", "Active Users", "Deliveries Routed", "CAC"],
  // Default
  "Other": ["Total Revenue", "Total Expenses", "Profit Margin", "Active Customers", "CAC"]
};

export default function FounderOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+234");

  const [formData, setFormData] = useState({
    founderName: "",
    phoneNumber: "",
    country: "",
    startupName: "",
    businessModel: "tech_startup",
    sector: "",
    customSector: "",
    currency: "NGN",
    currentStage: "",
    website: "",
    description: "",
    logoUrl: "",
    metricConfig: [] as string[],
    spendLabels: ["Salaries & Talent", "Software & Infra", "Growth & Marketing", "Ops & Admin"],
    socialLinks: {
      linkedin: "",
      instagram: "",
      twitter: "",
      tiktok: ""
    }
  });

  // Automatically update metrics when sector changes
  useEffect(() => {
    const sectorToUse = formData.sector === "Other" ? "Other" : formData.sector;
    if (sectorToUse && METRIC_TEMPLATES[sectorToUse]) {
      setFormData(prev => ({ ...prev, metricConfig: METRIC_TEMPLATES[sectorToUse] }));
    }
  }, [formData.sector]);


  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('social_')) {
      const platform = name.split('_')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: { ...prev.socialLinks, [platform]: value }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, logoUrl: publicUrl }));
      toast({ title: "Logo uploaded!", description: "Your branding is looking great." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const fullPhoneNumber = `${selectedCountryCode} ${formData.phoneNumber}`;
      
      // 1. Create the startup
      const { data: startupData, error: startupError } = await supabase
        .from("startups")
        .insert({
          name: formData.startupName,
          founder_name: formData.founderName,
          sector: formData.sector === 'Other' ? formData.customSector : formData.sector,
          current_stage: formData.currentStage,
          business_model: formData.businessModel,
          website: formData.website,
          description: formData.description,
          logo_url: formData.logoUrl,
          currency: formData.currency,
          metric_config: [...formData.metricConfig, ...formData.spendLabels]
        } as any)
        .select()
        .single();

      if (startupError) throw startupError;

      // 2. Update the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.founderName,
          role: "founder",
          startup_id: startupData.id,
          phone_number: fullPhoneNumber,
          country: formData.country,
          social_links: formData.socialLinks,
        } as any)
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast({ title: "Profile Ready!", description: "Welcome to the Lab, " + formData.founderName });
      window.location.href = "/";
      
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error creating profile", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F2] flex flex-col items-center justify-center p-6 pb-20">
      
      {/* Branding Header */}
      <div className="text-center mb-10 space-y-2">
        <div className="mx-auto w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-[#00D395]" />
        </div>
        <h1 className="text-2xl font-serif font-semibold text-[#1A1A1A]">
          {formData.founderName ? `Welcome, ${formData.founderName}` : "Join the Lab"}
        </h1>
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`h-1 rounded-full transition-all duration-300 ${step >= s ? 'w-6 bg-[#00D395]' : 'w-2 bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="w-full max-w-lg">
        
        {/* STEP 1: IDENTITY */}
        {step === 1 && (
          <Card className="bg-white border-gray-200 shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-[#00D395]" /> Personal Identity
              </CardTitle>
              <CardDescription className="font-medium">Let's start with who you are.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="founderName" className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Name<span className="text-red-500 ml-1">*</span></Label>
                <Input id="founderName" name="founderName" value={formData.founderName} onChange={handleChange} placeholder="e.g. Amaobi Okafor" className="h-12 bg-white border-gray-100" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-xs font-bold uppercase tracking-widest text-gray-500">Phone Number<span className="text-red-500 ml-1">*</span></Label>
                  <div className="flex gap-2">
                    <Select defaultValue={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                      <SelectTrigger className="w-[110px] border-gray-100 h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {COUNTRY_CODES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="810 000 0000" className="h-12 bg-white border-gray-100 flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-xs font-bold uppercase tracking-widest text-gray-500">Country of Residence<span className="text-red-500 ml-1">*</span></Label>
                  <Input id="country" name="country" value={formData.country} onChange={handleChange} placeholder="Nigeria" className="h-12 bg-white border-gray-100" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50/50 p-6">
              <Button onClick={nextStep} className="w-full bg-[#00D395] hover:bg-[#00A389] text-white rounded-full h-12 font-bold" disabled={!formData.founderName || !formData.phoneNumber || !formData.country}>
                Next: Business Details <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: BUSINESS DNA */}
        {step === 2 && (
          <Card className="bg-white border-gray-200 shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00D395]" /> Business DNA
              </CardTitle>
              <CardDescription className="font-medium">What are you building?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startupName" className="text-xs font-bold uppercase tracking-widest text-gray-500">Business Name<span className="text-red-500 ml-1">*</span></Label>
                <Input id="startupName" name="startupName" value={formData.startupName} onChange={handleChange} placeholder="e.g. Spendwise" className="h-12 bg-white border-gray-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Business Model<span className="text-red-500 ml-1">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setFormData(p => ({ ...p, businessModel: 'tech_startup' }))}
                    className={`p-4 rounded-2xl border-2 transition-all text-left space-y-1 ${formData.businessModel === 'tech_startup' ? 'border-[#00D395] bg-[#00D395]/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <Rocket className={`w-5 h-5 ${formData.businessModel === 'tech_startup' ? 'text-[#00D395]' : 'text-gray-400'}`} />
                    <p className="text-sm font-bold">Tech Startup</p>
                    <p className="text-[10px] text-gray-500">SaaS, App, AI, etc.</p>
                  </button>
                  <button 
                    onClick={() => setFormData(p => ({ ...p, businessModel: 'sme', sector: '' }))}
                    className={`p-4 rounded-2xl border-2 transition-all text-left space-y-1 ${formData.businessModel === 'sme' ? 'border-[#00D395] bg-[#00D395]/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <MapPin className={`w-5 h-5 ${formData.businessModel === 'sme' ? 'text-[#00D395]' : 'text-gray-400'}`} />
                    <p className="text-sm font-bold">SME</p>
                    <p className="text-[10px] text-gray-500">Retail, F&B, Services</p>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Sector<span className="text-red-500 ml-1">*</span></Label>
                  <Select value={formData.sector} onValueChange={(v) => setFormData(p => ({ ...p, sector: v }))}>
                    <SelectTrigger className="h-12 border-gray-100">
                      <SelectValue placeholder="Select Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.businessModel === 'tech_startup' ? TECH_SECTORS : SME_SECTORS).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.sector === "Other" && (
                    <Input 
                      name="customSector" 
                      value={formData.customSector} 
                      onChange={handleChange} 
                      placeholder="Specify your sector..." 
                      className="h-12 bg-white border-gray-100 mt-2" 
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Currency<span className="text-red-500 ml-1">*</span></Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData(p => ({ ...p, currency: v }))}>
                    <SelectTrigger className="h-12 border-gray-100">
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">Naira (₦)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Current Stage<span className="text-red-500 ml-1">*</span></Label>
                <Select value={formData.currentStage} onValueChange={(v) => setFormData(p => ({ ...p, currentStage: v }))}>
                  <SelectTrigger className="h-12 border-gray-100">
                    <SelectValue placeholder="Select Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Early">Early (Ideation)</SelectItem>
                    <SelectItem value="Growth">Growth (Traction)</SelectItem>
                    <SelectItem value="Scaling">Scaling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50/50 p-6 flex gap-3">
              <Button variant="ghost" onClick={prevStep} className="h-12 font-bold px-6"><ChevronLeft className="mr-2 w-4 h-4" /> Back</Button>
              <Button onClick={nextStep} className="flex-1 bg-[#00D395] hover:bg-[#00A389] text-white rounded-full h-12 font-bold" disabled={!formData.startupName || !formData.sector || !formData.currency || !formData.currentStage}>
                Next: Metrics Setup <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: METRICS SETUP */}
        {step === 3 && (
          <Card className="bg-white border-gray-200 shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00D395]" /> Metrics Configurator
              </CardTitle>
              <CardDescription className="font-medium">Your dashboard is built around these metrics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* SECTION A: CORE METRICS (Fixed) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#00D395]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Core Metrics <span className="text-[#00D395] ml-1">(Always Included)</span></p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {CORE_METRICS.map((m) => (
                    <div key={m.key} className="flex items-center justify-between p-3 bg-[#00D395]/5 border border-[#00D395]/20 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-[#1A1A1A]">{m.label}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{m.description}</p>
                      </div>
                      <span className="text-[10px] font-bold text-[#00D395] bg-[#00D395]/10 px-2 py-0.5 rounded-full">Fixed</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: CUSTOM SECTOR METRICS (Editable) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5 text-[#F5A623]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Custom Metrics <span className="text-gray-400 ml-1 normal-case font-medium">(Based on your sector — edit or remove)</span></p>
                </div>
                <div className="space-y-2">
                  {formData.metricConfig.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input 
                        value={metric} 
                        onChange={(e) => {
                          const newConfig = [...formData.metricConfig];
                          newConfig[index] = e.target.value;
                          setFormData(p => ({ ...p, metricConfig: newConfig }));
                        }}
                        placeholder={`e.g. Metric ${index + 1}`} 
                        className="h-11 bg-white border-gray-100 flex-1" 
                      />
                      <button
                        onClick={() => {
                          const newConfig = formData.metricConfig.filter((_, i) => i !== index);
                          setFormData(p => ({ ...p, metricConfig: newConfig }));
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove this metric"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {formData.metricConfig.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center py-2">All custom metrics removed. The 4 core metrics above will still power your dashboard.</p>
                )}
              </div>
              
              {/* SECTION C: SPEND BREAKDOWN CATEGORIES */}
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5 text-[#878A22]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Spend Breakdown Categories <span className="text-gray-400 ml-1 normal-case font-medium">(Customize labels for your burn charts)</span></p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {formData.spendLabels.map((label, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Category {index + 1}</Label>
                      <Input 
                        value={label} 
                        onChange={(e) => {
                          const newLabels = [...formData.spendLabels];
                          newLabels[index] = e.target.value;
                          setFormData(p => ({ ...p, spendLabels: newLabels }));
                        }}
                        className="h-10 bg-white border-gray-100 text-sm" 
                      />
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
            <CardFooter className="bg-gray-50/50 p-6 flex gap-3">
              <Button variant="ghost" onClick={prevStep} className="h-12 font-bold px-6"><ChevronLeft className="mr-2 w-4 h-4" /> Back</Button>
              <Button onClick={nextStep} className="flex-1 bg-[#00D395] hover:bg-[#00A389] text-white rounded-full h-12 font-bold">
                Next: Presence <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 4: SOCIAL HUB */}
        {step === 4 && (
          <Card className="bg-white border-gray-200 shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#00D395]" /> Digital Presence
              </CardTitle>
              <CardDescription className="font-medium">Where can we find you online?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website" className="text-xs font-bold uppercase tracking-widest text-gray-500">Website URL</Label>
                <Input id="website" name="website" value={formData.website} onChange={handleChange} placeholder="https://..." className="h-12 bg-white border-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><Linkedin className="w-3 h-3" /> LinkedIn</Label>
                  <Input name="social_linkedin" value={formData.socialLinks.linkedin} onChange={handleChange} placeholder="Username" className="h-11 bg-white border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><Instagram className="w-3 h-3" /> Instagram</Label>
                  <Input name="social_instagram" value={formData.socialLinks.instagram} onChange={handleChange} placeholder="Username" className="h-11 bg-white border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><Twitter className="w-3 h-3" /> Twitter/X</Label>
                  <Input name="social_twitter" value={formData.socialLinks.twitter} onChange={handleChange} placeholder="Username" className="h-11 bg-white border-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">TikTok</Label>
                  <Input name="social_tiktok" value={formData.socialLinks.tiktok} onChange={handleChange} placeholder="Username" className="h-11 bg-white border-gray-100" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50/50 p-6 flex gap-3">
              <Button variant="ghost" onClick={prevStep} className="h-12 font-bold px-6"><ChevronLeft className="mr-2 w-4 h-4" /> Back</Button>
              <Button variant="outline" onClick={nextStep} className="h-12 font-bold rounded-full">Skip for now</Button>
              <Button 
                onClick={nextStep} 
                className="flex-1 bg-[#00D395] hover:bg-[#00A389] text-white rounded-full h-12 font-bold"
                disabled={!formData.website && !formData.socialLinks.linkedin && !formData.socialLinks.twitter && !formData.socialLinks.instagram && !formData.socialLinks.tiktok}
              >
                Next: Branding <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 5: BRANDING */}
        {step === 5 && (
          <Card className="bg-white border-gray-200 shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00D395]" /> Branding & Vision
              </CardTitle>
              <CardDescription className="font-medium">Final touch to your digital twin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50 gap-3 group hover:border-[#00D395]/40 transition-colors cursor-pointer relative">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} className="w-20 h-20 rounded-xl object-contain shadow-sm" alt="Logo preview" />
                ) : (
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin text-[#00D395]" /> : <Building2 className="w-8 h-8 text-gray-300" />}
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700">Company Logo<span className="text-red-500 ml-1">*</span></p>
                  <p className="text-[10px] text-gray-400 font-medium">Click to upload SVG or PNG</p>
                </div>
                <input type="file" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-gray-500">Brief Description<span className="text-red-500 ml-1">*</span></Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="Tell the Lab what you do in 1 sentence..." 
                  className="min-h-[100px] bg-white border-gray-100" 
                />
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50/50 p-6 flex gap-3">
              <Button variant="ghost" onClick={prevStep} className="h-12 font-bold px-6"><ChevronLeft className="mr-2 w-4 h-4" /> Back</Button>
              <Button onClick={handleSubmit} className="flex-1 bg-[#00D395] hover:bg-[#00A389] text-white rounded-full h-12 font-bold" disabled={isSubmitting || !formData.logoUrl || !formData.description}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Launching...</>
                ) : (
                  <><Target className="mr-2 h-4 w-4" /> Enter Founder Portal</>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="text-center mt-8">
          <Button variant="ghost" size="sm" className="text-gray-400 font-bold hover:text-gray-600" onClick={() => supabase.auth.signOut().then(() => navigate('/auth'))}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
