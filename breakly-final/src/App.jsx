import { useState } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = "service_ck0iv2j";
const EMAILJS_TEMPLATE_ID = "template_yleo6jr";
const EMAILJS_PUBLIC_KEY  = "13ZcU4rQOO88KG0GQ";
const ANTHROPIC_MODEL     = "claude-sonnet-4-20250514";
const PAYMENT_PHONE       = "+20 1093991887";

// ── DATA ──────────────────────────────────────────────────────────────
const relationTypes = [
  { value:"serious",      emoji:"💍", label:"Serious",      desc:"Long-term partner" },
  { value:"casual",       emoji:"🌹", label:"Casual",       desc:"Few months together" },
  { value:"longdistance", emoji:"✈️", label:"Long Distance",desc:"Miles apart" },
  { value:"complicated",  emoji:"🌀", label:"Complicated",  desc:"On & off" },
  { value:"engagement",   emoji:"💔", label:"Engagement",   desc:"Called off" },
];

const toneOptions = [
  { value:"gentle",    emoji:"🕊️", label:"Gentle",    desc:"Soft, caring goodbye" },
  { value:"firm",      emoji:"🧊", label:"Firm",      desc:"No negotiation" },
  { value:"emotional", emoji:"😢", label:"Emotional", desc:"From the heart" },
  { value:"brief",     emoji:"📄", label:"Brief",     desc:"Short & clear" },
];

const packages = [
  {
    id:"standard", emoji:"📞", name:"Standard Call", price:99,
    tagline:"Clean & simple goodbye", color:"#e8756a", badge:null,
    features:[
      "Professional phone call to your partner",
      "AI-crafted personalized breakup message",
      "Delivery confirmation sent to you",
      "24-hour turnaround",
    ],
  },
  {
    id:"agent", emoji:"🎯", name:"Agent Visit", price:499,
    tagline:"In-person closure, handled", color:"#c0392b", badge:"MOST POPULAR",
    features:[
      "Trained agent meets them in person",
      "You choose the exact date & location",
      "AI-crafted personalized message",
      "Full debrief report after delivery",
      "Priority support",
    ],
  },
  {
    id:"consultation", emoji:"💛", name:"Consultation", price:699,
    tagline:"Try to save it first", color:"#d4a017", badge:"SAVE THE RELATIONSHIP",
    features:[
      "45-min session with a relationship advisor",
      "Honest assessment of your situation",
      "Actionable advice to reconcile",
      "If you still break up — 50% off Standard Call",
    ],
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────
const FloatingHeart = ({ style }) => (
  <div style={{ position:"absolute", fontSize:"12px", opacity:0.12, animation:"floatUp 7s infinite", pointerEvents:"none", ...style }}>💔</div>
);

const Field = ({ label, children }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
    <label style={{ fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", color:"#9a7070" }}>{label}</label>
    {children}
  </div>
);

const SummarySection = ({ title, children }) => (
  <div style={{ padding:"14px 18px" }}>
    <div style={{ fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", color:"#e8756a", marginBottom:"10px" }}>{title}</div>
    {children}
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:"13px" }}>
    <span style={{ color:"#7a5a5a" }}>{label}</span>
    <span style={{ color:"#f0d0c8" }}>{value}</span>
  </div>
);

// ── SEND EMAIL via EmailJS (with iframe-safe fallback) ───────────────
function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) {
      try { window.emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e) {}
      return resolve(window.emailjs);
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
    script.onload = () => {
      try { window.emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e) {}
      resolve(window.emailjs);
    };
    script.onerror = () => reject(new Error("SDK load failed"));
    document.head.appendChild(script);
  });
}

async function sendBookingEmail({ pkg, form, message }) {
  // Try EmailJS first
  try {
    const ejs = await loadEmailJS();
    const result = await ejs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      package:       `${pkg.emoji} ${pkg.name}`,
      price:         `${pkg.price}`,
      client_name:   form.yourName,
      client_phone:  form.yourPhone,
      partner_name:  form.partnerName  || "N/A",
      partner_phone: form.partnerPhone || "N/A",
      breakup_date:  form.breakupDate  || "N/A",
      tone:          form.tone         || "N/A",
      message:       message           || "N/A",
    });
    if (result.status === 200) return { method: "emailjs" };
  } catch(e) {
    console.warn("EmailJS blocked, using mailto fallback:", e);
  }
  // Fallback: open mailto link
  const subject = encodeURIComponent(`New Breakly Booking - ${pkg.name}`);
  const body = encodeURIComponent(
`New Breakly Booking!

Package: ${pkg.emoji} ${pkg.name}
Price: ${pkg.price} EGP
Client: ${form.yourName}
Client Phone: ${form.yourPhone}
Partner: ${form.partnerName || "N/A"}
Partner Phone: ${form.partnerPhone || "N/A"}
Breakup Date: ${form.breakupDate || "N/A"}
Tone: ${form.tone || "N/A"}

Message:
${message || "N/A"}`
  );
  window.open(`mailto:yahia.mohamed@outlook.com?subject=${subject}&body=${body}`, "_blank");
  return { method: "mailto" };
}

// ── GENERATE MESSAGE via Anthropic ───────────────────────────────────
async function generateBreakupMessage({ form }) {
  const prompt = `Write a sincere ${form.tone} breakup message from ${form.yourName} (${form.yourAge}) to ${form.partnerName} (${form.partnerAge}). Relationship type: ${form.relationType}. Reason: ${form.reason || "growing apart"}. 3 paragraphs, heartfelt, no preamble or labels — just the message itself.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      messages:[{ role:"user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "Could not generate message.";
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function Breakly() {
  const [screen, setScreen]               = useState("landing");
  const [formStep, setFormStep]           = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [aiLoading, setAiLoading]         = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState("");
  const [form, setForm] = useState({
    yourName:"", yourAge:"", yourGender:"", yourPhone:"",
    relationType:"", partnerName:"", partnerAge:"",
    partnerGender:"", partnerPhone:"", breakupDate:"",
    tone:"", reason:"", customMessage:"",
  });

  const update  = (f, v) => setForm(p => ({ ...p, [f]:v }));
  const pkg     = packages.find(p => p.id === selectedPackage);
  const isConsult = selectedPackage === "consultation";

  const canProceed = () => {
    if (formStep===1) return form.yourName && form.yourAge && form.yourGender && form.yourPhone && (isConsult || form.relationType);
    if (formStep===2) return form.partnerName && form.partnerAge && form.partnerGender && form.partnerPhone && form.breakupDate;
    if (formStep===3) return form.tone && (generatedMessage || form.customMessage);
    return true;
  };

  const handleNext = () => {
    if (isConsult) { if (formStep===1) setScreen("payment"); }
    else { if (formStep < 4) setFormStep(formStep+1); else setScreen("payment"); }
  };

  const handleBack = () => {
    if (formStep===1) setScreen("package");
    else setFormStep(formStep-1);
  };

  const handleGenerateMessage = async () => {
    setAiLoading(true);
    try {
      const msg = await generateBreakupMessage({ form });
      setGeneratedMessage(msg);
      update("customMessage", msg);
    } catch {
      setGeneratedMessage("Could not generate. Please write your own message below.");
    }
    setAiLoading(false);
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await sendBookingEmail({ pkg, form, message: form.customMessage || generatedMessage });
      setScreen("success");
    } catch (e) {
      const msg = e?.text || e?.message || (typeof e === "object" ? JSON.stringify(e) : String(e));
      setSubmitError(`Error: ${msg}`);
    }
    setSubmitting(false);
  };

  const resetAll = () => {
    setScreen("landing"); setFormStep(1); setSelectedPackage(null);
    setGeneratedMessage(""); setSubmitError("");
    setForm({ yourName:"",yourAge:"",yourGender:"",yourPhone:"",relationType:"",partnerName:"",partnerAge:"",partnerGender:"",partnerPhone:"",breakupDate:"",tone:"",reason:"",customMessage:"" });
  };

  const hearts = [
    {top:"8%",left:"4%",animationDelay:"0s"},{top:"22%",left:"92%",animationDelay:"1.2s"},
    {top:"55%",left:"2%",animationDelay:"2.4s"},{top:"72%",left:"94%",animationDelay:"0.6s"},
    {top:"88%",left:"12%",animationDelay:"1.8s"},{top:"38%",left:"90%",animationDelay:"3.2s"},
  ];

  const formSteps   = isConsult ? ["You","Confirm"] : ["You","Them","Message","Confirm"];
  const displayStep = isConsult ? 1 : formStep;

  // ── LANDING ────────────────────────────────────────────────────────
  if (screen==="landing") return (
    <div style={s.page}><style>{css}</style>
      {hearts.map((h,i)=><FloatingHeart key={i} style={h}/>)}
      <div style={s.center}>
        <div style={s.logoWrap}>
          <span style={s.logoHeart}>💔</span>
          <div style={s.logoPulse}/>
        </div>
        <h1 style={s.brand}>Breakly</h1>
        <p style={s.tagline}>End it. Kindly.</p>
        <p style={s.desc}>Ending a relationship is hard.<br/>We handle the goodbye — so you don't have to.</p>
        <div style={s.statsRow}>
          {[["500+","Goodbyes"],["98%","Closure"],["24h","Speed"]].map(([n,l])=>(
            <div key={l} style={s.stat}><span style={s.statN}>{n}</span><span style={s.statL}>{l}</span></div>
          ))}
        </div>
        <button style={s.cta} onClick={()=>setScreen("package")}>Book Your Goodbye →</button>
        <p style={s.ctaNote}>Confidential · Discreet · Professional</p>
      </div>
    </div>
  );

  // ── PACKAGES ───────────────────────────────────────────────────────
  if (screen==="package") return (
    <div style={s.page}><style>{css}</style>
      {hearts.map((h,i)=><FloatingHeart key={i} style={h}/>)}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={()=>setScreen("landing")}>←</button>
        <span style={s.topLogo}>💔 Breakly</span>
        <div style={{width:32}}/>
      </div>
      <div style={s.inner}>
        <div style={s.secHead}><h2 style={s.secTitle}>Choose Your Package</h2><p style={s.secSub}>Select the service that fits your situation</p></div>
        {packages.map(p=>(
          <div key={p.id} onClick={()=>setSelectedPackage(p.id)}
            style={{...s.pkgCard,...(selectedPackage===p.id?{borderColor:p.color,boxShadow:`0 0 24px ${p.color}25`,background:"#1e0808"}:{})}}>
            {p.badge&&<div style={{...s.badge,background:p.color}}>{p.badge}</div>}
            <div style={s.pkgTop}>
              <div style={s.pkgLeft}>
                <span style={s.pkgEmoji}>{p.emoji}</span>
                <div><div style={s.pkgName}>{p.name}</div><div style={s.pkgSub}>{p.tagline}</div></div>
              </div>
              <div style={s.pkgPriceRow}>
                <span style={{...s.pkgPrice,color:p.color}}>{p.price}</span>
                <span style={s.pkgCurr}>EGP</span>
              </div>
            </div>
            <div style={s.pkgFeatures}>
              {p.features.map((f,i)=>(
                <div key={i} style={s.pkgFeat}><span style={{...s.featDot,background:p.color}}/>{f}</div>
              ))}
            </div>
            {selectedPackage===p.id&&<div style={{...s.pkgTick,color:p.color}}>✓ Selected</div>}
          </div>
        ))}
        <button style={{...s.cta,...(selectedPackage?{}:s.ctaOff)}} onClick={()=>selectedPackage&&setScreen("form")} disabled={!selectedPackage}>
          Continue with {pkg?pkg.name:"a package"} →
        </button>
      </div>
    </div>
  );

  // ── FORM ───────────────────────────────────────────────────────────
  if (screen==="form") return (
    <div style={s.page}><style>{css}</style>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={handleBack}>←</button>
        <span style={s.topLogo}>💔 Breakly</span>
        <span style={s.topStep}>{displayStep}/{formSteps.length}</span>
      </div>
      <div style={s.progress}>
        {formSteps.map((label,i)=>(
          <div key={i} style={s.progItem}>
            <div style={{...s.progDot,...(displayStep>i+1?s.progDone:displayStep===i+1?s.progActive:{})}}>{displayStep>i+1?"✓":i+1}</div>
            <span style={{...s.progLabel,...(displayStep>=i+1?s.progLabelOn:{})}}>{label}</span>
            {i<formSteps.length-1&&<div style={{...s.progLine,...(displayStep>i+1?s.progLineDone:{})}}/>}
          </div>
        ))}
      </div>
      <div style={{...s.card,maxWidth:"480px",width:"100%",margin:"0 16px"}}>

        {/* STEP 1 — You */}
        {formStep===1&&<>
          <div><h2 style={s.cardTitle}>{isConsult?"Your Details":"About You"}</h2><p style={s.cardSub}>{isConsult?"Tell us who you are":"Let's start with your details"}</p></div>
          <Field label="Your Full Name"><input style={s.inp} placeholder="e.g. Ahmed Hassan" value={form.yourName} onChange={e=>update("yourName",e.target.value)}/></Field>
          <div style={s.two}>
            <Field label="Age"><input style={s.inp} type="number" placeholder="25" value={form.yourAge} onChange={e=>update("yourAge",e.target.value)}/></Field>
            <Field label="Gender"><select style={s.inp} value={form.yourGender} onChange={e=>update("yourGender",e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
          </div>
          <Field label="Your Phone"><input style={s.inp} placeholder="+20 1XX XXX XXXX" value={form.yourPhone} onChange={e=>update("yourPhone",e.target.value)}/></Field>
          {!isConsult&&(
            <Field label="Relationship Type">
              <div style={s.chipGrid}>
                {relationTypes.map(r=>(
                  <button key={r.value} style={{...s.chip,...(form.relationType===r.value?s.chipOn:{})}} onClick={()=>update("relationType",r.value)}>
                    <span style={s.chipEmoji}>{r.emoji}</span><span style={s.chipLabel}>{r.label}</span><span style={s.chipDesc}>{r.desc}</span>
                  </button>
                ))}
              </div>
            </Field>
          )}
        </>}

        {/* STEP 2 — Them */}
        {formStep===2&&!isConsult&&<>
          <div><h2 style={s.cardTitle}>About Them</h2><p style={s.cardSub}>Who are we saying goodbye to?</p></div>
          <Field label="Their Full Name"><input style={s.inp} placeholder="e.g. Sara Mohamed" value={form.partnerName} onChange={e=>update("partnerName",e.target.value)}/></Field>
          <div style={s.two}>
            <Field label="Their Age"><input style={s.inp} type="number" placeholder="23" value={form.partnerAge} onChange={e=>update("partnerAge",e.target.value)}/></Field>
            <Field label="Their Gender"><select style={s.inp} value={form.partnerGender} onChange={e=>update("partnerGender",e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
          </div>
          <Field label="Their Phone"><input style={s.inp} placeholder="+20 1XX XXX XXXX" value={form.partnerPhone} onChange={e=>update("partnerPhone",e.target.value)}/></Field>
          <Field label="Breakup Date"><input style={s.inp} type="date" value={form.breakupDate} onChange={e=>update("breakupDate",e.target.value)} min={new Date().toISOString().split("T")[0]}/></Field>
        </>}

        {/* STEP 3 — Message */}
        {formStep===3&&!isConsult&&<>
          <div><h2 style={s.cardTitle}>The Message</h2><p style={s.cardSub}>Our AI crafts the perfect goodbye</p></div>
          <Field label="Message Tone">
            <div style={s.chipGrid}>
              {toneOptions.map(t=>(
                <button key={t.value} style={{...s.chip,...(form.tone===t.value?s.chipOn:{})}} onClick={()=>update("tone",t.value)}>
                  <span style={s.chipEmoji}>{t.emoji}</span><span style={s.chipLabel}>{t.label}</span><span style={s.chipDesc}>{t.desc}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Reason (optional)"><input style={s.inp} placeholder="e.g. We grew apart..." value={form.reason} onChange={e=>update("reason",e.target.value)}/></Field>
          {form.tone&&(
            <button style={{...s.genBtn,...(aiLoading?s.genBtnOff:{})}} onClick={handleGenerateMessage} disabled={aiLoading}>
              {aiLoading?<><span style={s.spin}/>Crafting your message...</>:"✨ Generate with AI"}
            </button>
          )}
          {generatedMessage&&(
            <div style={s.msgBox}>
              <div style={s.msgHead}><span style={s.msgHeadTitle}>Your Message</span><span style={s.aiBadge}>AI ✦</span></div>
              <textarea style={s.msgArea} rows={7} value={form.customMessage||generatedMessage} onChange={e=>update("customMessage",e.target.value)}/>
              <p style={s.msgHint}>✏️ Edit freely before submitting</p>
            </div>
          )}
        </>}

        {/* STEP 4 — Review */}
        {formStep===4&&<>
          <div><h2 style={s.cardTitle}>Review</h2><p style={s.cardSub}>Check your details before payment</p></div>
          <div style={s.sumBlock}>
            <SummarySection title="👤 You">
              <SummaryRow label="Name" value={form.yourName}/>
              <SummaryRow label="Phone" value={form.yourPhone}/>
            </SummarySection>
            {!isConsult&&<>
              <div style={s.sumDiv}/>
              <SummarySection title="💔 Them">
                <SummaryRow label="Name" value={form.partnerName}/>
                <SummaryRow label="Date" value={form.breakupDate}/>
              </SummarySection>
              {form.customMessage&&<>
                <div style={s.sumDiv}/>
                <SummarySection title="📝 Message">
                  <p style={s.msgPrev}>{(form.customMessage||"").slice(0,140)}...</p>
                  <span style={s.tonePill}>{toneOptions.find(t=>t.value===form.tone)?.emoji} {toneOptions.find(t=>t.value===form.tone)?.label}</span>
                </SummarySection>
              </>}
            </>}
            <div style={s.sumDiv}/>
            <SummarySection title="📦 Package">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#f0d0c8",fontSize:"14px"}}>{pkg?.emoji} {pkg?.name}</span>
                <span style={{color:pkg?.color,fontSize:"20px",fontWeight:"700",fontFamily:"'Playfair Display',serif"}}>{pkg?.price} EGP</span>
              </div>
            </SummarySection>
          </div>
        </>}

        <div style={s.navRow}>
          <button style={s.navBack} onClick={handleBack}>← Back</button>
          <button style={{...s.navNext,...(!canProceed()&&formStep!==4?s.navNextOff:{})}} onClick={()=>(canProceed()||formStep===4)&&handleNext()}>
            {formStep===4||isConsult?"Proceed to Payment →":"Continue →"}
          </button>
        </div>
      </div>
      <p style={s.footer}>Breakly © 2025 · Confidential</p>
    </div>
  );

  // ── PAYMENT ────────────────────────────────────────────────────────
  if (screen==="payment") return (
    <div style={s.page}><style>{css}</style>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={()=>{setFormStep(isConsult?1:4);setScreen("form");}}>←</button>
        <span style={s.topLogo}>💔 Breakly</span>
        <div style={{width:32}}/>
      </div>
      <div style={s.inner}>
        <div style={s.secHead}><h2 style={s.secTitle}>Payment</h2><p style={s.secSub}>Complete your booking securely</p></div>

        {/* Order Summary */}
        <div style={s.orderCard}>
          <div style={s.orderHead}>Order Summary</div>
          <div style={s.orderRow}><span>{pkg?.emoji} {pkg?.name}</span><span style={{color:pkg?.color,fontWeight:"700"}}>{pkg?.price} EGP</span></div>
          <div style={s.orderRow}><span style={{color:"#7a5a5a"}}>Service fee</span><span style={{color:"#7a5a5a"}}>0 EGP</span></div>
          <div style={s.orderDiv}/>
          <div style={{...s.orderRow,fontSize:"15px"}}>
            <span style={{color:"#f0d0c8",fontWeight:"600"}}>Total</span>
            <span style={{color:pkg?.color,fontSize:"22px",fontWeight:"700",fontFamily:"'Playfair Display',serif"}}>{pkg?.price} EGP</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={s.secLabel}>Payment Methods</div>
        <div style={s.payGrid}>
          <div style={s.payOpt}>
            <span style={{fontSize:"24px"}}>📱</span>
            <div>
              <div style={s.payLabel}>Vodafone Cash</div>
              <div style={{...s.payDesc,color:"#e8756a",fontWeight:"600"}}>{PAYMENT_PHONE}</div>
            </div>
          </div>
          <div style={s.payOpt}>
            <span style={{fontSize:"24px"}}>⚡</span>
            <div>
              <div style={s.payLabel}>InstaPay</div>
              <div style={{...s.payDesc,color:"#e8756a",fontWeight:"600"}}>{PAYMENT_PHONE}</div>
            </div>
          </div>
          <div style={s.payOpt}>
            <span style={{fontSize:"24px"}}>🏪</span>
            <div>
              <div style={s.payLabel}>Fawry</div>
              <div style={s.payDesc}>Pay at any kiosk</div>
            </div>
          </div>
          <div style={s.payOpt}>
            <span style={{fontSize:"24px"}}>💳</span>
            <div>
              <div style={s.payLabel}>Credit Card</div>
              <div style={s.payDesc}>Visa / Mastercard</div>
            </div>
          </div>
        </div>

        <div style={s.payNote}>
          💡 After confirming, our team will contact you at <strong style={{color:"#e8756a"}}>{form.yourPhone}</strong> within 30 minutes with payment instructions.
        </div>

        {submitError&&(
          <div style={s.errorBox}>⚠️ {submitError}</div>
        )}

        <button style={{...s.cta,...(submitting?s.ctaOff:{})}} onClick={handleConfirmPayment} disabled={submitting}>
          {submitting?<><span style={s.spin}/>Sending confirmation...</>:`💔 Confirm & Pay ${pkg?.price} EGP`}
        </button>

        <div style={s.secRow}><span>🔒 Secure</span><span>·</span><span>🕵️ Confidential</span><span>·</span><span>✅ Guaranteed</span></div>
      </div>
    </div>
  );

  // ── SUCCESS ────────────────────────────────────────────────────────
  return (
    <div style={s.page}><style>{css}</style>
      <div style={s.successWrap}>
        <div style={{fontSize:"60px",marginBottom:"18px",animation:"heartbeat 2s ease infinite"}}>💔</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"36px",color:"#f0d0c8",fontWeight:"400",marginBottom:"7px"}}>Booking Confirmed</h2>
        <p style={{fontSize:"12px",color:"#7a5a5a",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"28px"}}>Your Breakly agent has been assigned</p>
        <div style={{...s.card,width:"100%",maxWidth:"400px",gap:"0",padding:"0",overflow:"hidden"}}>
          {[
            ["Client",  form.yourName],
            ["Phone",   form.yourPhone],
            ["Package", `${pkg?.emoji} ${pkg?.name}`],
            ["Amount",  `${pkg?.price} EGP`],
            ...(form.breakupDate?[["Date",form.breakupDate]]:[]),
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"12px 18px",borderBottom:"1px solid #2a1010",fontSize:"13px"}}>
              <span style={{color:"#7a5a5a"}}>{k}</span>
              <span style={{color:k==="Amount"?pkg?.color:"#f0d0c8",fontWeight:"500"}}>{v}</span>
            </div>
          ))}
        </div>
        <p style={{fontSize:"13px",color:"#7a5a5a",lineHeight:"1.8",margin:"22px 0",textAlign:"center",maxWidth:"340px"}}>
          A confirmation has been sent to our team. We will contact you at <strong style={{color:"#e8756a"}}>{form.yourPhone}</strong> within 30 minutes.
        </p>
        <button style={{background:"transparent",border:"1px solid rgba(232,117,106,0.35)",borderRadius:"10px",padding:"12px 26px",color:"#e8756a",fontSize:"14px",cursor:"pointer"}} onClick={resetAll}>← Back to Breakly</button>
      </div>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input::placeholder { color: #5a3a3a; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #e8756a !important; box-shadow: 0 0 0 3px rgba(232,117,106,0.15) !important; }
  textarea { resize: vertical; }
  select option { background: #1c0a0a; }
  @keyframes floatUp { 0% { transform:translateY(0); opacity:.12; } 100% { transform:translateY(-110vh) rotate(25deg); opacity:0; } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse   { 0%,100% { transform:scale(1); opacity:.3; } 50% { transform:scale(1.5); opacity:0; } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes heartbeat { 0%,100%{transform:scale(1);} 25%{transform:scale(1.1);} 75%{transform:scale(.96);} }
`;

// ── STYLES ────────────────────────────────────────────────────────────
const s = {
  page:       { minHeight:"100vh", background:"#0f0505", fontFamily:"'DM Sans',sans-serif", color:"#f0d0c8", display:"flex", flexDirection:"column", alignItems:"center", position:"relative", overflow:"hidden", paddingBottom:"48px" },
  inner:      { width:"100%", maxWidth:"480px", padding:"0 16px", display:"flex", flexDirection:"column", gap:"14px" },
  center:     { display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", justifyContent:"center", minHeight:"100vh", padding:"40px 24px", width:"100%", maxWidth:"420px", animation:"fadeUp .8s ease" },
  logoWrap:   { position:"relative", display:"inline-block", marginBottom:"20px" },
  logoHeart:  { fontSize:"60px", display:"block", animation:"heartbeat 2s ease infinite" },
  logoPulse:  { position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"90px", height:"90px", borderRadius:"50%", border:"2px solid #e8756a", animation:"pulse 2s ease infinite" },
  brand:      { fontFamily:"'Playfair Display',serif", fontSize:"56px", fontWeight:"700", color:"#f0d0c8", letterSpacing:"3px", lineHeight:1, marginBottom:"10px" },
  tagline:    { fontFamily:"'Playfair Display',serif", fontStyle:"italic", fontSize:"20px", color:"#e8756a", letterSpacing:"5px", marginBottom:"18px" },
  desc:       { fontSize:"15px", color:"#8a6060", lineHeight:"1.9", marginBottom:"32px" },
  statsRow:   { display:"flex", marginBottom:"36px", background:"rgba(255,255,255,.03)", borderRadius:"16px", border:"1px solid rgba(232,117,106,.12)", overflow:"hidden", width:"100%" },
  stat:       { display:"flex", flexDirection:"column", padding:"16px 0", alignItems:"center", flex:1 },
  statN:      { fontFamily:"'Playfair Display',serif", fontSize:"24px", color:"#e8756a", fontWeight:"700" },
  statL:      { fontSize:"10px", color:"#7a5a5a", letterSpacing:"1px", textTransform:"uppercase", marginTop:"3px" },
  cta:        { background:"linear-gradient(135deg,#e8756a,#b03020)", border:"none", borderRadius:"14px", padding:"17px 36px", color:"#fff", fontSize:"16px", cursor:"pointer", fontFamily:"'Playfair Display',serif", letterSpacing:"1px", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", boxShadow:"0 8px 28px rgba(232,117,106,.35)", width:"100%", transition:"opacity .2s" },
  ctaOff:     { opacity:.45, cursor:"not-allowed" },
  ctaNote:    { fontSize:"11px", color:"#5a3a3a", letterSpacing:"2px", textTransform:"uppercase", marginTop:"12px" },
  topBar:     { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", width:"100%", maxWidth:"520px", marginTop:"8px" },
  backBtn:    { background:"transparent", border:"none", color:"#8a6060", fontSize:"18px", cursor:"pointer", padding:"4px 8px", lineHeight:1 },
  topLogo:    { fontFamily:"'Playfair Display',serif", color:"#f0d0c8", fontSize:"18px", letterSpacing:"1px" },
  topStep:    { fontSize:"12px", color:"#5a3a3a", letterSpacing:"2px", minWidth:"32px", textAlign:"right" },
  secHead:    { textAlign:"center", padding:"4px 0 6px" },
  secTitle:   { fontFamily:"'Playfair Display',serif", fontSize:"28px", color:"#f0d0c8", fontWeight:"400", marginBottom:"6px" },
  secSub:     { fontSize:"13px", color:"#7a5a5a" },
  secLabel:   { fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", color:"#9a7070" },
  pkgCard:    { background:"#160606", border:"1px solid #2a1010", borderRadius:"16px", padding:"18px", cursor:"pointer", transition:"all .25s", position:"relative", overflow:"hidden" },
  badge:      { position:"absolute", top:"12px", right:"12px", fontSize:"9px", color:"#fff", padding:"3px 8px", borderRadius:"20px", letterSpacing:"1px", fontWeight:"600" },
  pkgTop:     { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" },
  pkgLeft:    { display:"flex", alignItems:"center", gap:"12px" },
  pkgEmoji:   { fontSize:"28px" },
  pkgName:    { fontSize:"16px", color:"#f0d0c8", fontFamily:"'Playfair Display',serif" },
  pkgSub:     { fontSize:"11px", color:"#7a5a5a", marginTop:"2px" },
  pkgPriceRow:{ display:"flex", alignItems:"baseline", gap:"3px" },
  pkgPrice:   { fontFamily:"'Playfair Display',serif", fontSize:"32px", fontWeight:"700", lineHeight:1 },
  pkgCurr:    { fontSize:"12px", color:"#7a5a5a" },
  pkgFeatures:{ display:"flex", flexDirection:"column", gap:"7px" },
  pkgFeat:    { display:"flex", alignItems:"center", gap:"8px", fontSize:"12px", color:"#9a7070" },
  featDot:    { width:"5px", height:"5px", borderRadius:"50%", flexShrink:0 },
  pkgTick:    { fontSize:"11px", fontWeight:"600", marginTop:"12px", letterSpacing:"1px" },
  progress:   { display:"flex", alignItems:"flex-start", justifyContent:"center", width:"100%", maxWidth:"400px", padding:"0 20px", marginBottom:"16px" },
  progItem:   { display:"flex", flexDirection:"column", alignItems:"center", flex:1, position:"relative" },
  progDot:    { width:"28px", height:"28px", borderRadius:"50%", border:"1.5px solid #3a1a1a", color:"#5a3a3a", fontSize:"11px", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"600", zIndex:1, background:"#0f0505", transition:"all .3s" },
  progActive: { border:"1.5px solid #e8756a", color:"#e8756a", boxShadow:"0 0 14px rgba(232,117,106,.4)", background:"#1c0808" },
  progDone:   { background:"#e8756a", border:"1.5px solid #e8756a", color:"#fff" },
  progLabel:  { fontSize:"9px", color:"#4a2a2a", marginTop:"5px", letterSpacing:"1px", textTransform:"uppercase" },
  progLabelOn:{ color:"#e8756a" },
  progLine:   { position:"absolute", top:"14px", left:"50%", width:"100%", height:"1.5px", background:"#3a1a1a", zIndex:0 },
  progLineDone:{ background:"#e8756a" },
  card:       { background:"rgba(18,6,6,.97)", border:"1px solid rgba(232,117,106,.12)", borderRadius:"20px", padding:"26px 22px", display:"flex", flexDirection:"column", gap:"16px", animation:"fadeUp .35s ease" },
  cardTitle:  { fontFamily:"'Playfair Display',serif", fontSize:"26px", color:"#f0d0c8", fontWeight:"400", marginBottom:"4px" },
  cardSub:    { fontSize:"13px", color:"#7a5a5a" },
  inp:        { background:"#160606", border:"1px solid #2a1010", borderRadius:"10px", padding:"13px 14px", color:"#f0d0c8", fontSize:"14px", width:"100%", fontFamily:"'DM Sans',sans-serif", transition:"all .2s", outline:"none" },
  two:        { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" },
  chipGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" },
  chip:       { background:"#160606", border:"1px solid #2a1010", borderRadius:"12px", padding:"11px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", transition:"all .2s", outline:"none" },
  chipOn:     { background:"#200a0a", border:"1px solid #e8756a", boxShadow:"0 0 10px rgba(232,117,106,.18)" },
  chipEmoji:  { fontSize:"20px" },
  chipLabel:  { fontSize:"12px", color:"#f0d0c8", fontWeight:"500" },
  chipDesc:   { fontSize:"10px", color:"#7a5a5a" },
  genBtn:     { background:"linear-gradient(135deg,#e8756a,#b03525)", border:"none", borderRadius:"12px", padding:"14px", color:"#fff", fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" },
  genBtnOff:  { opacity:.6, cursor:"not-allowed" },
  spin:       { width:"13px", height:"13px", border:"2px solid rgba(255,255,255,.3)", borderTop:"2px solid white", borderRadius:"50%", animation:"spin .8s linear infinite", display:"inline-block", flexShrink:0 },
  msgBox:     { background:"#160606", border:"1px solid rgba(232,117,106,.18)", borderRadius:"12px", overflow:"hidden" },
  msgHead:    { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom:"1px solid #2a1010" },
  msgHeadTitle:{ fontSize:"10px", color:"#9a7070", letterSpacing:"2px", textTransform:"uppercase" },
  aiBadge:    { background:"#e8756a", color:"#fff", fontSize:"9px", padding:"2px 7px", borderRadius:"20px", letterSpacing:"1px" },
  msgArea:    { width:"100%", background:"transparent", border:"none", padding:"13px", color:"#f0d0c8", fontSize:"13px", lineHeight:"1.8", fontFamily:"'DM Sans',sans-serif", outline:"none" },
  msgHint:    { fontSize:"10px", color:"#5a3a3a", padding:"7px 13px", borderTop:"1px solid #2a1010" },
  sumBlock:   { background:"#160606", border:"1px solid rgba(232,117,106,.12)", borderRadius:"14px", overflow:"hidden" },
  sumDiv:     { height:"1px", background:"#2a1010" },
  msgPrev:    { fontSize:"12px", color:"#8a6060", lineHeight:"1.7", fontStyle:"italic", marginBottom:"9px" },
  tonePill:   { background:"#200a0a", border:"1px solid rgba(232,117,106,.3)", color:"#e8756a", fontSize:"11px", padding:"3px 9px", borderRadius:"20px", display:"inline-block" },
  navRow:     { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"6px", gap:"10px" },
  navBack:    { background:"transparent", border:"1px solid #2a1010", borderRadius:"10px", padding:"11px 18px", color:"#7a5a5a", fontSize:"13px", cursor:"pointer" },
  navNext:    { background:"linear-gradient(135deg,#e8756a,#b03020)", border:"none", borderRadius:"10px", padding:"13px 26px", color:"#fff", fontSize:"14px", cursor:"pointer", marginLeft:"auto", transition:"opacity .2s" },
  navNextOff: { opacity:.35, cursor:"not-allowed" },
  orderCard:  { background:"#160606", border:"1px solid rgba(232,117,106,.15)", borderRadius:"14px", padding:"18px", display:"flex", flexDirection:"column", gap:"10px" },
  orderHead:  { fontSize:"10px", color:"#9a7070", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"4px" },
  orderRow:   { display:"flex", justifyContent:"space-between", fontSize:"14px", color:"#f0d0c8" },
  orderDiv:   { height:"1px", background:"#2a1010", margin:"4px 0" },
  payGrid:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" },
  payOpt:     { background:"#160606", border:"1px solid #2a1010", borderRadius:"12px", padding:"14px 12px", display:"flex", alignItems:"center", gap:"10px" },
  payLabel:   { fontSize:"12px", color:"#f0d0c8", fontWeight:"500" },
  payDesc:    { fontSize:"11px", color:"#7a5a5a", marginTop:"2px" },
  payNote:    { background:"#120404", border:"1px solid #2a1010", borderRadius:"10px", padding:"13px 15px", fontSize:"12px", color:"#7a5a5a", lineHeight:"1.7" },
  errorBox:   { background:"#2a0808", border:"1px solid #c0392b", borderRadius:"10px", padding:"12px 15px", fontSize:"13px", color:"#e8756a" },
  secRow:     { display:"flex", justifyContent:"center", gap:"10px", fontSize:"11px", color:"#5a3a3a" },
  successWrap:{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"60px 24px 40px", maxWidth:"440px", width:"100%", animation:"fadeUp .6s ease" },
  footer:     { color:"#2a1010", fontSize:"10px", letterSpacing:"3px", marginTop:"28px", textTransform:"uppercase" },
};
