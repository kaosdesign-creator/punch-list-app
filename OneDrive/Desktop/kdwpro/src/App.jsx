import React, { useState, useEffect, useRef, useContext } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Pencil, ChevronRight, ArrowLeft, X, Clipboard, ImageIcon, Camera, Trash2, Search, Share2, Check, FileText, Download, Cloud, Settings, List, Eye, EyeOff, CheckCircle2, LogOut, User, ChevronDown, ChevronUp, Zap, Layout } from "lucide-react";

/* ─── SUPABASE ───────────────────────────────────────── */
const SUPA_URL = "https://rnfpfyaktfvfzqxttowc.supabase.co";
const STRIPE_PK = "pk_live_51Tg39uAcGg0zpi9O1ARzaVMYkIYk9k4fxt5XR7dnnISGWmRsgqgTQFqhdFUwemZA94SMnNUKzMaI2EbqAY6NcVQO00KZ7NwD5A";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZnBmeWFrdGZ2ZnpxeHR0b3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzYwNzAsImV4cCI6MjA5NTY1MjA3MH0.2obT_D2ce6yaoOH5NAk2wrgdDvb3BBEuT5rEeUXxVIM";
const sb = createClient(SUPA_URL, SUPA_KEY);

/* ─── PHOTO STORAGE HELPERS ──────────────────────────── */
const photoUrl = (path) => sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
const uploadPhoto = async (file, userId) => {
  // Read file data into memory immediately — prevents mobile GC invalidating File objects
  let uploadData = file;
  try {
    const buf = await file.arrayBuffer();
    uploadData = new Blob([buf], {type: file.type||"image/jpeg"});
  } catch { /* use original file if arrayBuffer() fails */ }
  const ext = ((file.name||"photo.jpg").split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"jpg");
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sb.storage.from("photos").upload(path, uploadData, {
    contentType: file.type||"image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path, url: photoUrl(path) };
};
const deletePhotoFile = async (path) => {
  if (path) await sb.storage.from("photos").remove([path]);
};

/* ─── SHARE TOKEN HELPERS ────────────────────────────── */
/* ─── IMAGE COMPRESSION ──────────────────────────────── */
// Resizes/compresses an image file client-side before upload.
// Returns a Promise<{dataUrl, blob}> — dataUrl for preview, blob for upload.
const compressImage = (file, maxDim = 1280, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve({ dataUrl, blob, width, height });
        }, "image/jpeg", quality);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const generateToken = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length: 24}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const uploadClientLogo = async (file, userId) => {
  const ext = (file.name || "png").split(".").pop();
  const path = `logos/${userId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("photos").upload(path, file, { upsert: true });
  if (error) throw error;
  return { path, url: photoUrl(path) };
};

/* ─── SMS NOTIFICATIONS ──────────────────────────────── */
// Non-blocking best-effort — never throws, never blocks the caller.
// Fires for owner-initiated writes only; collaborator-initiated add/closeout
// trigger this server-side from the collaborator-write edge function instead,
// so both paths are covered without duplicating client-side call sites.
const sendSmsNotification = async (projectId, itemTitle, action) => {
  try {
    await fetch("https://rnfpfyaktfvfzqxttowc.supabase.co/functions/v1/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
      body: JSON.stringify({ projectId, itemTitle, action }),
    });
  } catch (e) {
    console.log("SMS notification failed silently:", e.message);
  }
};

/* ─── STYLES ─────────────────────────────────────────── */
const injectStyles = () => {
  if (document.getElementById("kdw-styles")) return;
  const s = document.createElement("style");
  s.id = "kdw-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@100;200;300;400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Quicksand:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body,#root{height:100%;}
    body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#0D1117;color:#F0F2F4;-webkit-tap-highlight-color:transparent;transition:background 0.25s,color 0.25s;}
    input,select,textarea,button{font-family:inherit;}
    ::-webkit-scrollbar{width:3px;}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px;}
    input:focus,select:focus,textarea:focus{outline:2px solid rgba(248,81,73,0.6)!important;outline-offset:0!important;}
    .hide-scrollbar::-webkit-scrollbar{display:none;}
    @media print{.no-print{display:none!important;}body{background:#fff!important;color:#111!important;}}
    @keyframes logoIn{from{opacity:0;letter-spacing:.55em}to{opacity:1;letter-spacing:.35em}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.3);opacity:0.2}}
    @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    ::placeholder{color:#6B7280;font-weight:400;}
    select option{background:#161B22;color:#F0F2F4;}
  `;
  document.head.appendChild(s);
};

const applyTheme = (dark) => {
  document.body.style.background = dark ? '#0D1117' : '#F0F2F5';
  document.body.style.color      = dark ? '#F0F2F4' : '#111827';
  let ts = document.getElementById('kdw-theme-css');
  if(!ts){ ts=document.createElement('style'); ts.id='kdw-theme-css'; document.head.appendChild(ts); }
  if(dark){
    ts.textContent = `
      ::placeholder { color: rgba(240,242,244,0.55) !important; font-weight:400; }
      select, select option { background:#161B22 !important; color:#F0F2F4 !important; }
      input, textarea { color:#F0F2F4 !important; background:#161B22 !important; }
      select { color:#E5E7EB !important; background:#161B22 !important; }
    `;
  } else {
    ts.textContent = `
      ::placeholder { color: #6B7280 !important; font-weight:400; }
      select, select option { background:#ffffff !important; color:#111827 !important; }
      input, textarea { color:#111827 !important; background:#ffffff !important; }
      select { color:#374151 !important; background:#ffffff !important; }
    `;
  }
};

/* ─── THEME ──────────────────────────────────────────── */
const DARK = {
  bg0:"#0D1117",bg1:"#161B22",bg2:"#1C2128",bg3:"#21262D",
  b1:"rgba(255,255,255,0.06)",b2:"rgba(255,255,255,0.10)",b3:"rgba(255,255,255,0.18)",
  t1:"#F0F2F4",t2:"rgba(240,242,244,0.65)",t3:"rgba(240,242,244,0.35)",
  ac:"#455A64",acL:"#546E7A",acLL:"rgba(69,90,100,0.20)",
  green:"#3FB950",greenBg:"rgba(63,185,80,0.12)",
  yellow:"#D29922",yellowBg:"rgba(210,153,34,0.12)",
  red:"#F85149",redBg:"rgba(248,81,73,0.12)",
  purple:"#BC8CFF",purpleBg:"rgba(188,140,255,0.12)",
  blue:"#58A6FF",blueBg:"rgba(88,166,255,0.12)",
  sh1:"0 1px 4px rgba(0,0,0,0.4)",sh2:"0 4px 16px rgba(0,0,0,0.5)",sh3:"0 8px 32px rgba(0,0,0,0.6)",
  amber:"#D4A017",amberBg:"rgba(212,160,23,0.07)",amberBorder:"rgba(212,160,23,0.2)",
};
const LIGHT = {
  bg0:"#F0F2F5",bg1:"#FFFFFF",bg2:"#F4F6F8",bg3:"#E8ECF0",
  b1:"rgba(0,0,0,0.06)",b2:"rgba(0,0,0,0.10)",b3:"rgba(0,0,0,0.16)",
  t1:"#111827",t2:"rgba(17,24,39,0.65)",t3:"rgba(17,24,39,0.38)",
  ac:"#455A64",acL:"#546E7A",acLL:"rgba(69,90,100,0.10)",
  green:"#059669",greenBg:"rgba(5,150,105,0.10)",
  yellow:"#D97706",yellowBg:"rgba(217,119,6,0.10)",
  red:"#DC2626",redBg:"rgba(220,38,38,0.10)",
  purple:"#7C3AED",purpleBg:"rgba(124,58,237,0.10)",
  blue:"#2563EB",blueBg:"rgba(37,99,235,0.10)",
  sh1:"0 1px 4px rgba(0,0,0,0.08)",sh2:"0 4px 16px rgba(0,0,0,0.10)",sh3:"0 8px 32px rgba(0,0,0,0.12)",
  amber:"#B8860B",amberBg:"rgba(184,134,11,0.06)",amberBorder:"rgba(184,134,11,0.18)",
};
// D is set at runtime — see useTheme hook below
let D = DARK;

const MASTER_TRADES=["Beer","CO2","Concrete","Doors, Frames & Hardware","Drywall","Earthwork","Electrical","Fire Alarm","Fire Sprinklers","Fire Suppression","Flooring","Framing","HVAC","Insulation","Kitchen Equipment","Landscaping","Lockers","Low Voltage","Masonry","Millwork","Oil Recovery","Paint","Plumbing","Refrigeration","Roofing","Security","Signage","Soda","Storefront","Structural Steel","Tile","Toilet Accessories","Waterproofing","Windows","Other"];

const TEMPLATES = {
  "Full Service Restaurant":{icon:"🍽️",description:"Full service dining with full BOH, bar, and private spaces",sections:[
    {label:"Front of House",areas:["Dining Room (Main)","Private Dining Room","Bar Area","Lounge / Waiting Area","Patio / Terrace (Exterior)","Rooftop Dining","Restrooms","Vestibule"]},
    {label:"Back of House — Kitchen",areas:["Hot Line / Main Cooking Area","Cold Line / Salad Prep","Bakery / Pastry Section","Expo / Plating Pass","Dishwashing Area","Walk-in Cooler","Walk-in Freezer","Dry Storage"]},
    {label:"Staff & Admin",areas:["Break Room","Staff Restroom","Manager / GM Office","Receiving Dock / Bay"]},
    {label:"Utility & Mechanical",areas:["Trash & Recycling Room","Grease Trap Area","Dumpster Enclosure","DMARC Room","Chemical Storage","FAC Room","Utilities & Mechanical Room","Mechanical Room (HVAC)","IT / Server Room","Gas Meter Room","Water Shutoff / Backflow Room","Grease Interceptor Room","Rooftop Mechanical / HVAC Area","Sprinkler Riser Room","Elevator Machine Room"]},
  ]},
  "Fast Casual / QSR":{icon:"🥡",description:"Counter service, limited BOH, no table service",sections:[
    {label:"Front of House",areas:["Dining Room","Order Counter","Pickup Counter","Restrooms","Vestibule","Patio / Exterior Seating"]},
    {label:"Kitchen",areas:["Main Cook Line","Prep Area","Dishwashing Area","Walk-in Cooler","Walk-in Freezer","Dry Storage","Receiving Dock / Bay"]},
    {label:"Staff & Utility",areas:["Break Room","Manager Office","Trash & Recycling Room","Mechanical Room (HVAC)","Electrical Room","Grease Trap Area"]},
  ]},
  "Bar / Nightclub":{icon:"🍸",description:"Bar-forward concept with entertainment areas",sections:[
    {label:"Public Areas",areas:["Main Bar","Dance Floor / Stage","VIP Lounge","Patio / Rooftop","Restrooms","Entry / Coat Check"]},
    {label:"Back of House",areas:["Bar Back Storage","Keg Room / Walk-in Cooler","Kitchen / Food Prep","Receiving Dock / Bay","Dry Storage"]},
    {label:"Utility",areas:["Manager Office","Break Room","Mechanical Room","Electrical Room","Trash & Recycling Room"]},
  ]},
  "Residential":{icon:"🏠",description:"Single or multi-family residential construction and renovation",sections:[
    {label:"Entry",areas:["Exterior Entry","Interior Entry"]},
    {label:"Main Living",areas:["Living Room","Dining Room","Kitchen","Pantry"]},
    {label:"Master Suite",areas:["Master Bedroom","Master Bathroom","Master Closet"]},
    {label:"Bedrooms & Bathrooms",areas:["Bedroom 1","Bathroom 1","Bedroom 2","Bathroom 2"]},
    {label:"Utility",areas:["Utility / Laundry Room"]},
    {label:"Exterior",areas:["Exterior","Roof","Garage","Landscaping"]},
  ]},
  "Hotel":{icon:"🏨",description:"Full service hotel with guest rooms, F&B, meeting spaces, and BOH",sections:[
    {label:"Exterior & Site",areas:["Exterior Building Envelope","Landscaping & Irrigation","Parking Lot / Garage","Driveway / Porte-Cochère","Sidewalks & Entry Paths","Exterior Lighting","Signage","Trash / Dumpster Enclosure","Loading Dock","Bike Storage"]},
    {label:"Entry & Front of House",areas:["Vestibule","Lobby","Front Desk / Check-in Area","Bell Desk / Luggage Storage","Lobby Restrooms","Coat Check","Concierge Desk"]},
    {label:"Food & Beverage",areas:["Restaurant","Bar","Commercial Kitchen","Pantry / Service Kitchen","Dishwashing Area","Food Storage","Beverage Storage","Server Station / Wait Station","Break Room (F&B Staff)"]},
    {label:"Guest Rooms & Corridors",areas:["Guest Room Corridors","Standard Guest Room","Accessible Guest Room","Suite","Guest Bathroom","In-Room Safe Location","Balcony / Patio"]},
    {label:"Meeting & Event Spaces",areas:["Conference Room / Meeting Room","Pre-Function Area","Ballroom","Breakout Rooms","AV / Control Booth","Coat Check (Event)","Event Storage"]},
    {label:"Back of House Operations",areas:["Administrative Offices","Front Desk Back Office","Housekeeping Office","Laundry","Uniform / Linen Storage","Housekeeping Cart Parking / Supply Closet","Maintenance Shop","Receiving Area","General Storage"]},
    {label:"Engineering & Utility",areas:["Mechanical Room","Electrical Room","Fire Riser Room","IT / Server Room","Telecommunication Room","Elevator Machine Room","Water Heater Room","Grease Trap","Chiller Yard"]},
    {label:"Vertical Circulation",areas:["Elevator Cars","Elevator Lobbies (Per Floor)","Stairwells"]},
    {label:"Pool & Wellness",areas:["Swimming Pool","Pool Deck & Furniture","Hot Tub / Spa","Fitness Center","Locker Rooms","Pool Mechanical / Chemical Room"]},
    {label:"Housekeeping & Support",areas:["Linen Chute","Trash Chute","Recycling Room","Janitor Closets","Ice Maker Rooms"]},
  ]},
  "Office":{icon:"🏢",description:"Commercial office space — tenant improvement or ground-up",sections:[
    {label:"Site & Exterior",areas:["Parking Lot & Drives","Landscaping & Irrigation","Exterior Lighting & Signage","Sidewalks & Entry Plaza","Trash / Recycling Enclosure","Bicycle Storage"]},
    {label:"Entry & Reception",areas:["Vestibule","Reception Area","Waiting Area","Mail / Package Room"]},
    {label:"Open Office & Workstations",areas:["Open Cubicle Area","Private Offices","Collaboration Zones / Huddle Rooms"]},
    {label:"Meeting & Conference",areas:["Conference Room(s)","Training Room","Breakout / Phone Booths"]},
    {label:"Support & Amenities",areas:["Breakroom / Kitchenette","Restrooms (Per Floor / Wing)","Janitor Closet","IT / Server Room"]},
    {label:"Building Systems",areas:["Mechanical Room (HVAC)","Electrical Room (Panels)","Fire Riser Room","Telecom Room"]},
    {label:"Circulation",areas:["Main Corridors","Stairwells (Egress)","Elevator (If Applicable)"]},
    {label:"Storage",areas:["General Storage","File / Record Storage","Supply Closet"]},
    {label:"Safety & Compliance",areas:["Fire Extinguisher Cabinets","First Aid / AED Location","Exit Signage & Emergency Lighting"]},
  ]},
  "Warehouse":{icon:"🏭",description:"Distribution, fulfillment, or industrial warehouse",sections:[
    {label:"Site & Exterior",areas:["Site Grading & Drainage","Parking & Drives","Landscaping & Buffers","Exterior Lighting & Security Fencing","Truck Apron & Dock Approach","Signage & Gates"]},
    {label:"Dock & Loading",areas:["Loading Docks (Levelers, Doors, Seals)","Trailer Restraints & Dock Lighting","Dock Pits & Bumpers"]},
    {label:"Receiving & Shipping",areas:["Receiving / Shipping Offices","Staging & Queue Areas","Scale House (If Applicable)","Waste / Recycling Compactor Area"]},
    {label:"Warehouse Storage Floor",areas:["Racking Areas (Bulk, Selective, Drive-In)","Aisle Flooring & Markings","Hazmat Storage (If Any)","Battery Charging Station"]},
    {label:"Mezzanine",areas:["Mezzanine"]},
    {label:"Packing & Processing",areas:["Pick & Pack Zones","Packing Stations","Returns Area","Quality Control (QC) Area"]},
    {label:"Offices & Staff Amenities",areas:["Warehouse Manager Office","Shipping / Receiving Clerk Office","Break Room","Restrooms (Staff)","Janitor Closet","Training Room"]},
    {label:"Mechanical, Electrical & Fire Safety",areas:["Mechanical Room (HVAC, Air Handlers)","Electrical Room (Panels, Transformers)","Fire Riser Room & Fire Pump Room","Sprinkler System Zones","Air Compressor Room","Backup Generator Room"]},
    {label:"Vertical Circulation & Utility",areas:["Stair Towers","Freight Elevator (If Multi-Level)","Utility Chases / Chiller Yard"]},
    {label:"Specialized Environments",areas:["Cooler","Freezer","Dry Storage (Humidity Controlled)"]},
    {label:"Safety & Compliance",areas:["First Aid / AED Locations","Eyewash Stations","Spill Kit Storage"]},
  ]},
  "Blank / Custom":{icon:"📋",description:"Start with an empty area list and build your own",sections:[]},
};

const PRIORITY=["Low","Medium","High","Critical"];
const STATUS_CYCLE={open:"pending",pending:"accepted",accepted:"open"};
const STATUS_CFG={
  open:{label:"Open",color:D.red,bg:D.redBg},
  pending:{label:"Pending",color:D.yellow,bg:D.yellowBg},
  accepted:{label:"Accepted",color:D.green,bg:D.greenBg},
};
const NEXT_LABEL={open:"Mark Pending",pending:"Mark Accepted",accepted:"Reopen"};
const NEXT_CFG={
  open:{color:D.yellow,bg:D.yellowBg,border:"rgba(210,153,34,0.3)"},
  pending:{color:D.green,bg:D.greenBg,border:"rgba(63,185,80,0.3)"},
  accepted:{color:D.t3,bg:D.bg3,border:D.b2},
};
const PRI_CFG={
  Low:{color:D.green,bg:D.greenBg},Medium:{color:D.yellow,bg:D.yellowBg},
  High:{color:D.red,bg:D.redBg},Critical:{color:D.purple,bg:D.purpleBg},
};

const dInp=()=>({width:"100%",padding:"13px 16px",borderRadius:10,border:`1px solid ${D.b2}`,background:D.bg1,color:D.t1,fontSize:14,outline:"none",transition:"background 0.2s, border-color 0.2s, color 0.2s"});

/* ─── SPINNER ────────────────────────────────────────── */
function Spinner({size=20,color=D.t3}){return<div style={{width:size,height:size,border:`2px solid ${color}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>;}

/* ─── UI PRIMITIVES ──────────────────────────────────── */
function StatusBadge({status}){const s=STATUS_CFG[status]||STATUS_CFG.open;return<span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:100,fontSize:11,fontWeight:700,color:s.color,background:s.bg}}><span style={{width:5,height:5,borderRadius:"50%",background:s.color,flexShrink:0}}/>{s.label}</span>;}
function PriBadge({priority}){if(!priority)return null;const s=PRI_CFG[priority]||PRI_CFG.Medium;return<span style={{padding:"2px 9px",borderRadius:100,fontSize:10,fontWeight:700,color:s.color,background:s.bg}}>{priority}</span>;}
function SecLabel({children}){return<div style={{fontSize:10,fontWeight:700,color:D.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10,marginTop:4}}>{children}</div>;}

/* ─── LIGHTBOX — with left/right navigation ─────────── */
// Usage: <Lightbox photos={[{url},...]} startIndex={0} onClose={fn}/>
// OR legacy: <Lightbox photos={null} src="url" onClose={fn}/>
function Lightbox({photos,src,startIndex=0,onClose}){
  // Support both array mode and legacy single-src mode
  const list = photos && photos.length ? photos.map(p=>p.url||p) : (src?[src]:[]);
  const [idx,setIdx]=useState(startIndex);

  useEffect(()=>setIdx(startIndex),[startIndex]);

  useEffect(()=>{
    const h=e=>{
      if(e.key==="Escape") onClose();
      if(e.key==="ArrowRight") setIdx(i=>Math.min(i+1,list.length-1));
      if(e.key==="ArrowLeft")  setIdx(i=>Math.max(i-1,0));
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[list.length]);

  // Touch swipe support
  const touchStartX=useRef(null);
  const handleTouchStart=e=>{ touchStartX.current=e.touches[0].clientX; };
  const handleTouchEnd=e=>{
    if(touchStartX.current===null)return;
    const diff=touchStartX.current-e.changedTouches[0].clientX;
    if(diff>50)  setIdx(i=>Math.min(i+1,list.length-1));
    if(diff<-50) setIdx(i=>Math.max(i-1,0));
    touchStartX.current=null;
  };

  if(!list.length)return null;

  const canPrev=idx>0;
  const canNext=idx<list.length-1;
  const navBtn=(onClick,children,side)=>list.length<2?null:(
    <button onClick={e=>{e.stopPropagation();onClick();}}
      style={{position:"absolute",[side]:16,top:"50%",transform:"translateY(-50%)",
        width:44,height:44,borderRadius:"50%",
        background:side==="left"&&!canPrev||side==="right"&&!canNext?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.18)",
        border:"1px solid rgba(255,255,255,0.2)",cursor:side==="left"&&!canPrev||side==="right"&&!canNext?"default":"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        opacity:side==="left"&&!canPrev||side==="right"&&!canNext?0.2:1,
        transition:"all 0.15s",zIndex:10,fontSize:20,color:"#fff",fontWeight:300}}>
      {children}
    </button>
  );

  return(
    <div onClick={onClose}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:"20px 64px",animation:"fadeIn 0.2s ease"}}>
      {/* Close */}
      <button onClick={onClose} style={{position:"absolute",top:20,right:20,width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
        <X size={20} color="#fff"/>
      </button>
      {/* Prev */}
      {navBtn(()=>setIdx(i=>Math.max(i-1,0)),"‹","left")}
      {/* Image */}
      <img src={list[idx]} alt="" onClick={e=>e.stopPropagation()}
        style={{maxWidth:"100%",maxHeight:"85vh",borderRadius:12,boxShadow:"0 8px 48px rgba(0,0,0,0.8)",objectFit:"contain",userSelect:"none"}}/>
      {/* Next */}
      {navBtn(()=>setIdx(i=>Math.min(i+1,list.length-1)),"›","right")}
      {/* Counter */}
      {list.length>1&&(
        <div style={{position:"absolute",bottom:24,left:"50%",transform:"translateX(-50%)",
          background:"rgba(0,0,0,0.5)",borderRadius:100,padding:"5px 14px",
          fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.7)",letterSpacing:"0.05em"}}>
          {idx+1} of {list.length}
        </div>
      )}
    </div>
  );
}

/* ─── PHOTO GRID ─────────────────────────────────────── */
// photos = [{url, path?, id?, file?}] — url always set, file set for new uploads
/* ─── COLLABORATOR MANAGER ──────────────────────────── */
function CollaboratorManager({projId,user}){
  const [collabs,setCollabs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null); // null | index (0 or 1)
  const [form,setForm]=useState({fullName:"",companyName:"",title:"",email:"",phone:"",canAdd:false,canEdit:false,canDelete:false,canCloseout:false,closeoutAuthority:"both"});
  const [saving,setSaving]=useState(false);
  const [inviteLink,setInviteLink]=useState(null);

  useEffect(()=>{loadCollabs();},[projId]);

  const loadCollabs=async()=>{
    setLoading(true);
    const{data}=await sb.from("collaborators").select("*").eq("project_id",projId);
    setCollabs(data||[]);
    setLoading(false);
  };

  const startAdd=()=>{
    setForm({fullName:"",companyName:"",title:"",email:"",phone:"",canAdd:false,canEdit:false,canDelete:false,canCloseout:false,closeoutAuthority:"both"});
    setEditing(collabs.length);
    setInviteLink(null);
  };

  const startEdit=(c)=>{
    setForm({fullName:c.full_name||"",companyName:c.company_name||"",title:c.title||"",email:c.email||"",phone:c.phone||"",canAdd:c.can_add,canEdit:c.can_edit,canDelete:c.can_delete,canCloseout:c.can_closeout,closeoutAuthority:c.closeout_authority||"both"});
    setEditing(c.id);
    setInviteLink(null);
  };

  const saveCollab=async()=>{
    if(!form.fullName.trim()||!form.email.trim())return alert("Full name and email are required.");
    setSaving(true);
    try{
      const payload={
        project_id:projId,invited_by:user.id,
        full_name:form.fullName.trim(),company_name:form.companyName.trim()||null,
        title:form.title.trim()||null,email:form.email.trim(),phone:form.phone.trim()||null,
        can_add:form.canAdd,can_edit:form.canEdit,can_delete:form.canDelete,
        can_closeout:form.canCloseout,closeout_authority:form.closeoutAuthority,
      };
      let token;
      if(typeof editing==="number"){
        // New collaborator
        const{data,error}=await sb.from("collaborators").insert(payload).select().single();
        if(error)throw error;
        token=data.invite_token;
        setCollabs(prev=>[...prev,data]);
      } else {
        // Edit existing
        const{data,error}=await sb.from("collaborators").update(payload).eq("id",editing).select().single();
        if(error)throw error;
        token=data.invite_token;
        setCollabs(prev=>prev.map(c=>c.id===editing?data:c));
      }
      const link=`${window.location.origin}/collaborate/${token}`;
      setInviteLink(link);
      setEditing(null);
    }catch(e){alert("Failed to save: "+e.message);}
    setSaving(false);
  };

  const removeCollab=async(id)=>{
    if(!confirm("Remove this collaborator? They will lose access immediately."))return;
    await sb.from("collaborators").delete().eq("id",id);
    setCollabs(prev=>prev.filter(c=>c.id!==id));
  };

  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${D.b2}`,background:D.bg2,color:D.t1,fontSize:13,outline:"none",boxSizing:"border-box"};
  const chk=(label,key)=>(
    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:D.t2,marginBottom:6}}>
      <input type="checkbox" checked={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} style={{width:16,height:16,accentColor:D.ac,cursor:"pointer"}}/>
      {label}
    </label>
  );
  const radio=(label,val)=>(
    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:D.t2,marginBottom:4,marginLeft:24}}>
      <input type="radio" name="closeoutAuth" value={val} checked={form.closeoutAuthority===val} onChange={()=>setForm(f=>({...f,closeoutAuthority:val}))} style={{accentColor:D.ac,cursor:"pointer"}}/>
      {label}
    </label>
  );

  if(loading)return<div style={{fontSize:12,color:D.t3}}>Loading...</div>;

  return(
    <div>
      {/* Existing collaborators */}
      {collabs.map(c=>(
        <div key={c.id} style={{background:D.bg2,borderRadius:12,padding:14,marginBottom:10,border:`1px solid ${D.b1}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:D.t1}}>{c.full_name}</div>
              {c.company_name&&<div style={{fontSize:12,color:D.t2}}>{c.company_name}{c.title?` · ${c.title}`:""}</div>}
              <div style={{fontSize:12,color:D.t3,marginTop:2}}>{c.email}{c.phone?` · ${c.phone}`:""}</div>
              <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                {c.can_add&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:100,background:D.acLL,color:D.t2}}>Add Items</span>}
                {c.can_edit&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:100,background:D.acLL,color:D.t2}}>Edit Items</span>}
                {c.can_delete&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:100,background:D.acLL,color:D.t2}}>Delete Items</span>}
                {c.can_closeout&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:100,background:"rgba(63,185,80,0.12)",color:D.green}}>Close Out ({c.closeout_authority==="both"?"Both":c.closeout_authority==="me"?"Me Only":"Them Only"})</span>}
              </div>
              {c.verified&&<div style={{fontSize:11,color:D.green,marginTop:4}}>✓ Verified — Active</div>}
              {!c.verified&&(
                <div style={{marginTop:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <div style={{fontSize:11,color:D.yellow}}>⏳ Awaiting verification</div>
                    <button onClick={async()=>{
                      const{error}=await sb.from("collaborators").update({verified:true}).eq("id",c.id);
                      if(!error)setCollabs(prev=>prev.map(x=>x.id===c.id?{...x,verified:true}:x));
                      else alert("Could not verify: "+error.message);
                    }} style={{fontSize:10,padding:"2px 10px",borderRadius:6,background:D.greenBg,border:`1px solid rgba(63,185,80,0.3)`,color:D.green,cursor:"pointer",fontWeight:700}}>
                      ✓ Approve Access
                    </button>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <input readOnly value={`${window.location.origin}/collaborate/${c.invite_token}`}
                      style={{...inp,fontSize:10,padding:"4px 8px",color:D.t3,flex:1}}/>
                    <button onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/collaborate/${c.invite_token}`)}
                      style={{padding:"4px 10px",borderRadius:8,background:D.acLL,border:`1px solid ${D.b3}`,color:D.t1,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:8}}>
              <button onClick={()=>startEdit(c)} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,padding:4,display:"flex"}}><Pencil size={14}/></button>
              <button onClick={()=>removeCollab(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:D.red,padding:4,display:"flex"}}><Trash2 size={14}/></button>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8,paddingTop:8,borderTop:`1px solid ${D.b1}`}}>
            <div style={{fontSize:12,color:D.t2}}>📱 Text notifications</div>
            <div onClick={async()=>{
              const newVal=!c.sms_notifications;
              await sb.from("collaborators").update({sms_notifications:newVal}).eq("id",c.id);
              setCollabs(prev=>prev.map(x=>x.id===c.id?{...x,sms_notifications:newVal}:x));
            }} style={{width:36,height:20,borderRadius:10,cursor:"pointer",background:c.sms_notifications?D.green:D.bg3,position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <div style={{position:"absolute",top:2,left:c.sms_notifications?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
            </div>
          </div>
        </div>
      ))}

      {/* Add new */}
      {editing!==null&&typeof editing==="number"&&(
        <div style={{background:D.bg2,borderRadius:12,padding:16,marginBottom:10,border:`1px solid ${D.b1}`}}>
          <div style={{fontSize:13,fontWeight:700,color:D.t1,marginBottom:14}}>New Collaborator</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Full Name *</div><input value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))} placeholder="Jane Smith" style={inp}/></div>
              <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Title</div><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Project Manager" style={inp}/></div>
            </div>
            <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Company Name</div><input value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} placeholder="ABC Construction" style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Email *</div><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="jane@company.com" type="email" style={inp}/></div>
              <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Phone</div><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(555) 555-5555" style={inp}/></div>
            </div>
            <div>
              <div style={{fontSize:11,color:D.t3,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Permissions</div>
              {chk("Add Items","canAdd")}
              {chk("Edit Items","canEdit")}
              {chk("Delete Items","canDelete")}
              {chk("Close Out Items (Mark Accepted)","canCloseout")}
              {form.canCloseout&&(
                <div style={{marginTop:6,marginBottom:4,padding:"10px 12px",background:D.bg1,borderRadius:8,border:`1px solid ${D.b1}`}}>
                  <div style={{fontSize:11,color:D.t3,marginBottom:6,fontWeight:600}}>Who Can Close Out?</div>
                  {radio("Me Only","me")}
                  {radio("Them Only","them")}
                  {radio("Both of Us","both")}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEditing(null)} style={{flex:1,padding:10,borderRadius:10,background:D.bg1,border:`1px solid ${D.b2}`,color:D.t2,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
              <button onClick={saveCollab} disabled={saving} style={{flex:2,padding:10,borderRadius:10,background:saving?D.bg3:D.ac,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?"Saving...":"Save & Generate Invite Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit existing */}
      {editing!==null&&typeof editing==="string"&&(
        <div style={{background:D.bg2,borderRadius:12,padding:16,marginBottom:10,border:`1px solid ${D.b1}`}}>
          <div style={{fontSize:13,fontWeight:700,color:D.t1,marginBottom:14}}>Edit Collaborator</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Full Name *</div><input value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))} style={inp}/></div>
              <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Title</div><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={inp}/></div>
            </div>
            <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Company Name</div><input value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Email *</div><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={inp}/></div>
              <div><div style={{fontSize:11,color:D.t3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Phone</div><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={inp}/></div>
            </div>
            <div>
              <div style={{fontSize:11,color:D.t3,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Permissions</div>
              {chk("Add Items","canAdd")}
              {chk("Edit Items","canEdit")}
              {chk("Delete Items","canDelete")}
              {chk("Close Out Items (Mark Accepted)","canCloseout")}
              {form.canCloseout&&(
                <div style={{marginTop:6,marginBottom:4,padding:"10px 12px",background:D.bg1,borderRadius:8,border:`1px solid ${D.b1}`}}>
                  <div style={{fontSize:11,color:D.t3,marginBottom:6,fontWeight:600}}>Who Can Close Out?</div>
                  {radio("Me Only","me")}
                  {radio("Them Only","them")}
                  {radio("Both of Us","both")}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEditing(null)} style={{flex:1,padding:10,borderRadius:10,background:D.bg1,border:`1px solid ${D.b2}`,color:D.t2,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
              <button onClick={saveCollab} disabled={saving} style={{flex:2,padding:10,borderRadius:10,background:saving?D.bg3:D.ac,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:saving?"not-allowed":"pointer"}}>
                {saving?"Saving...":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {collabs.length<2&&editing===null&&(
        <button onClick={startAdd} style={{width:"100%",padding:11,borderRadius:12,background:D.acLL,border:`1px solid ${D.b3}`,color:D.t1,fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          + Add Collaborator
        </button>
      )}

      {inviteLink&&(
        <div style={{background:D.greenBg,border:`1px solid rgba(63,185,80,0.3)`,borderRadius:10,padding:12,marginTop:10}}>
          <div style={{fontSize:12,color:D.green,fontWeight:600,marginBottom:6}}>✓ Collaborator saved! Share this link with them:</div>
          <div style={{display:"flex",gap:6}}>
            <input readOnly value={inviteLink} style={{...inp,fontSize:11,color:D.t3,flex:1}}/>
            <button onClick={()=>navigator.clipboard.writeText(inviteLink)} style={{padding:"4px 10px",borderRadius:8,background:D.acLL,border:`1px solid ${D.b3}`,color:D.t1,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>Copy</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── CUSTOM SCROLL LIST ────────────────────────────── */
function CustomScrollList({children,height,style}){
  const containerRef=useRef(null);
  const isDragging=useRef(false);
  const dragStartY=useRef(0);
  const dragStartScroll=useRef(0);
  const [thumbTop,setThumbTop]=useState(0);
  const [thumbHeight,setThumbHeight]=useState(40);
  const [visible,setVisible]=useState(false);
  const hideTimer=useRef(null);

  const updateThumb=()=>{
    const el=containerRef.current;
    if(!el||el.scrollHeight<=el.clientHeight)return;
    const ratio=el.clientHeight/el.scrollHeight;
    const h=Math.max(40,ratio*el.clientHeight);
    const maxTop=el.clientHeight-h;
    const top=(el.scrollTop/(el.scrollHeight-el.clientHeight))*maxTop;
    setThumbHeight(h);
    setThumbTop(Math.min(top,maxTop));
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current=setTimeout(()=>setVisible(false),1500);
  };

  const startDrag=(clientY)=>{
    const el=containerRef.current;
    if(!el)return;
    isDragging.current=true;
    dragStartY.current=clientY;
    dragStartScroll.current=el.scrollTop;
  };

  useEffect(()=>{
    const onMouseMove=(e)=>{
      if(!isDragging.current||!containerRef.current)return;
      const el=containerRef.current;
      const delta=e.clientY-dragStartY.current;
      const ratio=delta/(el.clientHeight-thumbHeight);
      el.scrollTop=dragStartScroll.current+ratio*(el.scrollHeight-el.clientHeight);
      updateThumb();
    };
    const onTouchMove=(e)=>{
      if(!isDragging.current||!containerRef.current)return;
      const el=containerRef.current;
      const delta=e.touches[0].clientY-dragStartY.current;
      const ratio=delta/(el.clientHeight-thumbHeight);
      el.scrollTop=dragStartScroll.current+ratio*(el.scrollHeight-el.clientHeight);
      updateThumb();
    };
    const stopDrag=()=>{isDragging.current=false;};
    document.addEventListener("mousemove",onMouseMove);
    document.addEventListener("mouseup",stopDrag);
    document.addEventListener("touchmove",onTouchMove,{passive:true});
    document.addEventListener("touchend",stopDrag);
    return()=>{
      document.removeEventListener("mousemove",onMouseMove);
      document.removeEventListener("mouseup",stopDrag);
      document.removeEventListener("touchmove",onTouchMove);
      document.removeEventListener("touchend",stopDrag);
    };
  },[thumbHeight]);

  const handleTrackClick=(e)=>{
    const el=containerRef.current;
    if(!el)return;
    const trackRect=e.currentTarget.getBoundingClientRect();
    const clickRatio=(e.clientY-trackRect.top)/trackRect.height;
    el.scrollTop=clickRatio*el.scrollHeight;
  };

  const showScrollbar=containerRef.current&&containerRef.current.scrollHeight>containerRef.current.clientHeight;

  return(
    <div style={{position:"relative",...style}}>
      {/* Scrollable content — native scrollbar hidden */}
      <div ref={containerRef} onScroll={updateThumb}
        style={{height:height||"100%",overflowY:"scroll",overflowX:"hidden",scrollbarWidth:"none",paddingRight:showScrollbar?14:0}}
        className="hide-scrollbar">
        {children}
      </div>
      {/* Custom scrollbar track */}
      {showScrollbar&&(
        <div onClick={handleTrackClick}
          style={{position:"absolute",right:0,top:0,bottom:0,width:12,background:D.bg2,borderRadius:6,cursor:"pointer",opacity:visible?1:0.3,transition:"opacity 0.3s"}}>
          {/* Thumb */}
          <div
            onMouseDown={e=>{e.preventDefault();startDrag(e.clientY);}}
            onTouchStart={e=>{startDrag(e.touches[0].clientY);}}
            style={{
              position:"absolute",right:1,left:1,
              height:thumbHeight,top:thumbTop,
              background:D.ac,borderRadius:5,
              cursor:"grab",transition:"opacity 0.2s",
              boxShadow:"0 2px 6px rgba(0,0,0,0.3)",
              minHeight:40,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── SAVE FLASH BUTTON ──────────────────────────────── */
function SaveFlashButton({onClick,label}){
  const [state,setState]=useState("idle"); // idle | saving | saved
  const handleClick=async()=>{
    if(state!=="idle")return;
    setState("saving");
    try{await onClick();}catch{}
    setState("saved");
    setTimeout(()=>setState("idle"),1200);
  };
  const bg=state==="saved"?"rgba(63,185,80,0.15)":D.redBg;
  const col=state==="saved"?D.green:D.red;
  const border=state==="saved"?"1px solid rgba(63,185,80,0.3)":"1px solid rgba(248,81,73,0.3)";
  const lbl=state==="saving"?"Saving...":state==="saved"?"✓ Saved!":label;
  return(
    <button onClick={handleClick} disabled={state!=="idle"}
      style={{width:"100%",padding:13,borderRadius:12,background:bg,color:col,fontWeight:700,fontSize:15,border,cursor:state==="idle"?"pointer":"not-allowed",transition:"all 0.2s"}}>
      {lbl}
    </button>
  );
}

/* ─── ACCOUNT EDITOR ────────────────────────────────── */
function AccountEditor({user,companyProfile,setCompanyProfile}){
  const [editing,setEditing]=useState(false);
  const [name,setName]=useState(user?.user_metadata?.name||"");
  const [companyName,setCompanyName]=useState(companyProfile?.company_name||"");
  const [logoPreview,setLogoPreview]=useState(null);
  const [logoFile,setLogoFile]=useState(null);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  const isGoogle=user?.app_metadata?.provider==="google";

  // Sync when companyProfile loads
  useEffect(()=>{
    if(companyProfile){setCompanyName(companyProfile.company_name||"");}
  },[companyProfile]);

  const handleSave=async()=>{
    setSaving(true);setMsg("");
    try{
      // Update display name in Supabase Auth metadata
      await sb.auth.updateUser({data:{name:name.trim(),company:companyName.trim()}});
      // Update company_profile
      let logoUrl=companyProfile?.logo_url||null;
      if(logoFile){
        const ext=(logoFile.name||"png").split(".").pop();
        const path=`company-logos/${user.id}/${Date.now()}.${ext}`;
        const{error:upErr}=await sb.storage.from("photos").upload(path,logoFile,{upsert:true});
        if(!upErr)logoUrl=`${SUPA_URL}/storage/v1/object/public/photos/${path}`;
      }
      const{data,error}=await sb.from("company_profile").upsert({
        user_id:user.id,
        company_name:companyName.trim()||null,
        address:companyProfile?.address||null,
        phone:companyProfile?.phone||null,
        website:companyProfile?.website||null,
        logo_url:logoUrl,
        updated_at:new Date().toISOString(),
      },{onConflict:"user_id"}).select().single();
      if(error)throw error;
      setCompanyProfile(data);
      setMsg("Saved!");setEditing(false);setLogoFile(null);setLogoPreview(null);
    }catch(e){setMsg("Error: "+e.message);}
    setSaving(false);
  };

  const currentLogo=logoPreview||companyProfile?.logo_url;

  if(!editing) return(
    <div style={{background:D.bg1,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${D.b1}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Account</div>
        <button onClick={()=>{setEditing(true);setMsg("");}} style={{background:"none",border:"none",cursor:"pointer",color:D.ac,fontSize:12,fontWeight:600}}>Edit</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        {currentLogo?(
          <div style={{width:52,height:52,borderRadius:12,overflow:"hidden",background:"#fff",border:`1px solid ${D.b2}`,flexShrink:0}}>
            <img src={currentLogo} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:4}}/>
          </div>
        ):(
          <div style={{width:52,height:52,borderRadius:12,background:D.acLL,border:`1px solid ${D.b3}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><User size={22} color={D.ac}/></div>
        )}
        <div>
          <div style={{fontSize:15,fontWeight:700,color:D.t1}}>{user?.user_metadata?.name||"User"}</div>
          <div style={{fontSize:13,color:D.t2,marginTop:1,fontWeight:600}}>{companyProfile?.company_name||user?.user_metadata?.company||"No company set"}</div>
          <div style={{fontSize:12,color:D.t3,marginTop:2}}>{user?.email}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0 0",marginTop:12,borderTop:`1px solid ${D.b1}`}}>
        <div>
          <div style={{fontSize:14,color:D.t1,fontWeight:500}}>📱 Text Notifications</div>
          <div style={{fontSize:12,color:D.t3,marginTop:2}}>Receive texts when items are added or accepted</div>
        </div>
        <div onClick={async()=>{
          const newVal=!companyProfile?.sms_notifications;
          setCompanyProfile(p=>({...p,sms_notifications:newVal}));
          await sb.from("company_profile").update({sms_notifications:newVal}).eq("user_id",user.id);
        }} style={{width:44,height:24,borderRadius:12,cursor:"pointer",background:companyProfile?.sms_notifications?D.green:D.bg3,position:"relative",transition:"background 0.2s",flexShrink:0}}>
          <div style={{position:"absolute",top:2,left:companyProfile?.sms_notifications?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{background:D.bg1,borderRadius:16,padding:20,marginBottom:16,border:`1px solid ${D.b1}`}}>
      <div style={{fontSize:11,fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:16}}>Edit Profile</div>

      {/* Logo */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{width:60,height:60,borderRadius:12,overflow:"hidden",background:currentLogo?"#fff":D.bg2,border:`1px solid ${D.b2}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {currentLogo?<img src={currentLogo} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:4}}/>:<span style={{fontSize:24}}>🏗️</span>}
        </div>
        <label style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:10,background:D.acLL,border:`1px solid ${D.b3}`,cursor:"pointer",fontSize:12,fontWeight:600,color:D.t1}}>
          📁 Change Logo
          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
            const file=e.target.files[0];if(!file)return;
            setLogoFile(file);
            const reader=new FileReader();reader.onload=ev=>setLogoPreview(ev.target.result);reader.readAsDataURL(file);
          }}/>
        </label>
      </div>

      {/* Name */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Full Name</div>
        <input value={name} onChange={e=>setName(e.target.value)} style={{...dInp(),width:"100%"}}/>
      </div>

      {/* Company */}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Company Name</div>
        <input value={companyName} onChange={e=>setCompanyName(e.target.value)} style={{...dInp(),width:"100%"}}/>
      </div>

      {/* Email — read only */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Email {isGoogle?"(managed by Google)":"(contact support to change)"}</div>
        <div style={{...dInp(),color:D.t3,background:D.bg3,cursor:"not-allowed"}}>{user?.email}</div>
      </div>

      {msg&&<div style={{fontSize:12,color:msg.startsWith("Error")?D.red:D.green,marginBottom:10,textAlign:"center",fontWeight:600}}>{msg}</div>}

      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{setEditing(false);setLogoPreview(null);setLogoFile(null);setMsg("");}}
          style={{flex:1,padding:11,borderRadius:10,background:D.bg2,border:`1px solid ${D.b2}`,color:D.t2,fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
        <button onClick={handleSave} disabled={saving}
          style={{flex:2,padding:11,borderRadius:10,background:saving?D.bg3:D.ac,color:saving?D.t3:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:saving?"not-allowed":"pointer"}}>
          {saving?"Saving...":"Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ─── SUBSCRIPTION HELPERS ──────────────────────────── */
// Owner accounts — always active, never paywalled
const OWNER_IDS = [
  "ded9a049-2dbc-4521-bf7a-a88c33bec79c",  // brent@acsbuilds.com
  "c21d2094-3a05-43a2-9e1e-4d1c8daada95",  // gmail
  "61993691-4345-433d-8435-f6d8cc397010",  // btheyson@kaosdesignwerks.com
];

const getSubStatus = (profile) => {
  if (!profile) return "loading";
  // Owner bypass — always active
  if (OWNER_IDS.includes(profile.user_id)) return "active";
  const status = profile.subscription_status;
  // Existing users with no status set — grant access
  if (!status) return "active";
  if (status === "active") return "active";
  if (status === "trial") {
    const trialEnd = new Date(profile.trial_ends_at);
    if (trialEnd > new Date()) return "trial";
    return "expired";
  }
  if (status === "canceled" || status === "past_due") return "expired";
  return "expired";
};

const getDaysLeft = (profile) => {
  if (!profile?.trial_ends_at) return 0;
  const diff = new Date(profile.trial_ends_at) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/* ─── PAYWALL SCREEN ─────────────────────────────────── */
function SubscriptionPaywall({user, companyProfile, onSubscribe, onLogout}){
  const [loading, setLoading] = useState(false);
  const daysLeft = getDaysLeft(companyProfile);
  const isExpired = getSubStatus(companyProfile) === "expired";

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPA_URL}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({userId: user.id, email: user.email}),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Error creating checkout: " + (data.error||"Unknown error"));
    } catch(e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:"#0A0A0A",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:64,height:64,borderRadius:16,overflow:"hidden",marginBottom:20,boxShadow:"0 4px 20px rgba(180,120,60,0.4)"}}>
        <img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
      </div>
      <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:100,fontSize:24,color:"#fff",letterSpacing:"0.3em",marginBottom:4}}>KAOS</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:40}}>Punch List Pro</div>

      <div style={{background:"#141414",borderRadius:20,border:"1px solid rgba(255,255,255,0.07)",padding:32,maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 24px 60px rgba(0,0,0,0.7)"}}>
        {isExpired ? (
          <>
            <div style={{fontSize:40,marginBottom:12}}>⏰</div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:8}}>Trial Expired</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",lineHeight:1.7,marginBottom:28}}>Your 3-day free trial has ended. Subscribe to keep building punch lists and sharing them with your clients.</div>
          </>
        ) : (
          <>
            <div style={{fontSize:40,marginBottom:12}}>🚀</div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:8}}>{daysLeft} Day{daysLeft!==1?"s":""} Left in Your Trial</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.5)",lineHeight:1.7,marginBottom:28}}>Subscribe now to keep full access when your trial ends.</div>
          </>
        )}

        <div style={{background:"rgba(69,90,100,0.15)",borderRadius:12,padding:20,marginBottom:24,border:"1px solid rgba(69,90,100,0.3)"}}>
          <div style={{fontSize:36,fontWeight:800,color:"#fff",marginBottom:4}}>$10<span style={{fontSize:16,fontWeight:400,color:"rgba(255,255,255,0.5)"}}>/year</span></div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>Unlimited projects · Unlimited photos · Client sharing</div>
        </div>

        <button onClick={handleSubscribe} disabled={loading}
          style={{width:"100%",padding:"14px",borderRadius:12,background:loading?"#21262D":"#455A64",color:"#fff",fontWeight:700,fontSize:16,border:"none",cursor:loading?"not-allowed":"pointer",marginBottom:12}}>
          {loading ? "Redirecting to checkout..." : "Subscribe for $10/year →"}
        </button>
        <button onClick={onLogout} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.25)"}}>Log out</button>
      </div>
    </div>
  );
}

/* ─── TRIAL BANNER ───────────────────────────────────── */
function TrialBanner({companyProfile, onSubscribe}){
  const daysLeft = getDaysLeft(companyProfile);
  const [dismissed, setDismissed] = useState(false);
  if(dismissed || getSubStatus(companyProfile) !== "trial") return null;
  return(
    <div style={{background:"rgba(69,90,100,0.15)",borderBottom:`1px solid rgba(69,90,100,0.3)`,padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <div style={{fontSize:13,color:D.t2,fontWeight:500}}>
        ⏱ <strong>{daysLeft} Day{daysLeft!==1?"s":""}</strong> Left In Your Free Trial
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={onSubscribe} style={{padding:"5px 14px",borderRadius:6,background:"#455A64",color:"#fff",fontWeight:600,fontSize:12,border:"none",cursor:"pointer"}}>Subscribe — $10.00 / Year →</button>
        <button onClick={()=>setDismissed(true)} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,fontSize:18,lineHeight:1}}>×</button>
      </div>
    </div>
  );
}

/* ─── MULTI SAVE BUTTON ──────────────────────────────── */
// Light red default → green flash while saving → back to light red
function MultiSaveButton({onSave,disabled}){
  const [state,setState]=useState("idle"); // idle | saving | saved

  const handleClick=async()=>{
    if(state!=="idle"||disabled)return;
    setState("saving");
    try{await onSave();}catch{}
    setState("saved");
    setTimeout(()=>setState("idle"),900);
  };

  const handleKey=(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();handleClick();}};

  const bg=state==="saved"?D.greenBg:disabled?D.bg3:D.redBg;
  const col=state==="saved"?D.green:disabled?D.t3:D.red;
  const border=state==="saved"?"1px solid rgba(63,185,80,0.35)":disabled?`1px solid ${D.b1}`:"1px solid rgba(248,81,73,0.35)";
  const lbl=state==="saving"?"Saving...":state==="saved"?"✓ Saved!":"Save & Next →";

  return(
    <button
      onClick={handleClick}
      onKeyDown={handleKey}
      tabIndex={0}
      disabled={disabled||state!=="idle"}
      style={{width:"100%",padding:13,borderRadius:12,background:bg,color:col,fontWeight:800,fontSize:15,border,cursor:disabled||state!=="idle"?"not-allowed":"pointer",transition:"all 0.2s",outline:"none"}}
      onFocus={e=>{e.currentTarget.style.outline=`2px solid rgba(248,81,73,0.6)`;}}
      onBlur={e=>{e.currentTarget.style.outline="none";}}
    >
      {lbl}
    </button>
  );
}

/* ─── ADD TO PUNCH BUTTON ────────────────────────────── */
function AddToPunchButton({onSave,disabled,listType}){
  const [state,setState]=useState("idle");

  const handleClick=async()=>{
    if(state!=="idle"||disabled)return;
    setState("saving");
    try{await onSave();}catch{}
    setState("saved");
    setTimeout(()=>setState("idle"),900);
  };

  const handleKey=(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();handleClick();}};

  const bg=state==="saved"?D.greenBg:disabled?D.bg3:D.redBg;
  const col=state==="saved"?D.green:disabled?D.t3:D.red;
  const border=state==="saved"?"1px solid rgba(63,185,80,0.35)":disabled?`1px solid ${D.b1}`:"1px solid rgba(248,81,73,0.35)";
  const baseLabel=listType==="completion"?"Add to Completion List":"Add to Punch List";
  const lbl=state==="saving"?"Saving...":state==="saved"?"✓ Added!":baseLabel;

  return(
    <button
      onClick={handleClick}
      onKeyDown={handleKey}
      tabIndex={0}
      disabled={disabled||state!=="idle"}
      style={{width:"100%",padding:13,borderRadius:10,background:bg,color:col,fontWeight:700,fontSize:14,border,cursor:disabled||state!=="idle"?"not-allowed":"pointer",transition:"all 0.2s",outline:"none"}}
      onFocus={e=>{e.currentTarget.style.outline=`2px solid rgba(248,81,73,0.6)`;}}
      onBlur={e=>{e.currentTarget.style.outline="none";}}
    >
      {lbl}
    </button>
  );
}

function PhotoGrid({photos,onAdd,onRemove,onSetPrimary}){
  const camRef=useRef();
  const libRef=useRef();
  const [choice,setChoice]=useState(null);
  const [lightbox,setLightbox]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const [compressing,setCompressing]=useState(false);
  const [pasteSlot,setPasteSlot]=useState(null); // idx being pasted into

  const SLOTS=5;
  const filled=photos.filter(Boolean).length;

  const processFiles=async(files)=>{
    const toAdd=Array.from(files).filter(f=>f.type.startsWith("image/")).slice(0,SLOTS-filled);
    if(toAdd.length===0)return;
    const emptySlots=[0,1,2,3,4].filter(i=>!photos[i]);
    const assignments=toAdd.map((file,i)=>({file,idx:emptySlots[i]})).filter(a=>a.idx!==undefined);
    setCompressing(true);
    try{
      await Promise.all(assignments.map(async({file,idx})=>{
        try{
          const{dataUrl,blob}=await compressImage(file,1280,0.8);
          onAdd({url:dataUrl,file:new File([blob],file.name||"photo.jpg",{type:"image/jpeg"})},idx);
        }catch{
          const reader=new FileReader();
          reader.onload=ev=>onAdd({url:ev.target.result,file},idx);
          reader.readAsDataURL(file);
        }
      }));
    }finally{setCompressing(false);}
  };

  const handleFile=(e)=>{processFiles(e.target.files);e.target.value="";};
  const handleDrop=(e)=>{e.preventDefault();setDragOver(false);if(filled>=SLOTS)return;processFiles(e.dataTransfer.files);};

  const handlePaste=async(e)=>{
    if(filled>=SLOTS)return;
    const items=e?.clipboardData?.items||[];
    const imageItem=Array.from(items).find(i=>i.type.startsWith("image/"));
    if(!imageItem)return;
    e?.preventDefault?.();
    const file=imageItem.getAsFile();
    if(!file)return;
    const nextIdx=[0,1,2,3,4].find(i=>!photos[i]);
    if(nextIdx===undefined)return;
    setPasteSlot(nextIdx);
    try{
      const{dataUrl,blob}=await compressImage(file,1280,0.8);
      onAdd({url:dataUrl,file:new File([blob],"paste.jpg",{type:"image/jpeg"})},nextIdx);
    }catch{
      const reader=new FileReader();
      reader.onload=ev=>onAdd({url:ev.target.result,file},nextIdx);
      reader.readAsDataURL(file);
    }
    setTimeout(()=>setPasteSlot(null),800);
  };

  const handlePasteBtn=async()=>{
    if(filled>=SLOTS)return;
    try{
      const items=await navigator.clipboard.read();
      for(const item of items){
        const imgType=item.types.find(t=>t.startsWith("image/"));
        if(imgType){
          const blob=await item.getType(imgType);
          const file=new File([blob],"paste.jpg",{type:imgType});
          const nextIdx=[0,1,2,3,4].find(i=>!photos[i]);
          if(nextIdx===undefined)return;
          setPasteSlot(nextIdx);
          try{
            const{dataUrl,blob:cBlob}=await compressImage(file,1280,0.8);
            onAdd({url:dataUrl,file:new File([cBlob],"paste.jpg",{type:"image/jpeg"})},nextIdx);
          }catch{
            const reader=new FileReader();
            reader.onload=ev=>onAdd({url:ev.target.result,file},nextIdx);
            reader.readAsDataURL(file);
          }
          setTimeout(()=>setPasteSlot(null),800);
          return;
        }
      }
    }catch{
      // Fallback: tell user to use Ctrl+V
      alert("Paste not available — press Ctrl+V (or Cmd+V on Mac) with an image in your clipboard.");
    }
  };

  // Listen for Ctrl+V on the whole form area
  useEffect(()=>{
    const handler=(e)=>{
      if(document.activeElement?.tagName==="INPUT"&&document.activeElement?.type!=="file")return;
      if(document.activeElement?.tagName==="TEXTAREA")return;
      handlePaste(e);
    };
    document.addEventListener("paste",handler);
    return()=>document.removeEventListener("paste",handler);
  },[photos,filled]);

  return(<>
    <Lightbox photos={lightbox?.photos} startIndex={lightbox?.startIndex||0} src={typeof lightbox==="string"?lightbox:null} onClose={()=>setLightbox(null)}/>
    {choice!==null&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:20}} onClick={()=>setChoice(null)}>
        <div style={{background:D.bg1,borderRadius:16,padding:20,width:"100%",maxWidth:400,border:`1px solid ${D.b2}`}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:16,textAlign:"center",color:D.t1}}>Add Photos</div>
          <div style={{display:"flex",gap:12}}>
            <button onClick={()=>{camRef.current.click();setChoice(null);}} style={{flex:1,padding:"16px 12px",borderRadius:12,border:`1px solid ${D.b3}`,background:D.acLL,color:D.t1,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}><Camera size={24} color={D.acL}/><span>Camera</span></button>
            <button onClick={()=>{libRef.current.click();setChoice(null);}} style={{flex:1,padding:"16px 12px",borderRadius:12,border:`1px solid ${D.b2}`,background:D.bg2,color:D.t2,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}><ImageIcon size={24}/><span>Library</span></button>
          </div>
          {filled<SLOTS&&<div style={{fontSize:11,color:D.t3,textAlign:"center",marginTop:8}}>Select up to {SLOTS-filled} more photo{SLOTS-filled!==1?"s":""}</div>}
          <button onClick={()=>setChoice(null)} style={{width:"100%",marginTop:10,padding:10,borderRadius:10,border:`1px solid ${D.b2}`,background:"none",color:D.t3,fontWeight:600,cursor:"pointer"}}>Cancel</button>
        </div>
      </div>
    )}
    <div
      onDragOver={e=>{e.preventDefault();if(filled<SLOTS)setDragOver(true);}}
      onDragEnter={e=>{e.preventDefault();if(filled<SLOTS)setDragOver(true);}}
      onDragLeave={e=>{e.preventDefault();setDragOver(false);}}
      onDrop={handleDrop}
      style={{position:"relative",padding:dragOver?6:0,borderRadius:14,border:dragOver?`2px dashed ${D.ac}`:"2px dashed transparent",background:dragOver?D.acLL:"transparent",transition:"all 0.15s"}}
    >
      {compressing&&(
        <div style={{position:"absolute",inset:0,background:D.bg0+"CC",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8,zIndex:5}}>
          <Spinner size={16} color={D.ac}/><span style={{fontSize:12,color:D.t2,fontWeight:600}}>Processing...</span>
        </div>
      )}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[0,1,2,3,4].map(idx=>{
          const photo=photos[idx];
          const isPrimary=photo?.isPrimary;
          return(
            <div key={idx} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              {/* Photo box — overflow hidden only here */}
              <div style={{position:"relative",width:72,height:72,borderRadius:10,overflow:"hidden",border:isPrimary?`2px solid ${D.green}`:`2px solid ${photo?D.b2:"transparent"}`}}>
                {photo?(<>
                  <img src={photo.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",cursor:"pointer"}}
                    onClick={()=>setLightbox({photos:photos.filter(Boolean),startIndex:photos.filter(Boolean).indexOf(photo)})}/>
                  {/* Remove button */}
                  <button onClick={e=>{e.stopPropagation();onRemove(idx);}} style={{position:"absolute",top:3,right:3,width:20,height:20,background:"rgba(0,0,0,0.75)",border:"none",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={11} color="#fff"/></button>
                </>):(
                  <div onClick={()=>filled<SLOTS&&setChoice(0)} style={{width:"100%",height:"100%",background:pasteSlot===idx?D.acLL:D.bg2,border:`2px dashed ${pasteSlot===idx?D.ac:D.b2}`,borderRadius:8,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:filled<SLOTS?"pointer":"default",gap:3,transition:"all 0.2s"}}>
                    {pasteSlot===idx
                      ?<><Clipboard size={16} color={D.ac}/><span style={{fontSize:8,color:D.ac,fontWeight:700}}>Pasting...</span></>
                      :<><Camera size={16} color={D.t3}/><span style={{fontSize:8,color:D.t3,fontWeight:600}}>ADD</span></>
                    }
                  </div>
                )}
              </div>
              {/* Primary button — BELOW the photo, easy to tap */}
              {photo&&onSetPrimary&&(
                <button onClick={()=>onSetPrimary(idx)}
                  style={{padding:"3px 0",width:72,borderRadius:6,border:"none",cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:"0.04em",
                    background:isPrimary?"rgba(63,185,80,0.15)":"rgba(255,255,255,0.05)",
                    color:isPrimary?D.green:D.t3,
                    outline:isPrimary?`1px solid rgba(63,185,80,0.4)`:"none"}}>
                  {isPrimary?"★ PRIMARY":"☆ Set Primary"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {/* Paste button row */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,flexWrap:"wrap"}}>
        {filled<SLOTS&&(
          <button onClick={handlePasteBtn}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:"none",border:`1px solid ${D.b2}`,cursor:"pointer",fontSize:12,fontWeight:600,color:D.t2}}>
            <Clipboard size={13}/> Paste photo
          </button>
        )}
        <span style={{fontSize:10,color:D.t3}}>
          {filled<SLOTS?`Ctrl+V anywhere · ${SLOTS-filled} slot${SLOTS-filled!==1?"s":""} remaining`:"All slots filled"}
        </span>
      </div>
    </div>
    <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/>
    <input ref={libRef} type="file" accept="image/*" multiple onChange={handleFile} style={{display:"none"}}/>
  </>);
}


/* ─── CONFIRM ────────────────────────────────────────── */
function Confirm({item,onConfirm,onCancel}){
  if(!item)return null;
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20}}>
    <div style={{background:D.bg1,borderRadius:16,padding:24,maxWidth:320,width:"100%",border:`1px solid ${D.b2}`,boxShadow:D.sh3}}>
      <div style={{fontSize:16,fontWeight:700,marginBottom:8,color:D.t1}}>Delete {item.type==="item"?"Punch Item":"Project"}?</div>
      <div style={{fontSize:14,color:D.t3,marginBottom:20,lineHeight:1.6}}>"{item.label}" will be permanently removed.</div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onCancel} style={{flex:1,padding:12,borderRadius:10,background:D.bg2,border:`1px solid ${D.b2}`,color:D.t2,fontWeight:600,fontSize:14,cursor:"pointer"}}>Cancel</button>
        <button onClick={onConfirm} style={{flex:1,padding:12,borderRadius:10,background:D.redBg,border:"1px solid rgba(248,81,73,0.3)",color:D.red,fontWeight:600,fontSize:14,cursor:"pointer"}}>Delete</button>
      </div>
    </div>
  </div>);
}

/* ─── AREA ROW ───────────────────────────────────────── */
function AreaRow({area,editingAreaId,editingAreaName,onToggle,onStartEdit,onSaveEdit,onEditNameChange,onRemove}){
  const isEditing=editingAreaId===area.id;
  return(<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:area.enabled?D.bg1:D.bg3,borderRadius:10,border:`1px solid ${area.enabled?D.b2:D.b1}`,transition:"all 0.15s"}}>
    <div onClick={()=>onToggle(area.id)} style={{width:22,height:22,borderRadius:6,border:`1.5px solid ${area.enabled?D.ac:D.b3}`,background:area.enabled?D.ac:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",transition:"all 0.15s"}}>{area.enabled&&<Check size={13} color="#fff" strokeWidth={3}/>}</div>
    {isEditing?<input value={editingAreaName} onChange={e=>onEditNameChange(e.target.value)} onBlur={onSaveEdit} onKeyDown={e=>{if(e.key==="Enter")onSaveEdit();if(e.key==="Escape"){onEditNameChange(area.name);onSaveEdit();}}} style={{...dInp(),flex:1,padding:"6px 10px",fontSize:13}} autoFocus/>:<span style={{flex:1,fontSize:13,fontWeight:500,color:area.enabled?D.t1:D.t3}}>{area.name}</span>}
    {!isEditing&&<button onClick={()=>onStartEdit(area)} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,padding:4,display:"flex",flexShrink:0}}><Pencil size={13}/></button>}
    <button onClick={()=>onRemove(area.id)} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,padding:4,display:"flex",flexShrink:0}}><X size={13}/></button>
  </div>);
}

/* ─── AUTH COMPONENTS (top-level to prevent remount) ─── */
function AuthLabel({children}){return<div style={{fontSize:11,fontWeight:600,color:D.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{children}</div>;}
function AuthBtn({children,onClick,disabled,loading}){return<button onClick={onClick} disabled={disabled||loading} style={{width:"100%",padding:15,borderRadius:12,border:"none",background:disabled||loading?D.bg3:D.ac,color:disabled||loading?D.t3:D.t1,fontSize:15,fontWeight:700,cursor:disabled||loading?"not-allowed":"pointer",letterSpacing:"0.04em",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{loading&&<Spinner size={18} color={D.t1}/>}{loading?"Please wait...":children}</button>;}
function RememberBox({remember,onToggle}){return(<label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}><div onClick={onToggle} style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${remember?D.ac:D.b3}`,background:remember?D.ac:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>{remember&&<CheckCircle2 size={13} color="#fff"/>}</div><span style={{fontSize:13,color:D.t3}}>Keep me logged in</span></label>);}
function UPwField({refProp,placeholder,show,onToggle,onEnter,autoComplete,name}){
  // Internal controlled state prevents mobile browsers from clearing value on type toggle
  const [val,setVal]=useState("");
  // Keep parent ref in sync so it can read value on submit
  useEffect(()=>{if(refProp)refProp.current={value:val};},[val,refProp]);
  return(<div style={{position:"relative"}}>
    <input value={val} onChange={e=>setVal(e.target.value)} name={name||"password"} placeholder={placeholder||"••••••••"} type={show?"text":"password"} style={{...dInp(),paddingRight:48}} autoComplete={autoComplete||"current-password"} autoCorrect="off" autoCapitalize="none" spellCheck="false" onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter()}/>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={onToggle} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",display:"flex",padding:4}}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>
  </div>);
}

/* ═══════════════════════════════════════════════════════
   THEME CONTEXT
═══════════════════════════════════════════════════════ */
const ThemeContext = React.createContext({dark:true,toggle:()=>{}});

function ThemeToggle(){
  const {dark,toggle} = React.useContext(ThemeContext);
  return(
    <div className="no-print" style={{position:"fixed",bottom:20,left:16,zIndex:100,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:11,fontWeight:600,color:dark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.4)",letterSpacing:"0.05em",userSelect:"none",whiteSpace:"nowrap"}}>
        {dark?"Dark":"Light"}
      </span>
      <button onClick={toggle}
        title={dark?"Switch to Light Mode":"Switch to Dark Mode"}
        style={{
          width:48, height:26, borderRadius:100,
          background:dark?"#455A64":"#CBD5E1",
          border:"none", cursor:"pointer", display:"flex", alignItems:"center",
          padding:3, transition:"background 0.25s",
          boxShadow:"0 2px 8px rgba(0,0,0,0.2)", flexShrink:0,
        }}>
        <div style={{
          width:20, height:20, borderRadius:"50%",
          background:"#FFFFFF",
          transform:dark?"translateX(22px)":"translateX(0px)",
          transition:"transform 0.25s",
          boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
          flexShrink:0,
        }}/>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CLIENT SHARE VIEW — public, no login required
═══════════════════════════════════════════════════════ */
/* ═══ LEGAL PAGE WRAPPER ══════════════════════════════ */
function LegalPage({title,children}){
  return(
    <div style={{minHeight:"100vh",background:"#F0F2F5",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 20px",display:"flex",alignItems:"center",height:60}}>
        <div style={{display:"flex",alignItems:"center",gap:9,flex:1}}>
          <div style={{width:34,height:34,borderRadius:10,overflow:"hidden",boxShadow:"0 2px 6px rgba(180,120,60,0.3)"}}><img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
          <div>
            <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:16,color:"#111827",letterSpacing:"0.2em",lineHeight:1}}>KAOS</div>
            <div style={{fontSize:8,color:"#9CA3AF",letterSpacing:"0.12em",textTransform:"uppercase"}}>Punch List Pro</div>
          </div>
        </div>
        <button onClick={()=>window.history.back()} style={{padding:"7px 14px",borderRadius:8,background:"#F4F6F8",border:"1px solid #E5E7EB",color:"#374151",fontWeight:600,fontSize:13,cursor:"pointer"}}>← Back</button>
      </div>
      <div style={{maxWidth:720,margin:"0 auto",padding:"32px 20px 80px"}}>
        <h1 style={{fontSize:28,fontWeight:800,color:"#111827",marginBottom:8}}>{title}</h1>
        <p style={{fontSize:13,color:"#9CA3AF",marginBottom:32}}>Kaos Design Werks, LLC — Last updated: {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</p>
        {children}
      </div>
    </div>
  );
}
const lsec=(title,children)=>(<div style={{marginBottom:32}}><h2 style={{fontSize:18,fontWeight:700,color:"#111827",marginBottom:10,paddingBottom:8,borderBottom:"1px solid #E5E7EB"}}>{title}</h2><div style={{fontSize:14,color:"#374151",lineHeight:1.8}}>{children}</div></div>);
const lp=(t)=><p style={{marginBottom:12}}>{t}</p>;
const lb=(items)=><ul style={{paddingLeft:20,marginBottom:12}}>{items.map((item,i)=><li key={i} style={{marginBottom:6}}>{item}</li>)}</ul>;

function PrivacyPolicy(){
  return(<LegalPage title="Privacy Policy">
    {lsec("1. Introduction",<>{lp("Kaos Design Werks, LLC ('Company','we','us') operates KAOS Punch List Pro. This Privacy Policy explains how we collect, use, and protect your information.")}{lp("By using KAOS Punch List Pro, you agree to the collection and use of information in accordance with this policy.")}</>)}
    {lsec("2. Information We Collect",<>{lp("We collect:")} {lb(["Account information: name, company name, email address, and password","Project data: project names, client names, addresses, and punch list items","Photos: images uploaded as documentation","Usage data: device type, browser type","Payment information: processed securely through Stripe"])}</>)}
    {lsec("3. How We Use Your Information",<>{lp("We use your information to provide and improve the app, process payments, sync data across devices, generate client reports, and send service communications.")}</>)}
    {lsec("4. Data Storage & Security",<>{lp("Data is stored using Supabase, encrypted in transit via HTTPS/TLS. Payment processing is handled by Stripe, Inc. (PCI-DSS compliant). We do not store credit card details.")}</>)}
    {lsec("5. Data Sharing",<>{lp("We do not sell your data. We share only with: service providers (Supabase, Stripe) under confidentiality agreements; via client share links you control; or as required by law.")}</>)}
    {lsec("6. Your Rights",<>{lp("You may access, correct, or request deletion of your data. Contact us at info@kaosdesignwerks.com.")}</>)}
    {lsec("7. Contact",<>{lp("Kaos Design Werks, LLC — info@kaosdesignwerks.com")}</>)}
  </LegalPage>);
}

function TermsOfService(){
  return(<LegalPage title="Terms of Service">
    {lsec("1. Acceptance",<>{lp("By using KAOS Punch List Pro you agree to these Terms. If you do not agree, do not use the application.")}</>)}
    {lsec("2. Description",<>{lp("KAOS Punch List Pro is a professional punch list management application for construction and real estate professionals.")}</>)}
    {lsec("3. Account Registration",<>{lp("You must provide accurate information, maintain account security, and be at least 18 years old. We may terminate accounts that violate these terms.")}</>)}
    {lsec("4. Subscription and Payment",<>{lp("Subscription fees are billed in advance and are non-refundable except as required by law. Payments processed by Stripe, Inc.")}</>)}
    {lsec("5. Acceptable Use",<>{lp("You agree not to use the service for unlawful purposes, upload harmful content, attempt unauthorized access, or reverse engineer the application.")}</>)}
    {lsec("6. Client Share Links",<>{lp("When you generate a share link, project data becomes viewable to anyone with that link. You are responsible for managing access and revoking links when no longer needed.")}</>)}
    {lsec("7. Limitation of Liability",<>{lp("TO THE MAXIMUM EXTENT PERMITTED BY LAW, KAOS DESIGN WERKS, LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.")}</>)}
    {lsec("8. Governing Law",<>{lp("These Terms are governed by the laws of the State of Texas.")}</>)}
    {lsec("9. Contact",<>{lp("Kaos Design Werks, LLC — info@kaosdesignwerks.com")}</>)}
  </LegalPage>);
}

/* ═══ COMPANY SETUP ════════════════════════════════════ */
function CompanySetup({user,onComplete}){
  const [form,setForm]=useState({companyName:user?.user_metadata?.company||"",address:"",phone:"",website:""});
  const [logoUrl,setLogoUrl]=useState(null);
  const [logoFile,setLogoFile]=useState(null);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  const handleLogoChange=(e)=>{
    const file=e.target.files[0];if(!file)return;
    setLogoFile(file);
    const reader=new FileReader();
    reader.onload=ev=>setLogoUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave=async()=>{
    if(!form.companyName.trim())return setError("Company name is required.");
    setSaving(true);setError("");
    try{
      let finalLogoUrl=null;
      if(logoFile){
        const ext=(logoFile.name||"png").split(".").pop();
        const path=`company-logos/${user.id}/${Date.now()}.${ext}`;
        const{error:upErr}=await sb.storage.from("photos").upload(path,logoFile,{upsert:true});
        if(!upErr)finalLogoUrl=`${SUPA_URL}/storage/v1/object/public/photos/${path}`;
      }
      const{error:err}=await sb.from("company_profile").upsert({
        user_id:user.id,company_name:form.companyName.trim(),
        address:form.address.trim()||null,phone:form.phone.trim()||null,
        website:form.website.trim()||null,logo_url:finalLogoUrl,
        updated_at:new Date().toISOString(),
      },{onConflict:"user_id"});
      if(err)throw err;
      onComplete();
    }catch(e){setError(e.message||"Failed to save.");setSaving(false);}
  };

  const handleSkip=async()=>{
    await sb.from("company_profile").upsert({
      user_id:user.id,
      company_name:form.companyName.trim()||user?.user_metadata?.company||"My Company",
      updated_at:new Date().toISOString(),
    },{onConflict:"user_id"});
    onComplete();
  };

  return(
    <div style={{minHeight:"100vh",background:"#0A0A0A",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"40px 0 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{width:64,height:64,borderRadius:16,overflow:"hidden",marginBottom:14,boxShadow:"0 4px 20px rgba(180,120,60,0.4)"}}><img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
        <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:100,fontSize:28,color:"#fff",letterSpacing:"0.3em"}}>KAOS</div>
      </div>
      <div style={{flex:1,width:"100%",maxWidth:480,margin:"0 auto 36px",padding:"0 20px",boxSizing:"border-box"}}>
        <div style={{background:"#141414",borderRadius:20,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.7)"}}>
          <div style={{padding:"24px 24px 8px"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:6}}>Set Up Your Company</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.6}}>Appears on every PDF report and client share link. Change anytime in Settings.</div>
          </div>
          <div style={{padding:"20px 24px 24px",display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.35)",marginBottom:8,letterSpacing:"0.08em",textTransform:"uppercase"}}>Company Logo</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:64,height:64,borderRadius:12,overflow:"hidden",background:logoUrl?"#fff":"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {logoUrl?<img src={logoUrl} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:4}}/>:<span style={{fontSize:24}}>🏗️</span>}
                </div>
                <label style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 16px",borderRadius:10,background:"rgba(69,90,100,0.2)",border:"1px solid rgba(69,90,100,0.4)",cursor:"pointer",fontSize:13,fontWeight:600,color:"#fff"}}>
                  📁 {logoUrl?"Change Logo":"Upload Logo"}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={handleLogoChange}/>
                </label>
              </div>
            </div>
            <div><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.35)",marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Company Name *</div>
              <input value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} placeholder="e.g. Kaos Design Werks, LLC" style={{...dInp(),width:"100%"}}/>
            </div>
            <div><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.35)",marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Address</div>
              <input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="Street, City, State, Zip" style={{...dInp(),width:"100%"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.35)",marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Phone</div>
                <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(555) 555-5555" style={{...dInp(),width:"100%"}}/>
              </div>
              <div><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.35)",marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Website</div>
                <input value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="yourcompany.com" style={{...dInp(),width:"100%"}}/>
              </div>
            </div>
            {error&&<div style={{fontSize:12,color:"#F85149",textAlign:"center"}}>{error}</div>}
            <AuthSubmitBtn loading={saving} onClick={handleSave}>Save & Continue</AuthSubmitBtn>
            <button onClick={handleSkip} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.3)",textAlign:"center",padding:"4px 0"}}>Skip for now</button>
          </div>
        </div>
      </div>
      <button onClick={async()=>{await sb.auth.signOut();window.location.reload();}} style={{position:"fixed",bottom:20,right:16,display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(22,27,34,0.9)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,cursor:"pointer",color:"rgba(240,242,244,0.5)",fontSize:12,fontWeight:600}}>
        Log Out
      </button>
    </div>
  );
}

/* ═══ LANDING PAGE ══════════════════════════════════════ */
function LandingPage({onGetStarted,onLogin}){
  const qs={fontFamily:"'Quicksand',sans-serif",fontWeight:700,letterSpacing:"0.04em"};
  const features=[
    {icon:<Layout size={28} color="#546E7A"/>,title:"SMART TEMPLATES",desc:"8 project types pre-loaded with the right areas. Restaurants, hotels, offices, warehouses and more."},
    {icon:<Camera size={28} color="#546E7A"/>,title:"PHOTO DOCUMENTATION",desc:"Up to 4 photos per item. Drag & drop or tap to add. Compressed automatically for fast uploads."},
    {icon:<Share2 size={28} color="#546E7A"/>,title:"CLIENT SHARE LINKS",desc:"One tap generates a read-only link for your client. They can view and print — change nothing."},
    {icon:<Cloud size={28} color="#546E7A"/>,title:"CLOUD SYNC",desc:"Projects, items, and photos stored securely. Access from any device, any time."},
    {icon:<FileText size={28} color="#546E7A"/>,title:"PDF REPORTS",desc:"Professional reports with photos, status badges, and your company branding."},
    {icon:<Zap size={28} color="#546E7A"/>,title:"FAST IN THE FIELD",desc:"Built for job site conditions. Phone, tablet, and desktop. Dark and light mode."},
  ];
  const steps=[
    {num:"1",title:"CREATE A PROJECT",desc:"Pick a template, customize your areas, ready in under 2 minutes."},
    {num:"2",title:"DOCUMENT ISSUES",desc:"Add punch items with photos, trade, area, priority. One at a time or rapid-fire multi-add."},
    {num:"3",title:"SHARE & TRACK",desc:"Send your client a live link. Mark items pending and accepted as work gets done."},
  ];
  const templates=["🍽️ Full Service Restaurant","🥡 Fast Casual / QSR","🍸 Bar / Nightclub","🏠 Residential","🏨 Hotel","🏢 Office","🏭 Warehouse","📋 Custom"];
  return(
    <div style={{minHeight:"100vh",background:"#0D1117",fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#F0F2F4"}}>
      <nav style={{position:"sticky",top:0,zIndex:50,background:"rgba(13,17,23,0.95)",borderBottom:"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(10px)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(180,120,60,0.4)"}}><img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
            <div>
              <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:18,color:"#F0F2F4",letterSpacing:"0.2em",lineHeight:1}}>KAOS</div>
              <div style={{fontSize:8,color:"rgba(240,242,244,0.4)",letterSpacing:"0.14em",textTransform:"uppercase"}}>Punch List Pro</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onLogin} style={{padding:"8px 18px",borderRadius:8,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(240,242,244,0.7)",fontWeight:600,fontSize:13,cursor:"pointer"}}>Log In</button>
            <button onClick={onGetStarted} style={{padding:"8px 20px",borderRadius:8,background:"#455A64",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Get Started</button>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"80px 24px 72px",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(69,90,100,0.2)",border:"1px solid rgba(69,90,100,0.4)",borderRadius:100,padding:"5px 14px",fontSize:12,fontWeight:600,color:"#90A4AE",marginBottom:24,letterSpacing:"0.08em",textTransform:"uppercase"}}>Built for Construction Professionals</div>
        <h1 style={{...qs,fontSize:"clamp(30px,5vw,52px)",lineHeight:1.15,marginBottom:20,textTransform:"uppercase"}}>The Punch List Tool<br/><span style={{color:"#546E7A"}}>Built For The Field.</span></h1>
        <p style={{fontSize:"clamp(15px,2vw,18px)",color:"rgba(240,242,244,0.55)",maxWidth:560,margin:"0 auto 40px",lineHeight:1.7}}>Create professional punch lists, document deficiencies with photos, and share live reports with your clients — all from your phone.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onGetStarted} style={{padding:"13px 32px",borderRadius:10,background:"#455A64",border:"none",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:"0 4px 20px rgba(69,90,100,0.4)"}}>Get Started →</button>
          <button onClick={onLogin} style={{padding:"13px 28px",borderRadius:10,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(240,242,244,0.7)",fontWeight:600,fontSize:15,cursor:"pointer"}}>Log In</button>
        </div>
      </div>

      <div style={{background:"#161B22",borderTop:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"72px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <h2 style={{...qs,fontSize:"clamp(20px,3vw,30px)",marginBottom:12,textTransform:"uppercase"}}>Everything You Need On The Job Site</h2>
            <p style={{fontSize:15,color:"rgba(240,242,244,0.5)",maxWidth:480,margin:"0 auto"}}>Built by a contractor with 40+ years of experience. Every feature solves a real field problem.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20}}>
            {features.map((f,i)=>(
              <div key={i} style={{background:"#1C2128",borderRadius:14,padding:"24px 20px",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{width:48,height:48,borderRadius:12,background:"rgba(69,90,100,0.2)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>{f.icon}</div>
                <div style={{...qs,fontSize:13,color:"#90A4AE",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>{f.title}</div>
                <div style={{fontSize:14,color:"rgba(240,242,244,0.5)",lineHeight:1.7}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:"72px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",textAlign:"center"}}>
          <h2 style={{...qs,fontSize:"clamp(20px,3vw,30px)",marginBottom:12,textTransform:"uppercase"}}>Up And Running In Minutes</h2>
          <p style={{fontSize:15,color:"rgba(240,242,244,0.5)",marginBottom:48}}>No training required.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24}}>
            {steps.map((s,i)=>(
              <div key={i} style={{textAlign:"center",padding:"0 16px"}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(69,90,100,0.25)",border:"2px solid #455A64",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:22,fontWeight:800,color:"#546E7A"}}>{s.num}</div>
                <div style={{...qs,fontSize:14,color:"#F0F2F4",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.title}</div>
                <div style={{fontSize:14,color:"rgba(240,242,244,0.5)",lineHeight:1.7}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:"#161B22",borderTop:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"72px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",textAlign:"center"}}>
          <h2 style={{...qs,fontSize:"clamp(20px,3vw,30px)",marginBottom:12,textTransform:"uppercase"}}>See It In Action</h2>
          <p style={{fontSize:15,color:"rgba(240,242,244,0.5)",marginBottom:48}}>Built for the job site. Works on any device.</p>
          <div style={{display:"flex",gap:24,justifyContent:"center",alignItems:"flex-start",flexWrap:"wrap"}}>
            {/* Phone 1 */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <div style={{width:200,background:"#1a1a2e",borderRadius:32,border:"6px solid #2d2d3a",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}>
                <div style={{background:"#0D1117",padding:"8px 16px 4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:10,color:"#F0F2F4",fontWeight:600}}>9:41</span></div>
                <div style={{background:"#0D1117",padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:22,height:22,borderRadius:6,background:"#455A64"}}/><div><div style={{fontSize:9,color:"#F0F2F4",fontWeight:700,letterSpacing:"0.15em"}}>KAOS</div><div style={{fontSize:6,color:"rgba(240,242,244,0.4)",textTransform:"uppercase"}}>Punch List Pro</div></div></div>
                  <div style={{background:"#455A64",borderRadius:5,padding:"3px 7px",fontSize:8,color:"#fff",fontWeight:700}}>+ ADD</div>
                </div>
                <div style={{background:"#0D1117",display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{flex:1,padding:"5px 0",textAlign:"center",fontSize:7,fontWeight:700,color:"#F0F2F4",borderBottom:"2px solid #455A64"}}>PROJECTS</div>
                  <div style={{flex:1,padding:"5px 0",textAlign:"center",fontSize:7,fontWeight:700,color:"rgba(240,242,244,0.3)"}}>CLOUD</div>
                  <div style={{flex:1,padding:"5px 0",textAlign:"center",fontSize:7,fontWeight:700,color:"rgba(240,242,244,0.3)"}}>SETTINGS</div>
                </div>
                <div style={{background:"#0D1117",padding:8}}>
                  <div style={{fontSize:7,color:"rgba(240,242,244,0.5)",marginBottom:6}}>Welcome back, <span style={{color:"#F0F2F4",fontWeight:700}}>Brent</span></div>
                  {[{e:"🍽️",n:"The Monroe — Vail, CO",c:"Henderson Restaurant Group",a:"3 open",b:"2 pending"},{e:"🏨",n:"River Walk Hotel",c:"San Antonio, TX",a:"8 open",b:"5 accepted"},{e:"🏢",n:"Lakeside Office Park",c:"Cedar Park, TX"},{e:"🍸",n:"Supercalifragilistic",c:"Nashville, TN"},{e:"🏠",n:"Pearl District Residences",c:"Portland, OR",a:"6 open",b:"2 accepted"}].map((p,i)=>(
                    <div key={i} style={{background:"#161B22",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)",display:"flex",overflow:"hidden",marginBottom:i<4?5:0}}>
                      <div style={{width:3,background:"#455A64"}}/><div style={{width:36,background:"#1C2128",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{p.e}</div>
                      <div style={{flex:1,padding:"5px 6px"}}>
                        <div style={{fontSize:7,fontWeight:700,color:"#F0F2F4"}}>{p.n}</div>
                        <div style={{fontSize:6,color:"rgba(240,242,244,0.4)"}}>{p.c}</div>
                        {p.a&&<div style={{display:"flex",gap:3,marginTop:3}}><span style={{fontSize:5,background:"rgba(248,81,73,0.15)",color:"#F85149",padding:"1px 4px",borderRadius:3,fontWeight:700}}>{p.a}</span><span style={{fontSize:5,background:"rgba(210,153,34,0.15)",color:"#D29922",padding:"1px 4px",borderRadius:3,fontWeight:700}}>{p.b}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#0D1117",padding:8,display:"flex",justifyContent:"center"}}><div style={{width:40,height:3,background:"rgba(255,255,255,0.2)",borderRadius:2}}/></div>
              </div>
              <div style={{fontSize:11,color:"rgba(240,242,244,0.4)",letterSpacing:"0.04em"}}>PROJECT DASHBOARD</div>
            </div>
            {/* Phone 2 */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <div style={{width:200,background:"#1a1a2e",borderRadius:32,border:"6px solid #2d2d3a",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}>
                <div style={{background:"#0D1117",padding:"8px 16px 4px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#F0F2F4",fontWeight:600}}>9:41</span></div>
                <div style={{background:"#0D1117",padding:"7px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}><div style={{width:20,height:20,borderRadius:5,background:"#455A64"}}/><div style={{fontSize:8,color:"#F0F2F4",fontWeight:700,letterSpacing:"0.1em"}}>KAOS</div></div>
                  <div style={{width:1,height:16,background:"rgba(255,255,255,0.1)"}}/>
                  <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:8,fontWeight:700,color:"#F0F2F4"}}>The Monroe — Vail, CO</div><div style={{fontSize:6,color:"rgba(240,242,244,0.4)"}}>Henderson Restaurant Group</div></div>
                </div>
                <div style={{background:"#0D1117",display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{flex:1,padding:"4px 0",textAlign:"center",fontSize:6,fontWeight:700,color:"rgba(240,242,244,0.3)"}}>GENERAL</div>
                  <div style={{flex:1,padding:"4px 0",textAlign:"center",fontSize:6,fontWeight:700,color:"#F0F2F4",borderBottom:"2px solid #455A64"}}>ISSUES</div>
                  <div style={{flex:1,padding:"4px 0",textAlign:"center",fontSize:6,fontWeight:700,color:"rgba(240,242,244,0.3)"}}>PREVIEW</div>
                  <div style={{flex:1,padding:"4px 0",textAlign:"center",fontSize:6,fontWeight:700,color:"rgba(240,242,244,0.3)"}}>SHARE</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"rgba(255,255,255,0.06)"}}>
                  {[["3","#F85149","Open"],["2","#D29922","Pending"],["5","#3FB950","Accepted"]].map(([n,c,l])=>(
                    <div key={l} style={{background:"#161B22",padding:"8px 4px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:c,lineHeight:1}}>{n}</div><div style={{fontSize:6,color:"rgba(240,242,244,0.4)",marginTop:2,textTransform:"uppercase"}}>{l}</div></div>
                  ))}
                </div>
                <div style={{display:"flex",gap:5,padding:6,background:"#161B22",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{flex:1,background:"#455A64",borderRadius:6,padding:5,textAlign:"center",fontSize:7,fontWeight:700,color:"#fff"}}>+ ADD ONE</div>
                  <div style={{flex:1,background:"rgba(69,90,100,0.2)",borderRadius:6,padding:5,textAlign:"center",fontSize:7,fontWeight:700,color:"#F0F2F4",border:"1px solid rgba(255,255,255,0.1)"}}>+ ADD MULTI</div>
                </div>
                <div style={{background:"#0D1117",padding:5}}>
                  {[{e:"🔩",n:"Grout joints incomplete at bar backsplash",s:"Open",sc:"#F85149",sb:"rgba(248,81,73,0.15)",p:"Critical",pc:"#BC8CFF",pb:"rgba(188,140,255,0.15)",t:"Tile",a:"Bar Area",btn:"Mark Pending",bc:"#D29922",bb:"rgba(210,153,34,0.12)"},
                    {e:"🌡️",n:"HVAC diffuser not level — Main Dining",s:"Pending",sc:"#D29922",sb:"rgba(210,153,34,0.15)",p:"High",pc:"#F85149",pb:"rgba(248,81,73,0.15)",t:"HVAC",a:"Dining Room",btn:"Mark Accepted",bc:"#3FB950",bb:"rgba(63,185,80,0.12)"},
                    {e:"🚪",n:"Door hardware missing — Staff Restroom",s:"Accepted",sc:"#3FB950",sb:"rgba(63,185,80,0.15)",p:"Low",pc:"#3FB950",pb:"rgba(63,185,80,0.15)",t:"DFH",a:"Staff Restroom"}
                  ].map((item,i)=>(
                    <div key={i} style={{background:"#161B22",borderRadius:7,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",marginBottom:i<2?4:0}}>
                      <div style={{display:"flex"}}>
                        <div style={{width:48,height:48,background:"linear-gradient(135deg,#2d3748,#4a5568)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{item.e}</div>
                        <div style={{padding:"4px 6px",flex:1}}>
                          <div style={{display:"flex",gap:3,alignItems:"center",marginBottom:2}}>
                            <span style={{fontSize:6,fontWeight:800,color:"#455A64"}}>#{i+1}</span>
                            <span style={{fontSize:5,background:item.sb,color:item.sc,padding:"1px 4px",borderRadius:3,fontWeight:700}}>● {item.s}</span>
                            <span style={{fontSize:5,background:item.pb,color:item.pc,padding:"1px 4px",borderRadius:3,fontWeight:700}}>{item.p}</span>
                          </div>
                          <div style={{fontSize:6,fontWeight:600,color:"#F0F2F4",lineHeight:1.3}}>{item.n}</div>
                          <div style={{display:"flex",gap:3,marginTop:2}}>
                            <span style={{fontSize:5,background:"#1C2128",border:"1px solid rgba(255,255,255,0.06)",padding:"1px 4px",borderRadius:3,color:"rgba(240,242,244,0.5)"}}>{item.t}</span>
                            <span style={{fontSize:5,background:"#1C2128",border:"1px solid rgba(255,255,255,0.06)",padding:"1px 4px",borderRadius:3,color:"rgba(240,242,244,0.5)"}}>{item.a}</span>
                          </div>
                        </div>
                      </div>
                      {item.btn&&<div style={{background:"#0D1117",padding:"3px 6px",display:"flex",justifyContent:"flex-end",borderTop:"1px solid rgba(255,255,255,0.04)"}}><div style={{fontSize:6,fontWeight:700,color:item.bc,background:item.bb,padding:"2px 7px",borderRadius:4}}>{item.btn}</div></div>}
                    </div>
                  ))}
                </div>
                <div style={{background:"#0D1117",padding:6,display:"flex",justifyContent:"center"}}><div style={{width:40,height:3,background:"rgba(255,255,255,0.2)",borderRadius:2}}/></div>
              </div>
              <div style={{fontSize:11,color:"rgba(240,242,244,0.4)",letterSpacing:"0.04em"}}>ISSUES LIST</div>
            </div>
            {/* Phone 3 — client share */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <div style={{width:200,background:"#e8e8e8",borderRadius:32,border:"6px solid #c8c8c8",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
                <div style={{background:"#F0F2F5",padding:"8px 16px 4px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#111827",fontWeight:600}}>9:41</span></div>
                <div style={{background:"#fff",padding:"7px 10px",borderBottom:"1px solid #E5E7EB",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:20,height:20,borderRadius:5,background:"#455A64"}}/><div><div style={{fontSize:8,color:"#111827",fontWeight:700,letterSpacing:"0.1em"}}>KAOS</div><div style={{fontSize:5,color:"#9CA3AF",textTransform:"uppercase"}}>Punch List Pro</div></div></div>
                  <div style={{background:"#455A64",borderRadius:4,padding:"3px 7px",fontSize:7,color:"#fff",fontWeight:600}}>🖨 Print</div>
                </div>
                <div style={{background:"#F0F2F5",padding:6}}>
                  <div style={{background:"#fff",borderRadius:8,border:"1px solid #E5E7EB",padding:8,marginBottom:5}}>
                    <div style={{fontSize:6,fontWeight:700,color:"#455A64",textTransform:"uppercase",marginBottom:3}}>Punch List</div>
                    <div style={{fontSize:9,fontWeight:800,color:"#111827",marginBottom:2}}>The Monroe — Vail, CO</div>
                    <div style={{fontSize:6,color:"#6B7280"}}>Client: Henderson Restaurant Group</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:3,marginTop:6}}>
                      {[["3","#DC2626","#FEF2F2","Open"],["2","#D97706","#FFFBEB","Pending"],["5","#059669","#ECFDF5","Done"],["10","#111827","#F9FAFB","Total"]].map(([n,c,bg,l])=>(
                        <div key={l} style={{textAlign:"center",background:bg,borderRadius:4,padding:"3px 0"}}><div style={{fontSize:10,fontWeight:800,color:c}}>{n}</div><div style={{fontSize:5,color:"#9CA3AF"}}>{l}</div></div>
                      ))}
                    </div>
                    <div style={{height:3,background:"#E5E7EB",borderRadius:3,marginTop:5,overflow:"hidden"}}><div style={{width:"50%",height:"100%",background:"#059669",borderRadius:3}}/></div>
                    <div style={{fontSize:5,color:"#9CA3AF",textAlign:"right",marginTop:2}}>50% complete</div>
                  </div>
                  <div style={{background:"#fff",borderRadius:8,border:"1px solid #E5E7EB",overflow:"hidden",marginBottom:4}}>
                    <div style={{display:"flex"}}>
                      <div style={{width:44,height:44,background:"linear-gradient(135deg,#e8d5c0,#c4a882)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🔩</div>
                      <div style={{padding:"4px 5px",flex:1}}>
                        <div style={{display:"flex",gap:3,alignItems:"center",marginBottom:2}}><span style={{fontSize:6,fontWeight:800,color:"#455A64"}}>#1</span><span style={{fontSize:5,background:"#FEF2F2",color:"#DC2626",padding:"1px 4px",borderRadius:3,fontWeight:700}}>Open</span><span style={{fontSize:5,background:"#F5F3FF",color:"#7C3AED",padding:"1px 4px",borderRadius:3,fontWeight:700}}>Critical</span></div>
                        <div style={{fontSize:6,fontWeight:600,color:"#111827",lineHeight:1.3}}>Grout joints incomplete at bar backsplash</div>
                        <div style={{fontSize:5,color:"#6B7280",marginTop:2}}>📍 Bar Area · 🔧 Tile</div>
                      </div>
                      <div style={{padding:4,fontSize:10,color:"#9CA3AF"}}>▼</div>
                    </div>
                    <div style={{background:"#F9FAFB",borderTop:"1px solid #E5E7EB",padding:5}}>
                      <div style={{fontSize:6,color:"#374151",background:"#fff",padding:4,borderRadius:4,border:"1px solid #E5E7EB",marginBottom:4}}>💬 Santos Tile to complete grout work prior to punch walk.</div>
                      <div style={{display:"flex",gap:3}}><div style={{width:36,height:28,background:"linear-gradient(135deg,#d4c4a8,#b8a882)",borderRadius:4}}/><div style={{width:36,height:28,background:"linear-gradient(135deg,#c8b898,#a89878)",borderRadius:4}}/></div>
                    </div>
                  </div>
                </div>
                <div style={{background:"#F0F2F5",padding:6,display:"flex",justifyContent:"center"}}><div style={{width:40,height:3,background:"rgba(0,0,0,0.15)",borderRadius:2}}/></div>
              </div>
              <div style={{fontSize:11,color:"rgba(240,242,244,0.4)",letterSpacing:"0.04em"}}>CLIENT SHARE VIEW</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{background:"#161B22",borderTop:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"72px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",textAlign:"center"}}>
          <h2 style={{...qs,fontSize:"clamp(20px,3vw,30px)",marginBottom:12,textTransform:"uppercase"}}>Templates For Every Project Type</h2>
          <p style={{fontSize:15,color:"rgba(240,242,244,0.5)",marginBottom:40}}>Start from a smart template or build from scratch.</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
            {templates.map((t,i)=><div key={i} style={{padding:"10px 18px",background:"#1C2128",borderRadius:100,border:"1px solid rgba(255,255,255,0.08)",fontSize:14,fontWeight:500,color:"rgba(240,242,244,0.7)"}}>{t}</div>)}
          </div>
        </div>
      </div>

      <div style={{padding:"80px 24px",textAlign:"center"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <h2 style={{...qs,fontSize:"clamp(22px,4vw,38px)",marginBottom:16,textTransform:"uppercase"}}>Ready To Run A Tighter Job Site?</h2>
          <p style={{fontSize:15,color:"rgba(240,242,244,0.5)",marginBottom:36,lineHeight:1.7}}>Join construction professionals using KAOS Punch List Pro to close out projects faster.</p>
          <button onClick={onGetStarted} style={{padding:"14px 40px",borderRadius:10,background:"#455A64",border:"none",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:"0 4px 24px rgba(69,90,100,0.5)"}}>Get Started →</button>
        </div>
      </div>

      <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"28px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div style={{fontSize:12,color:"rgba(240,242,244,0.25)"}}>© {new Date().getFullYear()} Kaos Design Werks, LLC. All rights reserved.</div>
          <div style={{display:"flex",gap:20}}>
            <span onClick={()=>window.location.href="/privacy"} style={{fontSize:12,color:"rgba(240,242,244,0.35)",cursor:"pointer",textDecoration:"underline"}}>Privacy Policy</span>
            <span onClick={()=>window.location.href="/terms"} style={{fontSize:12,color:"rgba(240,242,244,0.35)",cursor:"pointer",textDecoration:"underline"}}>Terms of Service</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ MULTI ADD VIEW ════════════════════════════════════ */
function MultiAddView({proj,projAreas,user,projId,sessionItems,setSessionItems,onDone,listType}){
  const [title,setTitle]=useState("");
  const [area,setArea]=useState("");
  const [photo,setPhoto]=useState(null);
  const [saving,setSaving]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [editForm,setEditForm]=useState({});
  const titleRef=useRef(null);

  // ── Voice settings ──
  const [voiceTimer,setVoiceTimer]=useState(()=>parseInt(localStorage.getItem("kdw_voice_timer")||"7"));
  const [voiceLang,setVoiceLang]=useState(()=>localStorage.getItem("kdw_voice_lang")||"en-US");
  const [listening,setListening]=useState(false);
  const [countdown,setCountdown]=useState(0);
  const [interimText,setInterimText]=useState("");
  const recognitionRef=useRef(null);
  const countdownRef=useRef(null);
  const lastFinalIdxRef=useRef(0);
  const [showVoiceSettings,setShowVoiceSettings]=useState(false);

  useEffect(()=>{setTimeout(()=>titleRef.current?.focus(),150);},[]);

  // Save voice prefs
  useEffect(()=>{localStorage.setItem("kdw_voice_timer",voiceTimer);},[voiceTimer]);
  useEffect(()=>{localStorage.setItem("kdw_voice_lang",voiceLang);},[voiceLang]);

  const stopVoice=()=>{
    recognitionRef.current?.stop();
    recognitionRef.current=null;
    clearInterval(countdownRef.current);
    setListening(false);setCountdown(0);setInterimText("");
  };

  const startVoice=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){return;}
    const timerActive={current:true};
    let secs=voiceTimer;
    countdownRef.current=setInterval(()=>{
      secs--;
      setCountdown(secs);
      if(secs<=0){timerActive.current=false;stopVoice();}
    },1000);
    setListening(true);
    setCountdown(voiceTimer);

    const runOnce=()=>{
      if(!timerActive.current)return;
      try{
        const r=new SR();
        r.lang=voiceLang;
        r.continuous=false; // single utterance — no duplicates
        r.interimResults=true;
        let sessionFinal="";
        r.onresult=(e)=>{
          let interim="";
          sessionFinal="";
          for(let i=0;i<e.results.length;i++){
            if(e.results[i].isFinal) sessionFinal+=e.results[i][0].transcript;
            else interim+=e.results[i][0].transcript;
          }
          // SET interim preview
          setInterimText(interim);
        };
        r.onend=()=>{
          // Commit the final result — SET title (replace previous session text)
          if(sessionFinal.trim()) setTitle(sessionFinal.trim());
          setInterimText("");
          recognitionRef.current=null;
          // Restart for next utterance if timer still running
          if(timerActive.current) setTimeout(runOnce,200);
        };
        r.onerror=()=>{
          recognitionRef.current=null;
          if(timerActive.current) setTimeout(runOnce,300);
        };
        r.start();
        recognitionRef.current=r;
      }catch{/* silent fail */}
    };
    runOnce();
  };

  const handlePhoto=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    try{
      const{dataUrl,blob}=await compressImage(file,1280,0.8);
      setPhoto({url:dataUrl,file:new File([blob],file.name||"photo.jpg",{type:"image/jpeg"})});
    }catch{
      const reader=new FileReader();reader.onload=ev=>setPhoto({url:ev.target.result,file});reader.readAsDataURL(file);
    }
    e.target.value="";
    // Auto-start voice after photo
    setTimeout(()=>startVoice(),300);
  };

  const handleSave=async()=>{
    if(!title.trim()||saving)return;
    setSaving(true);
    try{
      // Store photo data locally — will upload on Done
      let localPhoto=null;
      if(photo?.file){
        localPhoto={url:photo.url,file:photo.file};
      }
      // Add to local session only — Supabase save happens on Done
      const tempId="temp_"+Date.now()+"_"+Math.random().toString(36).slice(2);
      const created={
        id:tempId,
        num:null, // assigned on Done
        title:title.trim(),
        trade:"",area:area||"",assignedTo:"",
        priority:"Medium",status:"open",comments:"",
        photos:localPhoto?[{url:localPhoto.url,file:localPhoto.file}]:[],
        list_type:listType||"punch",
        _isLocal:true,
      };
      setSessionItems(prev=>[created,...prev]);
      setTitle("");setPhoto(null);setShowVoiceSettings(false);
      setTimeout(()=>titleRef.current?.focus(),50);
    }catch(e){alert("Error: "+e.message);}
    setSaving(false);
  };

  const openEdit=(item)=>{
    setEditItem(item);
    setEditForm({title:item.title,trade:item.trade||"",area:item.area||"",priority:item.priority||"Medium",comments:item.comments||""});
  };

  const saveEdit=async()=>{
    if(!editItem)return;
    try{
      // If item is local only (not yet in DB), just update local state
      if(editItem._isLocal){
        setSessionItems(prev=>prev.map(i=>i.id===editItem.id?{...i,...editForm}:i));
      } else {
        await sb.from("items").update({title:editForm.title,trade:editForm.trade||null,area:editForm.area||null,priority:editForm.priority,comments:editForm.comments||null}).eq("id",editItem.id);
        setSessionItems(prev=>prev.map(i=>i.id===editItem.id?{...i,...editForm}:i));
      }
      setEditItem(null);
    }catch(e){alert("Failed: "+e.message);}
  };

  const deleteSessionItem=async(item)=>{
    if(!confirm("Delete this item?"))return;
    try{
      if(!item._isLocal){
        await sb.from("items").delete().eq("id",item.id);
      }
      setSessionItems(prev=>prev.filter(i=>i.id!==item.id));
      setEditItem(null);
    }catch(e){alert("Failed to delete: "+e.message);}
  };

  const inp={width:"100%",padding:"11px 14px",borderRadius:10,border:`1px solid ${D.b2}`,background:D.bg1,color:D.t1,fontSize:14,outline:"none",boxSizing:"border-box"};

  return(
    <div style={{minHeight:"100vh",background:D.bg0}}>
      {/* Inline header — DarkHeader lives inside MainApp so can't be used here */}
      <div style={{background:D.bg0,borderBottom:`1px solid ${D.b1}`,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",height:60,padding:"0 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
            <div style={{width:34,height:34,borderRadius:10,overflow:"hidden",boxShadow:"0 2px 6px rgba(180,120,60,0.3)"}}><img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
            <div>
              <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:16,color:D.t1,letterSpacing:"0.2em",lineHeight:1}}>KAOS</div>
              <div style={{fontSize:8,color:D.t3,letterSpacing:"0.12em",textTransform:"uppercase"}}>Punch List Pro</div>
            </div>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <button onClick={onDone} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,display:"flex",padding:4}}><ArrowLeft size={18}/></button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:D.t1}}>Quick Add</div>
              <div style={{fontSize:10,color:D.t3}}>{sessionItems.length} item{sessionItems.length!==1?"s":""} added</div>
            </div>
          </div>
          <button onClick={()=>onDone(sessionItems)} style={{padding:"7px 16px",borderRadius:8,background:D.green,color:"#fff",fontWeight:700,fontSize:13,border:"none",cursor:"pointer",flexShrink:0}}>Done ✓</button>
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"16px 16px 80px"}}>
        {/* Quick add form */}
        <div style={{background:D.bg1,borderRadius:16,padding:18,border:`1px solid ${D.b1}`,marginBottom:20}}>
          {/* Voice settings bar */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"8px 12px",background:D.bg2,borderRadius:10,border:`1px solid ${D.b1}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:D.t3}}>🎙</span>
              <span style={{fontSize:11,color:D.t3}}>Voice auto-starts after photo</span>
            </div>
            <button onClick={()=>setShowVoiceSettings(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:D.ac,fontWeight:600}}>
              {voiceTimer}s · {voiceLang==="en-US"?"EN":"ES"} ⚙
            </button>
          </div>

          {/* Voice settings panel */}
          {showVoiceSettings&&(
            <div style={{background:D.bg2,borderRadius:12,padding:14,marginBottom:14,border:`1px solid ${D.b1}`}}>
              <div style={{fontSize:11,fontWeight:700,color:D.t3,marginBottom:10,letterSpacing:"0.08em",textTransform:"uppercase"}}>Voice Settings</div>
              <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                <div style={{fontSize:11,color:D.t3,width:"100%",marginBottom:4}}>Timer Duration</div>
                {[5,7,10,15].map(s=>(
                  <button key={s} onClick={()=>{setVoiceTimer(s);setShowVoiceSettings(false);}}
                    style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${voiceTimer===s?D.ac:D.b2}`,background:voiceTimer===s?D.acLL:"none",color:voiceTimer===s?D.t1:D.t3,fontWeight:voiceTimer===s?700:400,fontSize:13,cursor:"pointer"}}>
                    {s}s
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{fontSize:11,color:D.t3,width:"100%",marginBottom:4}}>Language</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {[["en-US","English 🇺🇸"],["es-ES","Español 🇲🇽"]].map(([code,label])=>(
                  <button key={code} onClick={()=>{setVoiceLang(code);setShowVoiceSettings(false);}}
                    style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${voiceLang===code?D.ac:D.b2}`,background:voiceLang===code?D.acLL:"none",color:voiceLang===code?D.t1:D.t3,fontWeight:voiceLang===code?700:400,fontSize:12,cursor:"pointer"}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photo first — snap photo → voice auto-starts */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Step 1 — Photo</div>
            {photo?(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{position:"relative",width:72,height:72,borderRadius:10,overflow:"hidden",flexShrink:0}}>
                  <img src={photo.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  <button onClick={()=>{setPhoto(null);stopVoice();}} style={{position:"absolute",top:3,right:3,width:20,height:20,background:"rgba(0,0,0,0.7)",border:"none",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={11} color="#fff"/></button>
                </div>
                <div style={{fontSize:12,color:D.green,fontWeight:600}}>✓ Photo captured</div>
              </div>
            ):(
              <div style={{display:"flex",gap:8}}>
                <label style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:10,background:D.acLL,border:`1px solid ${D.b3}`,cursor:"pointer",fontSize:13,fontWeight:600,color:D.t1}}>
                  <Camera size={16} color={D.acL}/> Camera
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{display:"none"}}/>
                </label>
                <label style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:10,background:D.bg2,border:`1px solid ${D.b2}`,cursor:"pointer",fontSize:13,fontWeight:600,color:D.t2}}>
                  <ImageIcon size={16}/> Library
                  <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
                </label>
                <button onClick={()=>startVoice()} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",borderRadius:10,background:"rgba(248,81,73,0.1)",border:"1px solid rgba(248,81,73,0.3)",cursor:"pointer",fontSize:13,fontWeight:600,color:D.red}}>
                  🎙 Voice Only
                </button>
              </div>
            )}
          </div>

          {/* Mic overlay — shows during voice recording */}
          {listening&&(
            <div style={{background:"rgba(248,81,73,0.08)",border:"1px solid rgba(248,81,73,0.3)",borderRadius:12,padding:16,marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
              <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                {/* Pulsing ring */}
                <div style={{position:"absolute",inset:-6,borderRadius:"50%",border:"2px solid rgba(248,81,73,0.4)",animation:"pulse 1s ease-in-out infinite"}}/>
                <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(248,81,73,0.15)",border:"2px solid #F85149",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onClick={stopVoice}>
                  <span style={{fontSize:22}}>🎙</span>
                </div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:D.red}}>Listening...</span>
                  <span style={{fontSize:20,fontWeight:800,color:D.red}}>{countdown}</span>
                </div>
                <div style={{height:4,background:"rgba(248,81,73,0.15)",borderRadius:100,overflow:"hidden"}}>
                  <div style={{height:"100%",background:D.red,borderRadius:100,width:`${(countdown/voiceTimer)*100}%`,transition:"width 1s linear"}}/>
                </div>
                {interimText&&<div style={{fontSize:12,color:D.t3,marginTop:6,fontStyle:"italic"}}>"{interimText}"</div>}
              </div>
            </div>
          )}

          {/* Title — Step 2 */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>
              Step 2 — Title *
              {!listening&&<button onClick={()=>{setTitle("");setInterimText("");setTimeout(()=>startVoice(),50);}} style={{marginLeft:8,background:"none",border:"none",cursor:"pointer",fontSize:11,color:D.ac,fontWeight:600}}>🎙 Re-Record</button>}
            </div>
            <input ref={titleRef} value={title} onChange={e=>setTitle(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSave()} placeholder="Speak or type the deficiency..." style={{...inp,fontSize:15,padding:"12px 14px"}}/>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Area</div>
            <select value={area} onChange={e=>setArea(e.target.value)} style={{...inp,appearance:"none",cursor:"pointer"}}>
              <option value="">No area</option>
              {projAreas.map(a=><option key={a.id} value={a.name}>{a.section?`[${a.section}] `:""}{a.name}</option>)}
            </select>
          </div>

          <MultiSaveButton onSave={handleSave} disabled={!title.trim()}/>
          <div style={{textAlign:"center",fontSize:11,color:D.t3,marginTop:6}}>or press Enter</div>
        </div>

        {/* Live running list */}
        {sessionItems.length>0&&(
          <div>
            <div style={{fontSize:11,fontWeight:700,color:D.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>{sessionItems.length} Item{sessionItems.length!==1?"s":""} Added This Session — Tap To Edit</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {sessionItems.map((item,i)=>(
                <div key={item.id} style={{background:D.bg1,borderRadius:12,border:`1px solid ${D.b1}`,overflow:"hidden",cursor:"pointer"}} onClick={()=>openEdit(item)}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}>
                    {item.photos?.[0]?(
                      <img src={item.photos[0].url} alt="" style={{width:44,height:44,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                    ):(
                      <div style={{width:44,height:44,borderRadius:8,background:D.bg2,border:`1px solid ${D.b2}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Camera size={16} color={D.t3}/></div>
                    )}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:D.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                      <div style={{fontSize:11,color:D.t3,marginTop:2}}>
                        {item.area&&<span>📍 {item.area} </span>}
                        {item.trade&&<span>🔧 {item.trade}</span>}
                        {!item.area&&!item.trade&&<span style={{color:D.ac}}>Tap to add details →</span>}
                      </div>
                    </div>
                    <Pencil size={14} color={D.t3}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit bottom sheet */}
      {editItem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:0}} onClick={()=>setEditItem(null)}>
          <div style={{background:D.bg1,borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:600,border:`1px solid ${D.b2}`,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:700,color:D.t1}}>Edit Item</div>
              <button onClick={()=>setEditItem(null)} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,display:"flex"}}><X size={20}/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Title</div>
                <input value={editForm.title||""} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} style={{...inp}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Trade</div>
                  <select value={editForm.trade||""} onChange={e=>setEditForm(f=>({...f,trade:e.target.value}))} style={{...inp,appearance:"none"}}>
                    <option value="">Select...</option>
                    {MASTER_TRADES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Priority</div>
                  <select value={editForm.priority||"Medium"} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))} style={{...inp,appearance:"none"}}>
                    {["Low","Medium","High","Critical"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Area</div>
                <select value={editForm.area||""} onChange={e=>setEditForm(f=>({...f,area:e.target.value}))} style={{...inp,appearance:"none"}}>
                  <option value="">No area</option>
                  {projAreas.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Notes</div>
                <textarea value={editForm.comments||""} onChange={e=>setEditForm(f=>({...f,comments:e.target.value}))} placeholder="Additional notes..." rows={3} style={{...inp,resize:"vertical"}}/>
              </div>
              <SaveFlashButton onClick={saveEdit} label="Save Changes"/>
              <button onClick={()=>deleteSessionItem(editItem)}
                style={{width:"100%",padding:11,borderRadius:12,background:D.redBg,color:D.red,fontWeight:600,fontSize:14,border:`1px solid rgba(248,81,73,0.25)`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:6}}>
                <Trash2 size={15}/> Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── COLLABORATOR PROJECT VIEW ─────────────────────── */
function CollaboratorProjectView({token, collab}){
  const [project,setProject]=useState(null);
  const [items,setItems]=useState([]);
  const [areas,setAreas]=useState([]);
  const [loading,setLoading]=useState(true);
  const [listType,setListType]=useState("punch");
  const [fStatus,setFStatus]=useState("all");
  const [addForm,setAddForm]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [deletedPhotos,setDeletedPhotos]=useState([]);
  const [saving,setSaving]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(null);

  const SUPA_URL_C="https://rnfpfyaktfvfzqxttowc.supabase.co";
  const ANON_KEY_C="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZnBmeWFrdGZ2ZnpxeHR0b3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzYwNzAsImV4cCI6MjA5NTY1MjA3MH0.2obT_D2ce6yaoOH5NAk2wrgdDvb3BBEuT5rEeUXxVIM";
  const sbC=createClient(SUPA_URL_C,ANON_KEY_C);

  const callWrite=async(action,data,retries=2)=>{
    for(let attempt=0;attempt<=retries;attempt++){
      try{
        const res=await fetch(`${SUPA_URL_C}/functions/v1/collaborator-write`,{
          method:"POST",
          headers:{"Content-Type":"application/json",Authorization:`Bearer ${ANON_KEY_C}`,apikey:ANON_KEY_C},
          body:JSON.stringify({token,action,data}),
        });
        const json=await res.json().catch(()=>null);
        if(!res.ok)throw new Error(json?.error||json?.message||`HTTP ${res.status}`);
        if(json.error)throw new Error(json.error);
        return json;
      }catch(e){
        if(attempt===retries)throw e;
        await new Promise(r=>setTimeout(r,1000*(attempt+1))); // backoff
      }
    }
  };

  useEffect(()=>{
    const load=async()=>{
      const{data:proj}=await sbC.from("projects").select("*").eq("id",collab.project_id).single();
      setProject(proj);
      const{data:areaData}=await sbC.from("areas").select("*").eq("project_id",collab.project_id).order("sort_order");
      setAreas(areaData||[]);
      const{data:itemData}=await sbC.from("items").select("*, photos(id,storage_path,sort_order,is_primary)").eq("project_id",collab.project_id).order("num");
      setItems((itemData||[]).map(i=>({
        ...i,
        photos:(i.photos||[]).sort((a,b)=>a.sort_order-b.sort_order).map(p=>({id:p.id,path:p.storage_path,url:`${SUPA_URL_C}/storage/v1/object/public/photos/${p.storage_path}`,isPrimary:p.is_primary||false})),
      })));
      setLoading(false);
    };
    load();
  },[]);

  const filteredItems=items
    .filter(i=>(i.list_type||"punch")===listType)
    .filter(i=>fStatus==="all"||i.status===fStatus);

  const stats={
    open:items.filter(i=>(i.list_type||"punch")===listType&&i.status==="open").length,
    pending:items.filter(i=>(i.list_type||"punch")===listType&&i.status==="pending").length,
    accepted:items.filter(i=>(i.list_type||"punch")===listType&&i.status==="accepted").length,
  };

  const handleAdd=async()=>{
    if(!addForm?.title?.trim()||saving)return;
    setSaving(true);
    try{
      const{photos,...itemData}=addForm;
      const{item}=await callWrite("add",{...itemData,list_type:listType});
      const validPhotos=(photos||[]).filter(Boolean);
      const photoRows=[];
      for(let i=0;i<validPhotos.length;i++){
        try{
          const{path}=await uploadPhoto(validPhotos[i].file,collab.project_id);
          photoRows.push({item_id:item.id,storage_path:path,sort_order:i,is_primary:validPhotos[i].isPrimary||i===0});
        }catch(photoErr){console.error("Photo upload failed:",photoErr.message);}
      }
      let savedPhotos=[];
      if(photoRows.length>0){
        const{data:inserted}=await sbC.from("photos").insert(photoRows).select();
        savedPhotos=(inserted||[]).map(p=>({id:p.id,path:p.storage_path,url:`${SUPA_URL_C}/storage/v1/object/public/photos/${p.storage_path}`,isPrimary:p.is_primary||false}));
      }
      setItems(prev=>[...prev,{...item,photos:savedPhotos}]);
      setAddForm(null);
    }catch(e){alert("Failed to add: "+e.message);}
    setSaving(false);
  };

  const addFormPhoto=(photo,idx)=>setAddForm(f=>{const photos=[...(f.photos||[])];photos[idx]=photo;return{...f,photos};});
  const removeFormPhoto=idx=>setAddForm(f=>({...f,photos:(f.photos||[]).filter((_,i)=>i!==idx)}));
  const setFormPrimaryPhoto=idx=>setAddForm(f=>({...f,photos:(f.photos||[]).map((p,i)=>p?{...p,isPrimary:i===idx}:p)}));

  const handleEdit=async()=>{
    if(!editItem||saving)return;
    setSaving(true);
    try{
      const{photos,...itemData}=editForm;
      const{item}=await callWrite("edit",{id:editItem.id,...itemData});

      // Delete removed existing photos
      await Promise.all(deletedPhotos.map(async dp=>{
        await sbC.from("photos").delete().eq("id",dp.id);
        await deletePhotoFile(dp.path);
      }));

      // Upload and insert any new photos
      const newPhotos=(photos||[]).filter(p=>p&&!p.id&&p.file);
      const uploadedRows=[];
      for(let i=0;i<newPhotos.length;i++){
        try{
          const{path}=await uploadPhoto(newPhotos[i].file,collab.project_id);
          uploadedRows.push({item_id:editItem.id,storage_path:path,sort_order:i,is_primary:newPhotos[i].isPrimary||false});
        }catch(photoErr){console.error("Photo upload failed:",photoErr.message);}
      }
      let insertedPhotos=[];
      if(uploadedRows.length>0){
        const{data}=await sbC.from("photos").insert(uploadedRows).select();
        insertedPhotos=(data||[]).map(p=>({id:p.id,path:p.storage_path,url:`${SUPA_URL_C}/storage/v1/object/public/photos/${p.storage_path}`,isPrimary:p.is_primary||false}));
      }

      // Persist primary flag changes on kept existing photos
      const keptExisting=(photos||[]).filter(p=>p&&p.id);
      await Promise.all(keptExisting.map(p=>sbC.from("photos").update({is_primary:p.isPrimary||false}).eq("id",p.id)));

      const finalPhotos=[...keptExisting,...insertedPhotos];
      setItems(prev=>prev.map(i=>i.id===editItem.id?{...i,...item,photos:finalPhotos}:i));
      setEditItem(null);
      setDeletedPhotos([]);
    }catch(e){alert("Failed to save: "+e.message);}
    setSaving(false);
  };

  const editFormPhoto=(photo,idx)=>setEditForm(f=>{const photos=[...(f.photos||[])];photos[idx]=photo;return{...f,photos};});
  const removeEditFormPhoto=idx=>setEditForm(f=>{
    const photo=(f.photos||[])[idx];
    if(photo?.id)setDeletedPhotos(prev=>[...prev,{id:photo.id,path:photo.path}]);
    return{...f,photos:(f.photos||[]).filter((_,i)=>i!==idx)};
  });
  const setEditFormPrimaryPhoto=idx=>setEditForm(f=>({...f,photos:(f.photos||[]).map((p,i)=>p?{...p,isPrimary:i===idx}:p)}));

  const handleDelete=async(itemId)=>{
    setSaving(true);
    try{
      await callWrite("delete",{id:itemId});
      setItems(prev=>prev.filter(i=>i.id!==itemId));
      setConfirmDelete(null);
    }catch(e){alert("Failed to delete: "+e.message);}
    setSaving(false);
  };

  const handleCloseout=async(item)=>{
    const newStatus=item.status==="open"?"pending":item.status==="pending"?"accepted":"open";
    try{
      await callWrite("closeout",{id:item.id,status:newStatus});
      setItems(prev=>prev.map(i=>i.id===item.id?{...i,status:newStatus}:i));
    }catch(e){alert("Failed: "+e.message);}
  };

  const STATUS_COLORS={open:{bg:"#FEF2F2",col:"#DC2626"},pending:{bg:"#FFFBEB",col:"#D97706"},accepted:{bg:"#ECFDF5",col:"#059669"}};
  const NEXT_LABEL={open:"Mark Pending",pending:"Mark Accepted",accepted:"Reopen"};
  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(0,0,0,0.1)",background:"#fff",color:"#111827",fontSize:13,outline:"none",boxSizing:"border-box"};

  if(loading)return<div style={{minHeight:"100vh",background:"#F0F2F5",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif",color:"#6B7280"}}>Loading project...</div>;

  return(
    <div style={{minHeight:"100vh",background:"#F0F2F5",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {/* Header */}
      <div style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 20px",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:720,margin:"0 auto",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,overflow:"hidden",boxShadow:"0 2px 6px rgba(180,120,60,0.3)"}}><img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
            <div>
              <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:15,letterSpacing:"0.2em",color:"#111827",lineHeight:1}}>KAOS</div>
              <div style={{fontSize:8,color:"#9CA3AF",letterSpacing:"0.12em",textTransform:"uppercase"}}>Punch List Pro</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{project?.name}</div>
            <div style={{fontSize:11,color:"#6B7280"}}>{collab.full_name} · Collaborator</div>
          </div>
        </div>
        {/* List type tabs */}
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",borderTop:"1px solid #E5E7EB"}}>
          {["punch","completion"].map(lt=>(
            <button key={lt} onClick={()=>{setListType(lt);setFStatus("all");}}
              style={{flex:1,padding:"8px 0",fontSize:11,fontWeight:700,border:"none",background:"none",cursor:"pointer",color:listType===lt?"#111827":"#9CA3AF",borderBottom:listType===lt?"2px solid #455A64":"2px solid transparent",textTransform:"uppercase",letterSpacing:"0.06em"}}>
              {lt==="punch"?"Punch Issues":"Completion Issues"}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"16px 16px 100px"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:"#E5E7EB",borderRadius:12,overflow:"hidden",marginBottom:16}}>
          {[{l:"Open",v:stats.open,col:"#DC2626"},{l:"Pending",v:stats.pending,col:"#D97706"},{l:"Accepted",v:stats.accepted,col:"#059669"}].map(s=>(
            <div key={s.l} style={{background:"#fff",padding:"14px 8px",textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:800,color:s.col,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:10,fontWeight:600,color:"#9CA3AF",marginTop:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          {["all","open","pending","accepted"].map(s=>(
            <button key={s} onClick={()=>setFStatus(s)}
              style={{padding:"5px 12px",borderRadius:100,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${fStatus===s?"#455A64":"#E5E7EB"}`,background:fStatus===s?"#455A64":"transparent",color:fStatus===s?"#fff":"#6B7280"}}>
              {s==="all"?"All":s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>

        {/* Add item form */}
        {collab.can_add&&addForm!==null&&(
          <div style={{background:"#fff",borderRadius:14,border:"1px solid #E5E7EB",padding:16,marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:12}}>New Item</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Issue Title *</div>
                <input value={addForm.title||""} onChange={e=>setAddForm(f=>({...f,title:e.target.value}))} placeholder="Describe the issue..." style={inp}/>
              </div>
              <div><div style={{fontSize:11,color:"#6B7280",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Photos (up to 5)</div>
                <PhotoGrid photos={addForm.photos||[]} onAdd={addFormPhoto} onRemove={removeFormPhoto} onSetPrimary={setFormPrimaryPhoto}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Area</div>
                  <select value={addForm.area||""} onChange={e=>setAddForm(f=>({...f,area:e.target.value}))} style={{...inp,appearance:"none"}}>
                    <option value="">No area</option>
                    {areas.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Trade</div>
                  <select value={addForm.trade||""} onChange={e=>setAddForm(f=>({...f,trade:e.target.value}))} style={{...inp,appearance:"none"}}>
                    <option value="">Select trade...</option>
                    {MASTER_TRADES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Assigned To</div>
                  <input value={addForm.assigned_to||""} onChange={e=>setAddForm(f=>({...f,assigned_to:e.target.value}))} placeholder="Sub or vendor..." style={inp}/>
                </div>
                <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Priority</div>
                  <select value={addForm.priority||"Medium"} onChange={e=>setAddForm(f=>({...f,priority:e.target.value}))} style={{...inp,appearance:"none"}}>
                    {["Low","Medium","High","Critical"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Comments / Notes</div>
                <textarea value={addForm.comments||""} onChange={e=>setAddForm(f=>({...f,comments:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setAddForm(null)} style={{flex:1,padding:10,borderRadius:10,background:"#F4F6F8",border:"1px solid #E5E7EB",color:"#374151",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
                <button onClick={handleAdd} disabled={!addForm?.title?.trim()||saving}
                  style={{flex:2,padding:10,borderRadius:10,background:addForm?.title?.trim()&&!saving?"#455A64":"#E5E7EB",color:addForm?.title?.trim()&&!saving?"#fff":"#9CA3AF",fontWeight:700,fontSize:13,border:"none",cursor:"pointer"}}>
                  {saving?"Saving...":listType==="completion"?"Add to Completion List":"Add to Punch List"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add button */}
        {collab.can_add&&addForm===null&&(
          <button onClick={()=>setAddForm({title:"",area:"",trade:"",assigned_to:"",priority:"Medium",comments:"",photos:[]})}
            style={{width:"100%",padding:12,borderRadius:12,background:"#455A64",color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer",marginBottom:12}}>
            + Add Item
          </button>
        )}

        {/* Items list */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filteredItems.length===0&&(
            <div style={{textAlign:"center",padding:"48px 20px",color:"#9CA3AF",fontSize:14}}>No items found</div>
          )}
          {filteredItems.map(item=>{
            const sc=STATUS_COLORS[item.status]||STATUS_COLORS.open;
            const firstPhoto=(item.photos||[]).find(p=>p.isPrimary)||(item.photos||[])[0];
            return(
              <div key={item.id} style={{background:"#fff",borderRadius:14,border:"1px solid #E5E7EB",overflow:"hidden"}}>
                <div style={{display:"flex"}}>
                  {firstPhoto
                    ?<img src={firstPhoto.url} alt="" style={{width:88,height:88,objectFit:"cover",flexShrink:0}}/>
                    :<div style={{width:88,height:88,background:"#F4F6F8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>📋</div>
                  }
                  <div style={{flex:1,padding:"10px 12px",minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:800,color:"#455A64"}}>#{item.num}</span>
                      <span style={{padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:700,background:sc.bg,color:sc.col}}>{item.status?.charAt(0).toUpperCase()+item.status?.slice(1)}</span>
                      {item.priority&&<span style={{padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:600,color:"#6B7280",background:"#F4F6F8"}}>{item.priority}</span>}
                    </div>
                    <div style={{fontSize:14,fontWeight:600,color:"#111827",marginBottom:3}}>{item.title}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {item.area&&<span style={{fontSize:11,color:"#6B7280"}}>📍 {item.area}</span>}
                      {item.trade&&<span style={{fontSize:11,color:"#6B7280"}}>🔧 {item.trade}</span>}
                      {item.assigned_to&&<span style={{fontSize:11,color:"#6B7280"}}>👤 {item.assigned_to}</span>}
                      {item.photos?.length>0&&<span style={{fontSize:11,color:"#6B7280"}}>📷 {item.photos.length}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-around",padding:"8px 10px",gap:4,flexShrink:0}}>
                    {collab.can_edit&&<button onClick={()=>{setEditItem(item);setEditForm({title:item.title,area:item.area||"",trade:item.trade||"",assigned_to:item.assigned_to||item.assignedTo||"",priority:item.priority||"Medium",comments:item.comments||"",photos:(item.photos||[]).map(p=>p?{...p}:p)});setDeletedPhotos([]); }} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:4,display:"flex"}}><Pencil size={14}/></button>}
                    {collab.can_delete&&<button onClick={()=>setConfirmDelete(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#DC2626",padding:4,display:"flex"}}><Trash2 size={14}/></button>}
                  </div>
                </div>
                {item.comments&&<div style={{padding:"6px 12px 8px",fontSize:12,color:"#6B7280",borderTop:"1px solid #F4F6F8"}}>💬 {item.comments}</div>}
                {collab.can_closeout&&(
                  <div style={{padding:"6px 10px",borderTop:"1px solid #F4F6F8",display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={()=>handleCloseout(item)}
                      style={{padding:"5px 14px",borderRadius:8,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",
                        background:item.status==="accepted"?"#FEF2F2":item.status==="pending"?"#ECFDF5":"#FFFBEB",
                        color:item.status==="accepted"?"#DC2626":item.status==="pending"?"#059669":"#D97706"}}>
                      {NEXT_LABEL[item.status]||"Mark Pending"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit bottom sheet */}
      {editItem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={()=>setEditItem(null)}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:600,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>Edit Item</div>
              <button onClick={()=>setEditItem(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF"}}><X size={20}/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Issue Title</div>
                <input value={editForm.title||""} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} style={inp}/>
              </div>
              <div><div style={{fontSize:11,color:"#6B7280",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Photos (up to 5)</div>
                <PhotoGrid photos={editForm.photos||[]} onAdd={editFormPhoto} onRemove={removeEditFormPhoto} onSetPrimary={setEditFormPrimaryPhoto}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Area</div>
                  <select value={editForm.area||""} onChange={e=>setEditForm(f=>({...f,area:e.target.value}))} style={{...inp,appearance:"none"}}>
                    <option value="">No area</option>
                    {areas.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Trade</div>
                  <select value={editForm.trade||""} onChange={e=>setEditForm(f=>({...f,trade:e.target.value}))} style={{...inp,appearance:"none"}}>
                    <option value="">Select trade...</option>
                    {MASTER_TRADES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Assigned To</div>
                  <input value={editForm.assigned_to||""} onChange={e=>setEditForm(f=>({...f,assigned_to:e.target.value}))} placeholder="Sub or vendor..." style={inp}/>
                </div>
                <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Priority</div>
                  <select value={editForm.priority||"Medium"} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))} style={{...inp,appearance:"none"}}>
                    {["Low","Medium","High","Critical"].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div><div style={{fontSize:11,color:"#6B7280",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Comments / Notes</div>
                <textarea value={editForm.comments||""} onChange={e=>setEditForm(f=>({...f,comments:e.target.value}))} rows={3} style={{...inp,resize:"vertical"}}/>
              </div>
              <button onClick={handleEdit} disabled={saving} style={{width:"100%",padding:13,borderRadius:12,background:saving?"#E5E7EB":"#455A64",color:saving?"#9CA3AF":"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer"}}>
                {saving?"Saving...":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:340,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:12}}>🗑️</div>
            <div style={{fontSize:16,fontWeight:700,color:"#111827",marginBottom:8}}>Delete this item?</div>
            <div style={{fontSize:13,color:"#6B7280",marginBottom:20}}>This cannot be undone.</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,padding:11,borderRadius:10,background:"#F4F6F8",border:"1px solid #E5E7EB",color:"#374151",fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>handleDelete(confirmDelete)} disabled={saving} style={{flex:1,padding:11,borderRadius:10,background:"#DC2626",color:"#fff",fontWeight:700,border:"none",cursor:"pointer"}}>
                {saving?"Deleting...":"Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── COLLABORATOR VERIFY ────────────────────────────── */
function CollaboratorVerify({token}){
  const [collab,setCollab]=useState(null);
  const [form,setForm]=useState({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [done,setDone]=useState(false);
  const [notFound,setNotFound]=useState(false);

  useEffect(()=>{
    sb.from("collaborators").select("*").eq("invite_token",token).maybeSingle().then(({data})=>{
      if(!data){setNotFound(true);setLoading(false);return;}
      setCollab(data);
      setForm({fullName:data.full_name||"",companyName:data.company_name||"",title:data.title||"",email:data.email||"",phone:data.phone||""});
      setLoading(false);
      // If already verified, show project immediately
      if(data.verified) setDone(true);
    });
  },[token]);

  const handleSave=async()=>{
    setSaving(true);
    try{
      const{error:updateErr}=await sb.from("collaborators").update({
        full_name:form.fullName.trim(),company_name:form.companyName.trim()||null,
        title:form.title.trim()||null,email:form.email.trim(),
        phone:form.phone.trim()||null,verified:true,
      }).eq("invite_token",token);
      if(updateErr){
        // Try upsert as fallback
        const{error:upsertErr}=await sb.from("collaborators").update({verified:true}).eq("invite_token",token);
        if(upsertErr)throw new Error(upsertErr.message);
      }
      setDone(true);
    }catch(e){
      alert("Verification failed: "+e.message+". Please contact the project owner.");
    }
    setSaving(false);
  };

  const inp={width:"100%",padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",color:"#F0F2F4",fontSize:14,outline:"none",boxSizing:"border-box"};

  if(loading)return<div style={{minHeight:"100vh",background:"#0A0A0A",display:"flex",alignItems:"center",justifyContent:"center",color:"#F0F2F4"}}>Loading...</div>;
  if(notFound)return<div style={{minHeight:"100vh",background:"#0A0A0A",display:"flex",alignItems:"center",justifyContent:"center",color:"#F85149",fontSize:16}}>Invite link not found or expired.</div>;

  if(done)return<CollaboratorProjectView token={token} collab={collab}/>;

  return(
    <div style={{minHeight:"100vh",background:"#0A0A0A",fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:52,height:52,borderRadius:14,overflow:"hidden",marginBottom:16,boxShadow:"0 4px 20px rgba(180,120,60,0.4)"}}>
        <img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
      </div>
      <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:100,fontSize:22,color:"#F0F2F4",letterSpacing:"0.3em",marginBottom:32}}>KAOS</div>
      <div style={{background:"#141414",borderRadius:20,border:"1px solid rgba(255,255,255,0.07)",padding:28,maxWidth:460,width:"100%",boxShadow:"0 24px 60px rgba(0,0,0,0.7)"}}>
        <div style={{fontSize:18,fontWeight:800,color:"#F0F2F4",marginBottom:6}}>Verify Your Information</div>
        <div style={{fontSize:13,color:"rgba(240,242,244,0.45)",marginBottom:20,lineHeight:1.6}}>You've been invited to collaborate on a punch list project. Please verify your info below and click Save.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><div style={{fontSize:11,color:"rgba(240,242,244,0.35)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Full Name *</div><input value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))} style={inp}/></div>
            <div><div style={{fontSize:11,color:"rgba(240,242,244,0.35)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Title</div><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={inp}/></div>
          </div>
          <div><div style={{fontSize:11,color:"rgba(240,242,244,0.35)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Company Name</div><input value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} style={inp}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><div style={{fontSize:11,color:"rgba(240,242,244,0.35)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Email *</div><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} type="email" style={inp}/></div>
            <div><div style={{fontSize:11,color:"rgba(240,242,244,0.35)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Phone</div><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={inp}/></div>
          </div>
          <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:13,borderRadius:12,background:saving?"#21262D":"#455A64",color:"#fff",fontWeight:700,fontSize:15,border:"none",cursor:saving?"not-allowed":"pointer",marginTop:4}}>
            {saving?"Saving...":"Save & Accept Invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientShareView({ token }) {
  const [proj, setProj] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [lightbox, setLightbox] = useState(null); // {photos, startIndex}

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: projects, error: pErr } = await sb
        .from("projects")
        .select("*, areas(*)")
        .eq("share_token", token)
        .limit(1);
      if (pErr || !projects || projects.length === 0) {
        setError("This link is invalid or has been revoked.");
        setLoading(false);
        return;
      }
      const p = projects[0];
      setProj({
        id: p.id, name: p.name, clientName: p.client_name || "",
        address: p.address || "", projectNumber: p.project_number || "",
        template: p.template, clientLogoUrl: p.client_logo_url || null,
        createdAt: new Date(p.created_at).toLocaleDateString(),
      });
      const { data: itemData } = await sb
        .from("items")
        .select("*, photos(*)")
        .eq("project_id", p.id)
        .order("num");
      setItems((itemData || []).map(item => ({
        id: item.id, num: item.num, title: item.title,
        trade: item.trade || "", area: item.area || "",
        assignedTo: item.assigned_to || "", priority: item.priority || "Medium",
        status: item.status || "open", comments: item.comments || "",
        photos: (item.photos || []).sort((a, b) => a.sort_order - b.sort_order)
          .map(ph => ({ id: ph.id, path: ph.storage_path, url: photoUrl(ph.storage_path), isPrimary: ph.is_primary||false })),
      })));
      setLoading(false);
    };
    load();
  }, [token]);

  const stats = {
    open: items.filter(i => i.status === "open").length,
    pending: items.filter(i => i.status === "pending").length,
    accepted: items.filter(i => i.status === "accepted").length,
    total: items.length,
  };
  const pct = stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0;

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#F0F2F5",display:"flex",alignItems:"center",justifyContent:"center",gap:12,color:"#6B7280"}}>
      <Spinner size={24} color="#455A64"/><span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14}}>Loading punch list...</span>
    </div>
  );

  if (error) return (
    <div style={{minHeight:"100vh",background:"#F0F2F5",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{fontSize:18,fontWeight:700,color:"#111827",marginBottom:8}}>Link Not Found</div>
        <div style={{fontSize:14,color:"#6B7280"}}>{error}</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F0F2F5",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.startIndex||0} onClose={()=>setLightbox(null)}/>}

      {/* Header */}
      <div className="no-print" style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 20px",display:"flex",alignItems:"center",height:60}}>
        <div style={{display:"flex",alignItems:"center",gap:9,flex:1}}>
          <div style={{width:34,height:34,borderRadius:10,overflow:"hidden",boxShadow:"0 2px 6px rgba(180,120,60,0.3)"}}>
            <img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div>
            <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:16,color:"#111827",letterSpacing:"0.2em",lineHeight:1}}>KAOS</div>
            <div style={{fontSize:8,color:"#9CA3AF",letterSpacing:"0.12em",textTransform:"uppercase"}}>PunchList Pro</div>
          </div>
        </div>
        <button onClick={()=>window.print()} style={{padding:"8px 16px",borderRadius:8,background:D.redBg,color:D.red,border:"1px solid rgba(248,81,73,0.3)",fontWeight:600,fontSize:13,cursor:"pointer"}}>🖨 Print / Save PDF</button>
      </div>

      <div style={{maxWidth:800,margin:"0 auto",padding:"24px 16px 60px"}}>
        {/* Project header */}
        <div style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid #E5E7EB",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:16}}>
            {proj.clientLogoUrl && (
              <div style={{width:72,height:72,borderRadius:10,overflow:"hidden",background:"#fff",border:"1px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <img src={proj.clientLogoUrl} alt="Client Logo" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",padding:4}}/>
              </div>
            )}
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:"#455A64",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Punch List</div>
              <div style={{fontSize:24,fontWeight:800,color:"#111827"}}>{proj.name}</div>
              {proj.clientName && <div style={{fontSize:13,color:"#6B7280",marginTop:3}}>Client: {proj.clientName}</div>}
              {proj.address && <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>{proj.address}</div>}
              {proj.projectNumber && <div style={{fontSize:12,color:"#9CA3AF"}}>Project #: {proj.projectNumber}</div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:11,color:"#9CA3AF"}}>Generated {new Date().toLocaleDateString()}</div>
              <div style={{fontSize:11,color:"#9CA3AF",marginTop:2}}>Kaos Design Werks, LLC</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[["Open",stats.open,"#DC2626","#FEF2F2"],["Pending",stats.pending,"#D97706","#FFFBEB"],["Accepted",stats.accepted,"#059669","#ECFDF5"],["Total",stats.total,"#111827","#F9FAFB"]].map(([l,v,col,bg])=>(
              <div key={l} style={{textAlign:"center",padding:"12px 8px",background:bg,borderRadius:10,border:"1px solid #E5E7EB"}}>
                <div style={{fontSize:26,fontWeight:800,color:col}}>{v}</div>
                <div style={{fontSize:10,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div style={{marginTop:12}}>
              <div style={{height:6,background:"#E5E7EB",borderRadius:100,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#059669,#34D399)",borderRadius:100,transition:"width 0.5s"}}/>
              </div>
              <div style={{fontSize:11,color:"#9CA3AF",marginTop:4,textAlign:"right"}}>{pct}% complete</div>
            </div>
          )}
        </div>

        {/* Punch items */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {items.map(item => {
            const isExp = expanded[item.id];
            const sColor = item.status==="accepted"?"#059669":item.status==="pending"?"#D97706":"#DC2626";
            const sBg    = item.status==="accepted"?"#ECFDF5":item.status==="pending"?"#FFFBEB":"#FEF2F2";
            const pColor = item.priority==="Critical"?"#7C3AED":item.priority==="High"?"#DC2626":item.priority==="Low"?"#059669":"#D97706";
            const pBg    = item.priority==="Critical"?"#F5F3FF":item.priority==="High"?"#FEF2F2":item.priority==="Low"?"#ECFDF5":"#FFFBEB";
            const firstPhoto = (item.photos||[]).filter(Boolean).find(p=>p.isPrimary)||(item.photos||[]).filter(Boolean)[0];
            return (
              <div key={item.id} style={{background:"#fff",borderRadius:14,border:"1px solid #E5E7EB",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                {/* Summary row — always visible */}
                <div onClick={()=>setExpanded(p=>({...p,[item.id]:!p[item.id]}))}
                  style={{display:"flex",cursor:"pointer",userSelect:"none"}}>
                  {/* Thumbnail */}
                  <div style={{width:80,height:80,flexShrink:0,background:"#F9FAFB",borderRight:"1px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                    {firstPhoto
                      ? <img src={firstPhoto.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onClick={e=>{e.stopPropagation();setLightbox({photos:item.photos,startIndex:0});}}/>
                      : <span style={{fontSize:20}}>📷</span>
                    }
                  </div>
                  <div style={{flex:1,padding:"10px 14px",minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:800,color:"#455A64"}}>#{item.num}</span>
                      <span style={{padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:700,background:sBg,color:sColor}}>{STATUS_CFG[item.status]?.label}</span>
                      <span style={{padding:"2px 8px",borderRadius:100,fontSize:10,fontWeight:700,background:pBg,color:pColor}}>{item.priority}</span>
                      {item.area && <span style={{fontSize:10,color:"#9CA3AF"}}>📍 {item.area}</span>}
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827",lineHeight:1.4}}>{item.title}</div>
                    {item.trade && <div style={{fontSize:11,color:"#9CA3AF",marginTop:3}}>🔧 {item.trade}</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",padding:"0 14px",color:"#9CA3AF",fontSize:18}}>
                    {isExp ? "▲" : "▼"}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExp && (
                  <div style={{borderTop:"1px solid #E5E7EB",padding:"14px 16px",background:"#F9FAFB"}}>
                    {item.assignedTo && (
                      <div style={{fontSize:12,color:"#6B7280",marginBottom:8}}>👤 Assigned to: <strong>{item.assignedTo}</strong></div>
                    )}
                    {item.comments && (
                      <div style={{fontSize:13,color:"#374151",background:"#fff",padding:"10px 14px",borderRadius:8,border:"1px solid #E5E7EB",marginBottom:12,lineHeight:1.6}}>
                        💬 {item.comments}
                      </div>
                    )}
                    {(()=>{
                      const photos=(item.photos||[]).filter(Boolean);
                      const primary=photos.find(p=>p.isPrimary)||photos[0];
                      const secondaries=photos.filter(p=>p!==primary);
                      if(!secondaries.length)return null;
                      return(
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {secondaries.map((ph,i)=>(
                            <img key={i} src={ph.url} alt="" onClick={()=>setLightbox({photos,startIndex:photos.indexOf(ph)})}
                              style={{width:90,height:90,objectFit:"cover",borderRadius:8,cursor:"pointer",border:"1px solid #E5E7EB",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}/>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Print footer */}
      <div style={{display:"none"}} className="print-only">
        <div style={{textAlign:"center",fontSize:10,color:"#9CA3AF",marginTop:24}}>
          Generated by KAOS PunchList Pro — Kaos Design Werks, LLC — {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SPLASH
═══════════════════════════════════════════════════════ */
function Splash({onDone}){
  const [phase,setPhase]=useState(0);
  useEffect(()=>{const t1=setTimeout(()=>setPhase(1),900);const t2=setTimeout(()=>setPhase(2),1900);return()=>{clearTimeout(t1);clearTimeout(t2);};},[]);
  return(<div onClick={()=>phase>=2&&onDone()} style={{position:"fixed",inset:0,background:"#0A0A0A",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:phase>=2?"pointer":"default",userSelect:"none"}}>
    <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:100,fontSize:"clamp(52px,14vw,92px)",color:"#fff",letterSpacing:"0.35em",textTransform:"uppercase",animation:"logoIn 1.4s cubic-bezier(0.16,1,0.3,1) forwards",opacity:0}}>KAOS</div>
    {phase>=1&&<div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:300,fontSize:10,color:"rgba(255,255,255,0.28)",letterSpacing:"0.28em",textTransform:"uppercase",marginTop:14,animation:"fadeUp 0.8s ease forwards",opacity:0}}>Design Werks</div>}
    {phase>=2&&<div style={{position:"absolute",bottom:52,fontSize:10,color:"rgba(255,255,255,0.18)",letterSpacing:"0.2em",textTransform:"uppercase",animation:"fadeIn 1s ease forwards",opacity:0}}>Tap to continue</div>}
  </div>);
}

/* ── AUTH FIELD COMPONENTS — top-level so they NEVER remount on keystroke ── */
function PwInput({ value, onChange, placeholder, show, onToggle, onEnter, autoComplete, name }) {
  return (
    <div style={{position:"relative"}}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        name={name||"password"}
        placeholder={placeholder||"••••••••"}
        type={show ? "text" : "password"}
        style={{...dInp(), paddingRight:48}}
        autoComplete={autoComplete||"current-password"}
        autoCorrect="off" autoCapitalize="none" spellCheck="false"
        onKeyDown={e => e.key==="Enter" && onEnter && onEnter()}
      />
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={onToggle}
        style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#6B7280",display:"flex",padding:6,zIndex:2}}>
        {show ? <EyeOff size={20}/> : <Eye size={20}/>}
      </button>
    </div>
  );
}
function AuthFieldLabel({ children }) {
  return <div style={{fontSize:11,fontWeight:600,color:D.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{children}</div>;
}
function AuthSubmitBtn({ children, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{width:"100%",padding:15,borderRadius:12,border:"none",background:loading?D.bg3:D.ac,color:loading?D.t3:"#fff",fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",letterSpacing:"0.04em",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {loading && <Spinner size={18} color="#fff"/>}
      {loading ? "Please wait..." : children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   AUTH — Supabase powered — fully controlled inputs
   (all field values in React state so eye-toggle never
   triggers a DOM reset / data loss)
═══════════════════════════════════════════════════════ */
function Auth(){
  const [mode,    setMode]    = useState("login");
  const [showPw,  setShowPw]  = useState(false);
  const [showCo,  setShowCo]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── Controlled field state — values survive any re-render ── */
  const [log,  setLog]  = useState({ email:"", password:"" });
  const [reg,  setReg]  = useState({ name:"", company:"", email:"", password:"", confirm:"" });
  const [fgt,  setFgt]  = useState({ email:"" });

  const lf = (k,v) => { setLog(p=>({...p,[k]:v}));  setError(""); };
  const rf = (k,v) => { setReg(p=>({...p,[k]:v}));  setError(""); };
  const ff = (k,v) => { setFgt(p=>({...p,[k]:v}));  setError(""); };

  const switchMode = m => { setMode(m); setError(""); setSuccess(""); };

  const handleLogin = async () => {
    if(!log.email.trim()) return setError("Email is required.");
    if(!log.password)     return setError("Password is required.");
    setLoading(true);
    const { error:err } = await sb.auth.signInWithPassword({ email:log.email.trim(), password:log.password });
    setLoading(false);
    if(err) return setError(err.message.includes("Invalid")||err.message.includes("credentials") ? "Incorrect email or password." : err.message);
  };

  const handleRegister = async () => {
    if(!reg.name.trim())           return setError("Name is required.");
    if(!reg.email.trim())          return setError("Email is required.");
    if(reg.password.length < 6)    return setError("Password must be at least 6 characters.");
    if(reg.password !== reg.confirm) return setError("Passwords do not match.");
    setLoading(true);
    const { error:err } = await sb.auth.signUp({ email:reg.email.trim(), password:reg.password, options:{ data:{ name:reg.name.trim(), company:reg.company.trim() } } });
    setLoading(false);
    if(err) return setError(err.message);
    setSuccess("Account created! Logging you in...");
    await sb.auth.signInWithPassword({ email:reg.email.trim(), password:reg.password });
  };

  const handleForgot = async () => {
    if(!fgt.email.trim()) return setError("Email is required.");
    setLoading(true);
    try {
      const { error:err } = await sb.auth.resetPasswordForEmail(fgt.email.trim(), {
        redirectTo: window.location.origin + "/?reset=true"
      });
      setLoading(false);
      if(err) return setError(
        err.message.toLowerCase().includes("fetch") || err.message.toLowerCase().includes("load") || err.message.toLowerCase().includes("network")
          ? "Network error — check your connection and try again."
          : err.message
      );
      setSuccess("Reset link sent! Check your email and spam folder.");
    } catch(e) {
      setLoading(false);
      setError("Network error — check your connection and try again.");
    }
  };


  const handleGoogleSignIn = async () => {
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(error.message);
  };

  return (
    <div style={{minHeight:"100vh",background:"#0A0A0A",display:"flex",flexDirection:"column"}}>
      {/* Logo */}
      <div style={{padding:"40px 0 28px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{width:72,height:72,borderRadius:18,overflow:"hidden",marginBottom:16,boxShadow:"0 4px 20px rgba(180,120,60,0.4)"}}>
          <img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>
        <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:100,fontSize:34,color:"#fff",letterSpacing:"0.35em",textTransform:"uppercase"}}>KAOS</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.22)",letterSpacing:"0.24em",textTransform:"uppercase",marginTop:8,fontWeight:300}}>Design Werks</div>
      </div>

      {/* Card */}
      <div style={{flex:1,margin:"0 20px 36px",background:"#141414",borderRadius:20,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.7)",animation:"slideUp 0.4s ease"}}>

        {/* Tab bar */}
        {mode !== "forgot" && (
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 24px"}}>
            {[["Log In","login"],["Register","register"]].map(([label,key]) => (
              <button key={key} onClick={() => switchMode(key)}
                style={{flex:1,padding:"14px 0",fontSize:13,fontWeight:700,border:"none",background:"none",cursor:"pointer",color:mode===key?"#fff":"rgba(255,255,255,0.28)",borderBottom:mode===key?"2px solid #fff":"2px solid transparent",letterSpacing:"0.05em",textTransform:"uppercase"}}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Forgot password header */}
        {mode === "forgot" && (
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
            <button onClick={() => switchMode("login")} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,display:"flex"}}><ArrowLeft size={20}/></button>
            <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Reset Password</div>
          </div>
        )}

        <div style={{padding:"28px 24px 32px",overflowY:"auto",maxHeight:"calc(100vh - 300px)"}}>

          {/* ── LOG IN ── */}
          {mode === "login" && (
            <div style={{animation:"fadeUp 0.3s ease",display:"flex",flexDirection:"column",gap:18}}>
              <button type="button" onClick={handleGoogleSignIn}
                style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-2.9-11.9-7.1l-6.6 5.1C9.5 39.6 16.3 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
                </svg>
                Continue with Google
              </button>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.1)"}}/>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"0.08em",textTransform:"uppercase"}}>or</span>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.1)"}}/>
              </div>
              <div>
                <AuthFieldLabel>Email</AuthFieldLabel>
                <input value={log.email} onChange={e=>lf("email",e.target.value.toLowerCase().trim())}
                  placeholder="you@example.com" type="email" name="email"
                  autoCapitalize="none" autoCorrect="off" autoComplete="email"
                  style={dInp()}/>
              </div>
              <div>
                <AuthFieldLabel>Password</AuthFieldLabel>
                <PwInput value={log.password} onChange={v=>lf("password",v)}
                  show={showPw} onToggle={()=>setShowPw(v=>!v)}
                  autoComplete="current-password" name="password"
                  onEnter={handleLogin}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div/>
                <button type="button" onClick={() => switchMode("forgot")}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#90A4AE",textDecoration:"underline",textUnderlineOffset:3,fontWeight:500}}>
                  Forgot password?
                </button>
              </div>
              {error   && <div style={{fontSize:12,color:D.red,  textAlign:"center"}}>{error}</div>}
              {success && <div style={{fontSize:13,color:D.green,textAlign:"center",fontWeight:600}}>✓ {success}</div>}
              <AuthSubmitBtn loading={loading} onClick={handleLogin}>Log In</AuthSubmitBtn>
              <div style={{textAlign:"center"}}>
                <button type="button" onClick={() => switchMode("register")}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.28)"}}>
                  No account? <span style={{color:"rgba(255,255,255,0.6)",fontWeight:600}}>Register</span>
                </button>
              </div>
            </div>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <div style={{animation:"fadeUp 0.3s ease",display:"flex",flexDirection:"column",gap:16}}>
                            {/* Google Sign In */}
              <button type="button" onClick={handleGoogleSignIn}
                style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-2.9-11.9-7.1l-6.6 5.1C9.5 39.6 16.3 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
                </svg>
                Continue with Google
              </button>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.1)"}}/>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"0.08em",textTransform:"uppercase"}}>or</span>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.1)"}}/>
              </div>
              <div>
                <AuthFieldLabel>Full Name</AuthFieldLabel>
                <input value={reg.name} onChange={e=>rf("name",e.target.value)}
                  placeholder="First & Last Name" name="name"
                  autoCorrect="off" spellCheck="false" autoComplete="name" style={dInp()}/>
              </div>
              <div>
                <AuthFieldLabel>Company</AuthFieldLabel>
                <input value={reg.company} onChange={e=>rf("company",e.target.value)}
                  placeholder="e.g. Kaos Design Werks" name="organization"
                  autoCorrect="off" autoComplete="organization" style={dInp()}/>
              </div>
              <div>
                <AuthFieldLabel>Email</AuthFieldLabel>
                <input value={reg.email} onChange={e=>rf("email",e.target.value)}
                  placeholder="you@example.com" type="email" name="email"
                  autoCapitalize="none" autoCorrect="off" autoComplete="email" style={dInp()}/>
              </div>
              <div>
                <AuthFieldLabel>Password</AuthFieldLabel>
                <PwInput value={reg.password} onChange={v=>rf("password",v)}
                  show={showPw} onToggle={()=>setShowPw(v=>!v)}
                  autoComplete="new-password" name="new-password"/>
              </div>
              <div>
                <AuthFieldLabel>Confirm Password</AuthFieldLabel>
                <PwInput value={reg.confirm} onChange={v=>rf("confirm",v)}
                  placeholder="Re-enter password"
                  show={showCo} onToggle={()=>setShowCo(v=>!v)}
                  autoComplete="new-password" name="confirm-password"
                  onEnter={handleRegister}/>
              </div>
              {error   && <div style={{fontSize:12,color:D.red,  textAlign:"center"}}>{error}</div>}
              {success && <div style={{fontSize:13,color:D.green,textAlign:"center",fontWeight:600}}>✓ {success}</div>}
              <AuthSubmitBtn loading={loading} onClick={handleRegister}>Create Account</AuthSubmitBtn>
              <div style={{textAlign:"center"}}>
                <button type="button" onClick={() => switchMode("login")}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.28)"}}>
                  Have an account? <span style={{color:"rgba(255,255,255,0.6)",fontWeight:600}}>Log In</span>
                </button>
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === "forgot" && (
            <div style={{animation:"fadeUp 0.3s ease",display:"flex",flexDirection:"column",gap:18}}>
              <div style={{padding:"12px 16px",background:D.acLL,borderRadius:10,border:`1px solid ${D.b3}`,fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.5}}>
                Enter your registered email. We'll send a reset link.
              </div>
              <div>
                <AuthFieldLabel>Email</AuthFieldLabel>
                <input value={fgt.email} onChange={e=>ff("email",e.target.value)}
                  placeholder="you@example.com" type="email" name="email"
                  autoCapitalize="none" autoCorrect="off" autoComplete="email" style={dInp()}
                  onKeyDown={e=>e.key==="Enter"&&handleForgot()}/>
              </div>
              {error   && <div style={{fontSize:12,color:D.red,  textAlign:"center"}}>{error}</div>}
              {success && <div style={{fontSize:13,color:D.green,textAlign:"center",fontWeight:600}}>✓ {success}</div>}
              <AuthSubmitBtn loading={loading} onClick={handleForgot}>Send Reset Link</AuthSubmitBtn>
            </div>
          )}

        </div>
      </div>
      <div style={{textAlign:"center",paddingBottom:28,fontSize:10,color:"rgba(255,255,255,0.1)",letterSpacing:"0.1em",textTransform:"uppercase"}}>
        Kaos Design Werks, LLC
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PASSWORD RESET — shown after clicking email link
═══════════════════════════════════════════════════════ */
function PasswordReset(){
  const [pw,setPw]=useState("");const [confirm,setConfirm]=useState("");
  const [showPw,setShowPw]=useState(false);const [error,setError]=useState("");const [loading,setLoading]=useState(false);const [done,setDone]=useState(false);
  const handleReset=async()=>{
    if(pw.length<6)return setError("Password must be at least 6 characters.");
    if(pw!==confirm)return setError("Passwords do not match.");
    setLoading(true);
    const{error:err}=await sb.auth.updateUser({password:pw});
    setLoading(false);
    if(err)return setError(err.message);
    setDone(true);
    setTimeout(()=>window.location.href="/",1500);
  };
  return(
    <div style={{minHeight:"100vh",background:"#0A0A0A",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:400,background:"#141414",borderRadius:20,padding:28,border:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{fontSize:18,fontWeight:800,color:D.t1,marginBottom:8}}>Set New Password</div>
        <div style={{fontSize:13,color:D.t3,marginBottom:24}}>Choose a new password for your account.</div>
        {done?<div style={{fontSize:15,color:D.green,fontWeight:600,textAlign:"center"}}>✓ Password updated! Redirecting...</div>:(<>
          <div style={{marginBottom:14}}>
            <AuthLabel>New Password</AuthLabel>
            <div style={{position:"relative"}}><input value={pw} onChange={e=>setPw(e.target.value)} type={showPw?"text":"password"} placeholder="Min. 6 characters" style={{...dInp(),paddingRight:48}}/><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#6B7280",display:"flex"}}>{showPw?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
          </div>
          <div style={{marginBottom:20}}>
            <AuthLabel>Confirm Password</AuthLabel>
            <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" placeholder="Re-enter password" style={dInp()} onKeyDown={e=>e.key==="Enter"&&handleReset()}/>
          </div>
          {error&&<div style={{fontSize:12,color:D.red,marginBottom:12,textAlign:"center"}}>{error}</div>}
          <button onClick={handleReset} disabled={loading} style={{width:"100%",padding:15,borderRadius:12,border:"none",background:D.ac,color:D.t1,fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{loading&&<Spinner size={18} color={D.t1}/>}{loading?"Updating...":"Update Password"}</button>
        </>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PROJECT WIZARD
═══════════════════════════════════════════════════════ */
function ProjectWizard({user,onCancel,onCreate}){
  const [step,setStep]=useState(1);
  const [info,setInfo]=useState({name:"",clientName:"",address:"",projectNumber:""});
  const [selectedTemplate,setSelectedTemplate]=useState(null);
  const [areas,setAreas]=useState([]);
  const [newAreaName,setNewAreaName]=useState("");
  const [editingAreaId,setEditingAreaId]=useState(null);
  const [editingAreaName,setEditingAreaName]=useState("");
  const [collapsedSections,setCollapsedSections]=useState({});
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  let _id=Date.now();const uid=()=>String(++_id);

  const chooseTemplate=templateName=>{
    setSelectedTemplate(templateName);
    const tmpl=TEMPLATES[templateName];
    const built=[];
    tmpl.sections.forEach(sec=>sec.areas.forEach(areaName=>built.push({id:uid(),name:areaName,section:sec.label,enabled:true})));
    setAreas(built);setStep(3);
  };
  const toggleArea=id=>setAreas(prev=>prev.map(a=>a.id===id?{...a,enabled:!a.enabled}:a));
  const startEdit=area=>{setEditingAreaId(area.id);setEditingAreaName(area.name);};
  const saveEdit=()=>{
    if(editingAreaName.trim())setAreas(prev=>prev.map(a=>a.id===editingAreaId?{...a,name:editingAreaName.trim()}:a));
    setEditingAreaId(null);setEditingAreaName("");
  };
  const addCustomArea=()=>{
    if(!newAreaName.trim())return;
    setAreas(prev=>[...prev,{id:uid(),name:newAreaName.trim(),section:"Custom",enabled:true}]);
    setNewAreaName("");
  };
  const removeArea=id=>setAreas(prev=>prev.filter(a=>a.id!==id));
  const toggleSection=sec=>setCollapsedSections(prev=>({...prev,[sec]:!prev[sec]}));
  const enabledCount=areas.filter(a=>a.enabled).length;
  const grouped=areas.reduce((acc,a)=>{if(!acc[a.section])acc[a.section]=[];acc[a.section].push(a);return acc;},{});

  const handleCreate=async()=>{
    setSaving(true);setError("");
    try{
      // Insert project
      const{data:proj,error:pErr}=await sb.from("projects").insert({
        user_id:user.id,name:info.name,client_name:info.clientName||null,
        address:info.address||null,project_number:info.projectNumber||null,template:selectedTemplate,
      }).select().single();
      if(pErr)throw pErr;

      // Insert areas
      const enabledAreas=areas.filter(a=>a.enabled);
      let insertedAreas=[];
      if(enabledAreas.length>0){
        const{data:aData,error:aErr}=await sb.from("areas").insert(
          enabledAreas.map((a,i)=>({project_id:proj.id,name:a.name,section:a.section,sort_order:i}))
        ).select();
        if(aErr)throw aErr;
        insertedAreas=aData||[];
      }

      onCreate({
        id:proj.id,name:proj.name,clientName:proj.client_name||"",
        address:proj.address||"",projectNumber:proj.project_number||"",
        template:proj.template,createdAt:new Date(proj.created_at).toLocaleDateString(),
        areas:insertedAreas.map(a=>({id:a.id,name:a.name,section:a.section,sort_order:a.sort_order})),
        items:[],
      });
    }catch(e){setError(e.message||"Failed to create project.");setSaving(false);}
  };

  return(
    <div style={{minHeight:"100vh",background:D.bg0,display:"flex",flexDirection:"column"}}>
      <div style={{background:D.bg0,borderBottom:`1px solid ${D.b1}`,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",height:56,padding:"0 16px",gap:12}}>
          <button onClick={()=>{
            if(step===1) onCancel();
            else if(step===2) setStep(1);
            else if(step===3) setStep(2);
            else if(step===4) setStep(3);
          }} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,display:"flex"}}><ArrowLeft size={20}/></button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:D.t1}}>New Project</div>
            <div style={{fontSize:11,color:D.t3}}>Step {step} of 4 — {step===1?"Project Info":step===2?"Choose Template":step===3?"Customize Areas":"Review & Create"}</div>
          </div>
        </div>
        <div style={{display:"flex",padding:"0 16px 12px",gap:6}}>
          {[1,2,3,4].map(n=><div key={n} style={{flex:1,height:3,borderRadius:100,background:n<=step?D.ac:D.bg3,transition:"background 0.3s"}}/>)}
        </div>
      </div>

      <div style={{flex:1,padding:"20px 16px 120px",maxWidth:600,margin:"0 auto",width:"100%"}}>
        {step===1&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:20,fontWeight:800,color:D.t1,marginBottom:6}}>Project Details</div>
            <div style={{fontSize:14,color:D.t3,marginBottom:24}}>Tell us about the project.</div>
            {[{k:"name",l:"Project Name *",ph:"e.g. North Italia — Nashville"},{k:"clientName",l:"Client / Restaurant Group",ph:"e.g. Fox Restaurant Concepts"},{k:"address",l:"Address",ph:"Street address or location"},{k:"projectNumber",l:"Project Number",ph:"e.g. KDW-2025-001"}].map(f=>(
              <div key={f.k} style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>{f.l}</label>
                <input value={info[f.k]} onChange={e=>setInfo(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={dInp()}/>
              </div>
            ))}
          </div>
        )}

        {step===2&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:20,fontWeight:800,color:D.t1,marginBottom:6}}>Choose a Template</div>
            <div style={{fontSize:14,color:D.t3,marginBottom:24}}>Pick the type that best matches your project.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {Object.entries(TEMPLATES).map(([name,tmpl])=>(
                <div key={name} onClick={()=>chooseTemplate(name)} style={{padding:"16px",borderRadius:14,border:`1.5px solid ${D.b2}`,background:D.bg2,cursor:"pointer",display:"flex",alignItems:"center",gap:14,transition:"all 0.15s"}}>
                  <div style={{fontSize:28,flexShrink:0}}>{tmpl.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:700,color:D.t1}}>{name}</div>
                    <div style={{fontSize:12,color:D.t3,marginTop:2}}>{tmpl.description}</div>
                    {tmpl.sections.length>0&&<div style={{fontSize:11,color:D.t3,marginTop:4}}>{tmpl.sections.reduce((a,s)=>a+s.areas.length,0)} areas · {tmpl.sections.length} sections</div>}
                  </div>
                  <ChevronRight size={18} color={D.t3}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {step===3&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:20,fontWeight:800,color:D.t1,marginBottom:4}}>Customize Areas</div>
            <div style={{fontSize:14,color:D.t3,marginBottom:6}}>Check areas that apply. Rename any. Add your own.</div>
            <div style={{fontSize:12,color:D.ac,fontWeight:600,marginBottom:20}}>{enabledCount} area{enabledCount!==1?"s":""} selected</div>
            <div style={{background:D.bg1,borderRadius:12,padding:"14px 16px",border:`1px solid ${D.b2}`,marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:D.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Add a Custom Area</div>
              <div style={{display:"flex",gap:8}}>
                <input value={newAreaName} onChange={e=>setNewAreaName(e.target.value)} placeholder="e.g. Rooftop Bar, Level 2 Dining..." style={{...dInp(),flex:1,padding:"10px 14px"}} onKeyDown={e=>e.key==="Enter"&&addCustomArea()}/>
                <button onClick={addCustomArea} disabled={!newAreaName.trim()} style={{padding:"10px 16px",borderRadius:10,background:newAreaName.trim()?D.ac:D.bg3,color:newAreaName.trim()?D.t1:D.t3,border:"none",fontWeight:700,fontSize:14,cursor:newAreaName.trim()?"pointer":"not-allowed",flexShrink:0}}>Add</button>
              </div>
            </div>
            {grouped["Custom"]&&grouped["Custom"].length>0&&(
              <div style={{marginBottom:16}}>
                <SecLabel>Custom Areas</SecLabel>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {grouped["Custom"].map(area=><AreaRow key={area.id} area={area} editingAreaId={editingAreaId} editingAreaName={editingAreaName} onToggle={toggleArea} onStartEdit={startEdit} onSaveEdit={saveEdit} onEditNameChange={setEditingAreaName} onRemove={removeArea}/>)}
                </div>
              </div>
            )}
            {Object.entries(grouped).filter(([sec])=>sec!=="Custom").map(([sec,secAreas])=>(
              <div key={sec} style={{marginBottom:16}}>
                <button onClick={()=>toggleSection(sec)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",cursor:"pointer",padding:"0 0 8px 0"}}>
                  <SecLabel>{sec}</SecLabel>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><span style={{fontSize:11,color:D.t3}}>{secAreas.filter(a=>a.enabled).length}/{secAreas.length}</span>{collapsedSections[sec]?<ChevronDown size={14} color={D.t3}/>:<ChevronUp size={14} color={D.t3}/>}</div>
                </button>
                {!collapsedSections[sec]&&(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {secAreas.map(area=><AreaRow key={area.id} area={area} editingAreaId={editingAreaId} editingAreaName={editingAreaName} onToggle={toggleArea} onStartEdit={startEdit} onSaveEdit={saveEdit} onEditNameChange={setEditingAreaName} onRemove={removeArea}/>)}
                  </div>
                )}
              </div>
            ))}
            {selectedTemplate==="Blank / Custom"&&areas.length===0&&<div style={{textAlign:"center",padding:"32px 20px",color:D.t3,fontSize:14}}>No areas yet — add your own above.</div>}
          </div>
        )}

        {step===4&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:20,fontWeight:800,color:D.t1,marginBottom:6}}>Review & Create</div>
            <div style={{fontSize:14,color:D.t3,marginBottom:20}}>Everything look right?</div>
            <div style={{background:D.bg1,borderRadius:14,padding:"18px 16px",border:`1px solid ${D.b1}`,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Project Info</div>
              <div style={{fontSize:16,fontWeight:700,color:D.t1,marginBottom:4}}>{info.name}</div>
              {info.clientName&&<div style={{fontSize:13,color:D.t2}}>{info.clientName}</div>}
              {info.address&&<div style={{fontSize:12,color:D.t3,marginTop:2}}>{info.address}</div>}
              {info.projectNumber&&<div style={{fontSize:12,color:D.t3}}>#{info.projectNumber}</div>}
              <div style={{marginTop:8,fontSize:12,color:D.ac,fontWeight:600}}>Template: {selectedTemplate}</div>
            </div>
            <div style={{background:D.bg1,borderRadius:14,padding:"18px 16px",border:`1px solid ${D.b1}`}}>
              <div style={{fontSize:11,fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>{enabledCount} Area{enabledCount!==1?"s":""} Selected</div>
              {Object.entries(areas.filter(a=>a.enabled).reduce((acc,a)=>{if(!acc[a.section])acc[a.section]=[];acc[a.section].push(a);return acc;},{})).map(([sec,secAreas])=>(
                <div key={sec} style={{marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:600,color:D.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{sec}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{secAreas.map(a=><span key={a.id} style={{fontSize:11,color:D.t2,background:D.bg2,padding:"3px 10px",borderRadius:100,border:`1px solid ${D.b1}`}}>{a.name}</span>)}</div>
                </div>
              ))}
              {enabledCount===0&&<div style={{fontSize:13,color:D.t3}}>No areas — you can add them after creating.</div>}
            </div>
            {error&&<div style={{marginTop:12,fontSize:12,color:D.red,textAlign:"center"}}>{error}</div>}
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:D.bg1,borderTop:`1px solid ${D.b1}`,padding:"14px 16px"}}>
        <div style={{maxWidth:600,margin:"0 auto",display:"flex",gap:10}}>
          {step>1&&<button onClick={()=>step===3?setStep(2):setStep(s=>s-1)} style={{padding:"12px 20px",borderRadius:10,background:D.bg2,border:`1px solid ${D.b2}`,color:D.t2,fontWeight:600,fontSize:14,cursor:"pointer"}}>Back</button>}
          {step===1&&<button onClick={()=>info.name.trim()&&setStep(2)} disabled={!info.name.trim()} style={{flex:1,padding:"13px",borderRadius:10,background:info.name.trim()?D.ac:D.bg3,color:info.name.trim()?D.t1:D.t3,fontWeight:700,fontSize:14,border:"none",cursor:info.name.trim()?"pointer":"not-allowed"}}>Next: Choose Template →</button>}
          {step===3&&<button onClick={()=>setStep(4)} style={{flex:1,padding:"13px",borderRadius:10,background:D.ac,color:D.t1,fontWeight:700,fontSize:14,border:"none",cursor:"pointer"}}>Next: Review →</button>}
          {step===4&&<button onClick={handleCreate} disabled={saving} style={{flex:1,padding:"13px",borderRadius:10,background:saving?D.bg3:D.green,color:D.t1,fontWeight:700,fontSize:14,border:"none",cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{saving&&<Spinner size={18} color={D.t1}/>}{saving?"Creating...":"✓ Create Project"}</button>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════ */
function MainApp({user,onLogout}){
  const [projects,setProjects]=useState([]);
  const [projItems,setProjItems]=useState([]);
  const [projId,setProjId]=useState(null);
  const [loading,setLoading]=useState(true);
  const [itemsLoading,setItemsLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [view,setView]=useState("dashboard");
  const [tab,setTab]=useState("issues");
  const [dashTab,setDashTab]=useState("projects");
  const [editId,setEditId]=useState(null);
  const [fStatus,setFStatus]=useState("all");
  const [fTrade,setFTrade]=useState("all");
  const [fArea,setFArea]=useState("all");
  const [search,setSearch]=useState("");
  const [confirm,setConfirm]=useState(null);
  const [multiMode,setMultiMode]=useState(false);
  const [sessionItems,setSessionItems]=useState([]);
  const [customShareMsg,setCustomShareMsg]=useState("");
  const [previewListType,setPreviewListType]=useState("punch");
  const [previewStatus,setPreviewStatus]=useState("all");
  const [lightbox,setLightbox]=useState(null);
  const [form,setForm]=useState({title:"",trade:"",area:"",assignedTo:"",priority:"Medium",comments:"",photos:[],status:"open"});
  const [deletedPhotos,setDeletedPhotos]=useState([]); // {id,path} to delete on save
  const [newAreaName,setNewAreaName]=useState("");
  const [editingAreaId,setEditingAreaId]=useState(null);
  const [editingAreaName,setEditingAreaName]=useState("");
  const [companyProfile,setCompanyProfile]=useState(null);

  let _id=Date.now();const uid=()=>String(++_id);

  // Load projects on mount
  useEffect(()=>{
    loadProjects();
    // Load company profile
    sb.from("company_profile").select("*").eq("user_id",user.id).maybeSingle().then(({data})=>{
      if(data)setCompanyProfile(data);
    });
  },[]);

  // Handle browser back button / swipe — navigate within app, never leave
  useEffect(()=>{
    const handleBack=()=>{
      if(view==="itemForm"){setView("project");setTab("issues");}
      else if(view==="multiAdd"){
        loadProjectItems(projId); // reload DB on back too
        setView("project");setTab("issues");
        // Don't clear sessionItems — user might return to multi add
      }
      else if(view==="project"){setView("dashboard");}
      else if(view==="wizard"){setView("dashboard");}
      else if(view==="print"){setView("project");}
      // dashboard: stay in app, do nothing
    };
    window.addEventListener("appback",handleBack);
    return()=>window.removeEventListener("appback",handleBack);
  },[view]);

  const loadProjects=async()=>{
    setLoading(true);
    const{data,error}=await sb.from("projects").select("*, areas(*)").eq("user_id",user.id).order("created_at",{ascending:false});
    if(!error){
      setProjects((data||[]).map(p=>({
        id:p.id,name:p.name,clientName:p.client_name||"",address:p.address||"",
        projectNumber:p.project_number||"",template:p.template,
        createdAt:new Date(p.created_at).toLocaleDateString(),
        areas:(p.areas||[]).sort((a,b)=>a.sort_order-b.sort_order).map(a=>({id:a.id,name:a.name,section:a.section,sort_order:a.sort_order})),
        clientLogoUrl:p.client_logo_url||null,
        shareToken:p.share_token||null,
        smsAddedMessage:p.sms_added_message||"",smsAcceptedMessage:p.sms_accepted_message||"",
        items:[],
      })));
    }
    setLoading(false);
  };

  const loadProjectItems=async(projectId)=>{
    setItemsLoading(true);
    const{data,error}=await sb.from("items").select("*, photos(*)").eq("project_id",projectId).order("num");
    if(!error){
      setProjItems((data||[]).map(item=>({
        id:item.id,num:item.num,title:item.title,trade:item.trade||"",
        area:item.area||"",assignedTo:item.assigned_to||"",priority:item.priority||"Medium",
        status:item.status||"open",comments:item.comments||"",list_type:item.list_type||"punch",
        photos:(item.photos||[]).sort((a,b)=>a.sort_order-b.sort_order).map(p=>({id:p.id,path:p.storage_path,url:photoUrl(p.storage_path),isPrimary:p.is_primary||false})),
      })));
    }
    setItemsLoading(false);
  };

  const proj=projects.find(p=>p.id===projId);
  const projAreas=proj?.areas||[];
  const usedTrades=[...new Set(projItems.map(i=>i.trade).filter(Boolean))];
  const usedAreas=[...new Set(projItems.map(i=>i.area).filter(Boolean))];
  // Derive list type from active tab — must be before filtered
  const listType=tab==="completion"?"completion":"punch";
  // Filter by list type AND status/trade/area
  const filtered=projItems
    .filter(i=>(i.list_type||"punch")===listType)
    .filter(i=>fStatus==="all"||i.status===fStatus)
    .filter(i=>fTrade==="all"||i.trade===fTrade)
    .filter(i=>fArea==="all"||i.area===fArea);
  const listItems=projItems.filter(i=>(i.list_type||"punch")===listType);
  const stats={open:listItems.filter(i=>i.status==="open").length,pending:listItems.filter(i=>i.status==="pending").length,accepted:listItems.filter(i=>i.status==="accepted").length,total:listItems.length};
  const pct=stats.total>0?Math.round((stats.accepted/stats.total)*100):0;
  // Preview tab has its own List/Status toggle, independent of the main issues/completion tab
  const previewListItems=projItems.filter(i=>(i.list_type||"punch")===previewListType);
  const previewItems=previewListItems.filter(i=>previewStatus==="all"||i.status===previewStatus);
  const previewStats={open:previewListItems.filter(i=>i.status==="open").length,pending:previewListItems.filter(i=>i.status==="pending").length,accepted:previewListItems.filter(i=>i.status==="accepted").length,total:previewListItems.length};
  const filteredProjects=projects.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.clientName||"").toLowerCase().includes(search.toLowerCase()));

  const handleCreate=proj=>{setProjects(prev=>[proj,...prev]);setDashTab("projects");setView("dashboard");};

  const openProject=async(pid)=>{
    setProjId(pid);setTab("issues");setFStatus("all");setFTrade("all");setFArea("all");
    setView("project");setProjItems([]);
    await loadProjectItems(pid);
  };

  const openAdd=multi=>{
    setForm({title:"",trade:"",area:"",assignedTo:"",priority:"Medium",comments:"",photos:[],status:"open"});
    setDeletedPhotos([]);setEditId(null);setMultiMode(multi||false);setView("itemForm");
  };
  const openEdit=(item,e)=>{
    if(e)e.stopPropagation();
    setForm({title:item.title,trade:item.trade,area:item.area,assignedTo:item.assignedTo,priority:item.priority||"Medium",comments:item.comments||"",photos:(item.photos||[]).map(p=>p?{...p}:p),status:item.status});
    setDeletedPhotos([]);setEditId(item.id);setMultiMode(false);setView("itemForm");
  };

  const saveItem=async()=>{
    if(!form.title.trim())return;
    setSaving(true);
    try{
      // Upload any new photos (those with file property)
      const uploadedPhotos=await Promise.all(
        form.photos.map(async(p,i)=>{
          if(!p)return null;
          if(p.id)return p; // existing
          if(p.file){
            const{path,url}=await uploadPhoto(p.file,user.id);
            return{path,url,sortOrder:i,isPrimary:p.isPrimary||false};
          }
          return p;
        })
      );
      const finalPhotos=uploadedPhotos.filter(Boolean);

      // Delete removed existing photos
      await Promise.all(deletedPhotos.map(async dp=>{
        await sb.from("photos").delete().eq("id",dp.id);
        await deletePhotoFile(dp.path);
      }));

      const itemData={project_id:projId,title:form.title,trade:form.trade||null,area:form.area||null,assigned_to:form.assignedTo||null,priority:form.priority,status:form.status,comments:form.comments||null,list_type:listType};

      if(editId){
        // Update existing item
        await sb.from("items").update(itemData).eq("id",editId);
        // Add new photos
        const newPhotos=finalPhotos.filter(p=>!p.id&&p.path); // use p.path not p.file — file gone after upload
        if(newPhotos.length>0){
          await sb.from("photos").insert(newPhotos.map((p,i)=>({item_id:editId,storage_path:p.path,sort_order:p.sortOrder??i,is_primary:p.isPrimary||false})));
        }
        // Update local state
        const updatedItem={id:editId,num:projItems.find(i=>i.id===editId)?.num,title:form.title,trade:form.trade,area:form.area,assignedTo:form.assignedTo,priority:form.priority,status:form.status,comments:form.comments,list_type:listType,photos:finalPhotos.map(p=>({id:p.id,path:p.path,url:p.url,isPrimary:p.isPrimary||false}))};
        setProjItems(prev=>prev.map(i=>i.id===editId?updatedItem:i));
      }else{
        // Create new item
        // Use max of local state AND DB to guarantee no duplicates
        const localMax=projItems.filter(i=>(i.list_type||"punch")===listType).reduce((m,i)=>Math.max(m,i.num||0),0);
        const{data:existingNums}=await sb.from("items").select("num").eq("project_id",projId).eq("list_type",listType).order("num",{ascending:false}).limit(1);
        const dbMax=existingNums?.[0]?.num||0;
        const num=Math.max(localMax,dbMax)+1;
        const{data:newItem,error:iErr}=await sb.from("items").insert({...itemData,num}).select().single();
        if(iErr)throw iErr;
        // Add photos
        if(finalPhotos.length>0){
          await sb.from("photos").insert(finalPhotos.map((p,i)=>({item_id:newItem.id,storage_path:p.path,sort_order:i,is_primary:p.isPrimary||false})));
        }
        const createdItem={id:newItem.id,num,title:form.title,trade:form.trade,area:form.area,assignedTo:form.assignedTo,priority:form.priority,status:"open",comments:form.comments,list_type:listType,photos:finalPhotos.map(p=>({path:p.path,url:p.url}))};
        setProjItems(prev=>[...prev,createdItem]);
        sendSmsNotification(projId,form.title,"added");
      }

      if(multiMode){
        setForm({title:"",trade:"",area:"",assignedTo:"",priority:"Medium",comments:"",photos:[],status:"open"});
        setDeletedPhotos([]);
      }else{setView("project");setTab("issues");}
    }catch(e){alert("Save failed: "+e.message);}
    setSaving(false);
  };

  const doDelete=async()=>{
    if(!confirm)return;
    if(confirm.type==="item"){
      // Delete photos from storage first
      const item=projItems.find(i=>i.id===confirm.id);
      if(item){await Promise.all((item.photos||[]).map(p=>deletePhotoFile(p.path)));}
      await sb.from("items").delete().eq("id",confirm.id);
      setProjItems(prev=>prev.filter(i=>i.id!==confirm.id));
      setView("project");setTab("issues");
    }else{
      await sb.from("projects").delete().eq("id",confirm.id);
      setProjects(prev=>prev.filter(p=>p.id!==confirm.id));
      setView("dashboard");
    }
    setConfirm(null);
  };

  const cycleStatus=async(itemId,e)=>{
    e.stopPropagation();
    const item=projItems.find(i=>i.id===itemId);
    if(!item)return;
    const newStatus=STATUS_CYCLE[item.status];
    // Optimistic update
    setProjItems(prev=>prev.map(i=>i.id===itemId?{...i,status:newStatus}:i));
    await sb.from("items").update({status:newStatus}).eq("id",itemId);
    if(newStatus==="accepted") sendSmsNotification(projId,item.title,"accepted");
    // When reopened from accepted — switch back to all so it's visible
    if(newStatus==="open" && item.status==="accepted") setFStatus("all");
  };

  const addPhoto=(photo,idx)=>setForm(f=>{const photos=[...f.photos];photos[idx]=photo;return{...f,photos};});
  const setPrimaryPhoto=async(idx)=>{
    const updated=form.photos.map((p,i)=>p?{...p,isPrimary:i===idx}:p);
    setForm(f=>({...f,photos:updated}));
    // Update projItems so thumbnail in issues list changes immediately
    if(editId){
      setProjItems(prev=>prev.map(item=>item.id!==editId?item:{
        ...item,
        photos:item.photos.map((p,i)=>p?{...p,isPrimary:i===idx}:p)
      }));
    }
    // Persist to DB
    for(let i=0;i<updated.length;i++){
      const p=updated[i];
      if(p?.id){await sb.from("photos").update({is_primary:i===idx}).eq("id",p.id);}
    }
  };
  const removePhoto=idx=>{
    const photo=form.photos[idx];
    if(photo?.id)setDeletedPhotos(prev=>[...prev,{id:photo.id,path:photo.path}]);
    setForm(f=>({...f,photos:f.photos.filter((_,i)=>i!==idx)}));
  };

  const exportCSV=()=>{
    if(!proj)return;
    const rows=[["#","Status","Priority","Trade","Area","Title","Assigned To","Comments"]];
    projItems.forEach(i=>rows.push([i.num,i.status,i.priority||"",i.trade||"",i.area||"",i.title||"",i.assignedTo||"",i.comments||""]));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`${proj.name}-punchlist.csv`;a.click();URL.revokeObjectURL(url);
  };

  // Area management (Supabase)
  const addAreaToProject=async()=>{
    if(!newAreaName.trim())return;
    const sortOrder=(proj?.areas||[]).length;
    const{data,error}=await sb.from("areas").insert({project_id:projId,name:newAreaName.trim(),section:"Custom",sort_order:sortOrder}).select().single();
    if(!error){
      setProjects(prev=>prev.map(p=>p.id!==projId?p:{...p,areas:[...(p.areas||[]),{id:data.id,name:data.name,section:data.section,sort_order:data.sort_order}]}));
      setNewAreaName("");
    }
  };
  const startEditArea=area=>{setEditingAreaId(area.id);setEditingAreaName(area.name);};
  const saveEditArea=async()=>{
    if(editingAreaName.trim()&&editingAreaId){
      await sb.from("areas").update({name:editingAreaName.trim()}).eq("id",editingAreaId);
      setProjects(prev=>prev.map(p=>p.id!==projId?p:{...p,areas:(p.areas||[]).map(a=>a.id===editingAreaId?{...a,name:editingAreaName.trim()}:a)}));
    }
    setEditingAreaId(null);setEditingAreaName("");
  };
  const removeAreaFromProject=async areaId=>{
    await sb.from("areas").delete().eq("id",areaId);
    setProjects(prev=>prev.map(p=>p.id!==projId?p:{...p,areas:(p.areas||[]).filter(a=>a.id!==areaId)}));
  };
  const updateProjectField=async(field,value)=>{
    const dbField={name:"name",clientName:"client_name",address:"address",projectNumber:"project_number",smsAddedMessage:"sms_added_message",smsAcceptedMessage:"sms_accepted_message"}[field];
    if(!dbField)return;
    await sb.from("projects").update({[dbField]:value||null}).eq("id",projId);
    setProjects(prev=>prev.map(p=>p.id!==projId?p:{...p,[field]:value}));
  };

  const DarkHeader=({title,subtitle,onBack,right})=>(
    <div style={{background:D.bg0,borderBottom:`1px solid ${D.b1}`,position:"sticky",top:0,zIndex:50}}>
      <div style={{position:"relative",display:"flex",alignItems:"center",height:60,padding:"0 20px"}}>
        {/* LEFT — KAOS branding pinned to far left — clickable → dashboard */}
        <div onClick={()=>setView("dashboard")} style={{display:"flex",alignItems:"center",gap:9,flexShrink:0,cursor:"pointer",zIndex:1}}>
          <div style={{width:34,height:34,borderRadius:10,overflow:"hidden",boxShadow:"0 2px 6px rgba(180,120,60,0.3)"}}>
            <img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div>
            <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:16,color:D.t1,letterSpacing:"0.2em",lineHeight:1}}>KAOS</div>
            <div style={{fontSize:8,color:D.t3,fontWeight:500,letterSpacing:"0.12em",textTransform:"uppercase"}}>PunchList Pro</div>
          </div>
        </div>
        {/* CENTER — back arrow + title, absolutely centered on the bar itself so it isn't skewed by unequal left/right column widths */}
        <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",display:"flex",alignItems:"center",gap:6,maxWidth:"calc(100% - 220px)"}}>
          {onBack&&<button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,display:"flex",flexShrink:0,padding:4,borderRadius:8}}><ArrowLeft size={18}/></button>}
          <div style={{textAlign:"center",minWidth:0,overflow:"hidden"}}>
            <div style={{fontSize:14,fontWeight:700,color:D.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</div>
            {subtitle&&<div style={{fontSize:10,color:D.t3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{subtitle}</div>}
          </div>
        </div>
        {/* RIGHT — action slot, pinned to far right */}
        <div style={{flexShrink:0,minWidth:34*2+9,marginLeft:"auto",zIndex:1}}>
          {right&&<div style={{display:"flex",justifyContent:"flex-end"}}>{right}</div>}
        </div>
      </div>
    </div>
  );
  const TabBar=({tabs,active,onTab})=>(
    <div style={{background:D.bg0,borderBottom:`1px solid ${D.b1}`,position:"sticky",top:60,zIndex:40}}>
      <div style={{display:"flex",maxWidth:720,margin:"0 auto",overflowX:"auto"}}>
        {tabs.map(t=><button key={t.key} onClick={()=>onTab(t.key)} style={{flex:1,padding:"10px 4px",fontSize:10,fontWeight:700,border:"none",background:"none",cursor:"pointer",color:active===t.key?D.t1:D.t3,borderBottom:active===t.key?`2px solid ${D.ac}`:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:3,letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap",minWidth:0}}>{t.icon&&<t.icon size={11}/>}{t.label}</button>)}
      </div>
    </div>
  );

  const PROJ_TABS=[{key:"general",label:"General",icon:Settings},{key:"issues",label:"Punch",icon:List},{key:"completion",label:"Completion",icon:CheckCircle2},{key:"preview",label:"Preview",icon:FileText},{key:"share",label:"Share",icon:Share2}];
  const DASH_TABS=[{key:"projects",label:"Projects",icon:Clipboard},{key:"cloud",label:"Cloud",icon:Cloud},{key:"settings",label:"Settings",icon:Settings}];

  if(view==="wizard")return<ProjectWizard user={user} onCancel={()=>setView("dashboard")} onCreate={handleCreate}/>;

  if(view==="print"&&proj)return(
    <>
      <div className="no-print" style={{padding:"12px 20px",background:D.bg0,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${D.b2}`}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,borderRadius:8,overflow:"hidden"}}><img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
          <div>
            <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:14,color:D.t1,letterSpacing:"0.2em",lineHeight:1}}>KAOS</div>
            <div style={{fontSize:8,color:D.t3,letterSpacing:"0.12em",textTransform:"uppercase"}}>PunchList Pro</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setView("project")} style={{padding:"8px 14px",borderRadius:8,background:D.bg2,border:`1px solid ${D.b2}`,color:D.t1,fontWeight:600,fontSize:13,cursor:"pointer"}}>← Back</button>
          <button onClick={()=>window.print()} style={{padding:"8px 14px",borderRadius:8,background:D.redBg,color:D.red,border:"1px solid rgba(248,81,73,0.3)",fontWeight:600,fontSize:13,cursor:"pointer"}}>Print / Save PDF</button>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @media print { .no-print { display:none !important; } body { background:#fff !important; } }
        body { font-family:'Plus Jakarta Sans',sans-serif !important; }
      `}</style>
      <div style={{padding:"36px",maxWidth:980,margin:"0 auto",color:"#111",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:18,borderBottom:"3px solid #455A64",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
            {proj.clientLogoUrl&&(
              <div style={{width:80,height:60,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#fff",borderRadius:8,border:"1px solid #E5E7EB",padding:4}}>
                <img src={proj.clientLogoUrl} alt="Client Logo" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
              </div>
            )}
            <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.14em",color:previewListType==="completion"?"#B8860B":"#455A64",textTransform:"uppercase",marginBottom:5}}>{previewListType==="completion"?"Completion List Report":"Punch List Report"}{previewStatus!=="all"?` — ${previewStatus.charAt(0).toUpperCase()+previewStatus.slice(1)} Items Only`:""}</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{proj.name}</div>
            {proj.clientName&&<div style={{fontSize:13,color:"#555",marginTop:3}}>Client: {proj.clientName}</div>}
            {proj.address&&<div style={{fontSize:13,color:"#555"}}>Address: {proj.address}</div>}
            {proj.projectNumber&&<div style={{fontSize:12,color:"#777"}}>Project #: {proj.projectNumber}</div>}
            {proj.template&&<div style={{fontSize:11,color:"#777",marginTop:2}}>Template: {proj.template}</div>}
            </div>
          </div>
          <div style={{textAlign:"right",fontSize:12,color:"#777"}}>
            {companyProfile?.logo_url&&(
              <div style={{width:80,height:48,marginLeft:"auto",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
                <img src={companyProfile.logo_url} alt="Company Logo" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
              </div>
            )}
            <div style={{fontSize:14,fontWeight:800,color:"#111",marginBottom:2}}>
              {companyProfile?.company_name||user?.user_metadata?.company||user?.user_metadata?.name||"Kaos Design Werks, LLC"}
            </div>
            {companyProfile?.address&&<div style={{fontSize:11,color:"#777"}}>{companyProfile.address}</div>}
            {companyProfile?.phone&&<div style={{fontSize:11,color:"#777"}}>{companyProfile.phone}</div>}
            <div style={{marginTop:4}}>Generated: {new Date().toLocaleDateString()}</div>
            <div style={{marginTop:10,display:"flex",gap:16}}>
              {[["Open",stats.open,"#F85149"],["Pending",stats.pending,"#D29922"],["Accepted",stats.accepted,"#3FB950"],["Total",stats.total,"#111"]].map(([l,v,col])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:800,color:col}}>{v}</div>
                  <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Items */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {projItems.filter(i=>(i.list_type||"punch")===previewListType&&(previewStatus==="all"||i.status===previewStatus)).map(item=>{
            const sColor = item.status==="accepted"?"#059669":item.status==="pending"?"#D97706":"#DC2626";
            const sBg    = item.status==="accepted"?"#ECFDF5":item.status==="pending"?"#FFFBEB":"#FEF2F2";
            const pColor = item.priority==="Critical"?"#7C3AED":item.priority==="High"?"#DC2626":item.priority==="Low"?"#059669":"#D97706";
            const pBg    = item.priority==="Critical"?"#F5F3FF":item.priority==="High"?"#FEF2F2":item.priority==="Low"?"#ECFDF5":"#FFFBEB";
            const photos=(item.photos||[]).filter(Boolean);
            const primary=photos.find(p=>p.isPrimary)||photos[0];
            const secondaries=photos.filter(p=>p!==primary);
            return(
              <div key={item.id} style={{border:"1px solid #E5E7EB",borderRadius:10,overflow:"hidden",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                {/* LINE 1+2+3: Full-width content header */}
                <div style={{padding:"12px 16px",borderBottom:photos.length?"1px solid #E5E7EB":"none"}}>
                  {/* Line 1: num, status, priority, area, trade, sub */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,fontWeight:800,color:"#455A64"}}>#{item.num}</span>
                    <span style={{padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:sBg,color:sColor}}>{item.status?.charAt(0).toUpperCase()+item.status?.slice(1)}</span>
                    <span style={{padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700,background:pBg,color:pColor}}>{item.priority||"Medium"}</span>
                    {item.area&&<span style={{fontSize:10,color:"#6B7280"}}>📍 {item.area}</span>}
                    {item.trade&&<span style={{fontSize:10,color:"#6B7280"}}>🔧 {item.trade}</span>}
                    {item.assignedTo&&<span style={{fontSize:10,color:"#6B7280"}}>👤 {item.assignedTo}</span>}
                  </div>
                  {/* Line 2: title */}
                  <div style={{fontSize:14,fontWeight:700,color:"#111",marginBottom:item.comments?5:0}}>{item.title}</div>
                  {/* Line 3: notes */}
                  {item.comments&&<div style={{fontSize:11,color:"#555",background:"#F9FAFB",padding:"5px 10px",borderRadius:6,border:"1px solid #F0F0F0"}}>💬 {item.comments}</div>}
                </div>
                {/* PHOTOS: Primary left, secondaries to the right, small gaps */}
                {photos.length>0&&(
                  <div style={{display:"flex",gap:6,padding:10,background:"#FAFAFA",flexWrap:"wrap"}}>
                    {/* Primary */}
                    {primary&&<img src={primary.url} alt="" style={{width:110,height:90,objectFit:"cover",borderRadius:6,border:"1px solid #E5E7EB",flexShrink:0}}/>}
                    {/* Secondaries */}
                    {secondaries.slice(0,4).map((ph,i)=>(
                      <img key={i} src={ph.url} alt="" style={{width:90,height:90,objectFit:"cover",borderRadius:6,border:"1px solid #E5E7EB",flexShrink:0}}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );


  // Subscription paywall — owner accounts always bypass
  if(!OWNER_IDS.includes(user.id)&&companyProfile!==null){
    const subStatus=getSubStatus(companyProfile);
    if(subStatus==="expired"){
      return<SubscriptionPaywall user={user} companyProfile={companyProfile}
        onSubscribe={async()=>{
          const res=await fetch(`${SUPA_URL}/functions/v1/create-checkout-session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,email:user.email})});
          const data=await res.json();
          if(data.url)window.location.href=data.url;
        }}
        onLogout={onLogout}
      />;
    }
  }

  if(view==="multiAdd"&&proj)return(
    <MultiAddView proj={proj} projAreas={projAreas} user={user} projId={projId}
      sessionItems={sessionItems} setSessionItems={setSessionItems}
      listType={listType}
      onDone={async(items)=>{
        // Batch save all session items to Supabase
        if(items&&items.length>0){
          const ltForSave=listType||"punch";
          const{data:existing}=await sb.from("items").select("num").eq("project_id",projId).eq("list_type",ltForSave).order("num",{ascending:false}).limit(1);
          const localMax=items.reduce((m,i)=>Math.max(m,i.num||0),0);
          let nextNum=Math.max((existing?.[0]?.num||0),localMax)+1;
          for(const item of [...items].reverse()){
            try{
              const{data:newItem,error:itemErr}=await sb.from("items").insert({
                project_id:projId,num:nextNum,title:item.title,
                area:item.area||null,status:"open",priority:item.priority||"Medium",
                trade:item.trade||null,assigned_to:item.assignedTo||null,
                comments:item.comments||null,
                list_type:item.list_type||listType||"punch",
              }).select().single();
              if(!itemErr&&newItem){
                // Upload photo if exists
                const photo=item.photos?.[0];
                if(photo?.file){
                  try{
                    const{path,url}=await uploadPhoto(photo.file,user.id);
                    await sb.from("photos").insert({item_id:newItem.id,storage_path:path,sort_order:0,is_primary:photo.isPrimary||false});
                  }catch(photoErr){
                    console.error("Photo upload failed for item:",newItem.id,photoErr.message);
                  }
                }
                sendSmsNotification(projId,item.title,"added");
                nextNum++;
              }
            }catch(e){console.error("Failed to save item:",e);}
          }
        }
        setSessionItems([]);
        await loadProjectItems(projId);
        setView("project");
        setTab(listType==="completion"?"completion":"issues");
      }}
    />
  );
  if(view==="itemForm")return(
    <div style={{minHeight:"100vh",background:D.bg0}}>
      <Confirm item={confirm} onConfirm={doDelete} onCancel={()=>setConfirm(null)}/>
      <DarkHeader title={multiMode?"Add Multi":editId?"Edit Item":"New Punch Item"} subtitle={multiMode?`${projItems.length} items so far`:undefined} onBack={()=>{setView("project");setTab("issues");}}
        right={<div style={{display:"flex",gap:8}}>
          {editId&&<button onClick={()=>setConfirm({type:"item",id:editId,label:form.title.slice(0,40)||"this item"})} style={{padding:"7px 12px",borderRadius:8,background:D.redBg,border:"1px solid rgba(248,81,73,0.3)",color:D.red,fontWeight:600,fontSize:12,cursor:"pointer"}}>Delete</button>}
          {multiMode&&<button onClick={()=>{setView("project");setTab("issues");}} style={{padding:"7px 12px",borderRadius:8,background:D.bg2,border:`1px solid ${D.b2}`,color:D.t2,fontWeight:600,fontSize:12,cursor:"pointer"}}>Done</button>}
        </div>}
      />
      <div style={{padding:"20px 16px 120px",maxWidth:600,margin:"0 auto"}}>
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Issue Title *</label>
          <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Describe the deficiency or required work..." style={{...dInp(),fontSize:15}} autoFocus/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:10,letterSpacing:"0.08em",textTransform:"uppercase"}}>Photos (up to 5) · Tap ★ to set primary thumbnail</label>
          <PhotoGrid photos={form.photos} onAdd={addPhoto} onRemove={removePhoto} onSetPrimary={setPrimaryPhoto}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Trade</label>
            {(!MASTER_TRADES.filter(t=>t!=="Other").includes(form.trade)&&form.trade!=""&&form.trade!="Other")?(
              <div style={{display:"flex",gap:6}}>
                <input value={form.trade} onChange={e=>setForm(f=>({...f,trade:e.target.value}))} placeholder="Type custom trade..." style={{...dInp(),flex:1}} autoFocus/>
                <button onClick={()=>setForm(f=>({...f,trade:""}))} style={{padding:"0 10px",borderRadius:10,background:D.bg2,border:`1px solid ${D.b2}`,color:D.t3,cursor:"pointer",fontSize:16}}>↩</button>
              </div>
            ):(
              <select value={form.trade||""} onChange={e=>{if(e.target.value==="Other")setForm(f=>({...f,trade:" "}));else setForm(f=>({...f,trade:e.target.value}));}} style={{...dInp(),appearance:"none",cursor:"pointer"}}>
                <option value="">Select...</option>
                {MASTER_TRADES.filter(t=>t!=="Other").map(t=><option key={t} value={t}>{t}</option>)}
                <option value="Other">Other — type custom...</option>
              </select>
            )}
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Area</label>
            <select value={form.area} onChange={e=>setForm(f=>({...f,area:e.target.value}))} style={{...dInp(),appearance:"none",cursor:"pointer"}}>
              <option value="">Select...</option>
              {projAreas.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
              {projAreas.length===0&&<option disabled>— Add areas in General tab —</option>}
            </select>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Assigned To</label>
            <input value={form.assignedTo} onChange={e=>setForm(f=>({...f,assignedTo:e.target.value}))} placeholder="Sub or vendor..." style={dInp()}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Priority</label>
            <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={{...dInp(),appearance:"none",cursor:"pointer"}}>
              {PRIORITY.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Comments / Notes</label>
          <textarea value={form.comments} onChange={e=>setForm(f=>({...f,comments:e.target.value}))} placeholder="Additional notes..." rows={3} style={{...dInp(),resize:"vertical"}}/>
        </div>
        {editId&&(
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Status</label>
            <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{...dInp(),appearance:"none",cursor:"pointer"}}>
              <option value="open">Open</option><option value="pending">Pending</option><option value="accepted">Accepted</option>
            </select>
          </div>
        )}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:D.bg1,borderTop:`1px solid ${D.b1}`,padding:"14px 16px"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          {editId?(
            <SaveFlashButton label="Save Changes" onClick={async()=>{await saveItem();}}/>
          ):(
            <AddToPunchButton onSave={saveItem} disabled={!form.title.trim()} listType={listType}/>
          )}
        </div>
      </div>
    </div>
  );

  if(view==="project"&&proj)return(
    <div style={{minHeight:"100vh",background:D.bg0}}>
      <Lightbox photos={lightbox?.photos} startIndex={lightbox?.startIndex||0} src={typeof lightbox==='string'?lightbox:null} onClose={()=>setLightbox(null)}/>
      <Confirm item={confirm} onConfirm={doDelete} onCancel={()=>setConfirm(null)}/>
      <DarkHeader title={proj.name} subtitle={[proj.clientName,proj.projectNumber?"#"+proj.projectNumber:""].filter(Boolean).join(" · ")||undefined} onBack={()=>setView("dashboard")}/>
      <TabBar tabs={PROJ_TABS} active={tab} onTab={(t)=>{
        setTab(t);
        if(t==="preview") setPreviewListType(listType);
      }}/>

      {tab==="general"&&(
        <div style={{padding:"20px 16px",maxWidth:600,margin:"0 auto"}}>
          <div style={{background:D.bg1,borderRadius:16,padding:20,border:`1px solid ${D.b1}`,marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:700,color:D.t1,marginBottom:18}}>Project Details</div>

            {/* CLIENT LOGO */}
            <div style={{marginBottom:18}}>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:8,letterSpacing:"0.08em",textTransform:"uppercase"}}>Client Logo</label>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:72,height:72,borderRadius:10,overflow:"hidden",background:proj.clientLogoUrl?"#fff":D.bg2,border:`1px solid ${D.b2}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {proj.clientLogoUrl
                    ? <img src={proj.clientLogoUrl} alt="Client Logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:4}}/>
                    : <span style={{fontSize:26}}>🏢</span>
                  }
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <label style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:10,background:D.acLL,border:`1px solid ${D.b3}`,cursor:"pointer",fontSize:13,fontWeight:600,color:D.t2}}>
                    📁 {proj.clientLogoUrl?"Change Logo":"Upload Logo"}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                      const file=e.target.files[0];if(!file)return;
                      try{
                        const{url}=await uploadClientLogo(file,user.id);
                        await sb.from("projects").update({client_logo_url:url}).eq("id",projId);
                        setProjects(prev=>prev.map(p=>p.id!==projId?p:{...p,clientLogoUrl:url}));
                      }catch(err){alert("Upload failed: "+err.message);}
                      e.target.value="";
                    }}/>
                  </label>
                  {proj.clientLogoUrl&&(
                    <button onClick={async()=>{
                      await sb.from("projects").update({client_logo_url:null}).eq("id",projId);
                      setProjects(prev=>prev.map(p=>p.id!==projId?p:{...p,clientLogoUrl:null}));
                    }} style={{padding:"7px 14px",borderRadius:10,background:D.redBg,border:"1px solid rgba(248,81,73,0.3)",color:D.red,fontWeight:600,fontSize:12,cursor:"pointer"}}>
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>
              <div style={{fontSize:11,color:D.t3,marginTop:6}}>Appears on dashboard card and PDF report.</div>
            </div>

            {[{k:"name",l:"Project Name"},{k:"clientName",l:"Client Name"},{k:"address",l:"Address"},{k:"projectNumber",l:"Project Number"}].map(f=>(
              <div key={f.k} style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>{f.l}</label>
                <input value={proj[f.k]||""} onChange={e=>updateProjectField(f.k,e.target.value)} style={dInp()}/>
              </div>
            ))}
            <div style={{padding:"12px 16px",background:D.bg2,borderRadius:10,border:`1px solid ${D.b1}`}}>
              <div style={{fontSize:12,color:D.t3}}>Template: {proj.template||"—"}</div>
              <div style={{fontSize:12,color:D.t3,marginTop:2}}>Created: {proj.createdAt}</div>
              <div style={{fontSize:12,color:D.t3,marginTop:2}}>{stats.total} punch items</div>
            </div>
          </div>
          <div style={{background:D.bg1,borderRadius:16,padding:20,border:`1px solid ${D.b1}`,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:700,color:D.t1}}>Areas</div>
              <span style={{fontSize:12,color:D.t3}}>{projAreas.length} area{projAreas.length!==1?"s":""}</span>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <input value={newAreaName} onChange={e=>setNewAreaName(e.target.value)} placeholder="Add an area..." style={{...dInp(),flex:1,padding:"10px 14px"}} onKeyDown={e=>e.key==="Enter"&&addAreaToProject()}/>
              <button onClick={addAreaToProject} disabled={!newAreaName.trim()} style={{padding:"10px 16px",borderRadius:10,background:newAreaName.trim()?D.ac:D.bg3,color:newAreaName.trim()?D.t1:D.t3,border:"none",fontWeight:700,fontSize:14,cursor:newAreaName.trim()?"pointer":"not-allowed",flexShrink:0}}>Add</button>
            </div>
            {projAreas.length===0?<div style={{textAlign:"center",padding:"24px",color:D.t3,fontSize:13}}>No areas yet — add one above.</div>:(()=>{
              const grouped=projAreas.reduce((acc,a)=>{if(!acc[a.section||"Other"])acc[a.section||"Other"]=[];acc[a.section||"Other"].push(a);return acc;},{});
              return Object.entries(grouped).map(([sec,secAreas])=>(
                <div key={sec} style={{marginBottom:14}}>
                  <SecLabel>{sec}</SecLabel>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {secAreas.map(area=>(
                      <div key={area.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:D.bg2,borderRadius:10,border:`1px solid ${D.b1}`}}>
                        {editingAreaId===area.id?<input value={editingAreaName} onChange={e=>setEditingAreaName(e.target.value)} onBlur={saveEditArea} onKeyDown={e=>{if(e.key==="Enter")saveEditArea();}} style={{...dInp(),flex:1,padding:"6px 10px",fontSize:13}} autoFocus/>:<span style={{flex:1,fontSize:13,fontWeight:500,color:D.t1}}>{area.name}</span>}
                        <button onClick={()=>startEditArea(area)} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,padding:4,display:"flex"}}><Pencil size={13}/></button>
                        <button onClick={()=>removeAreaFromProject(area.id)} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,padding:4,display:"flex"}}><X size={13}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
          <div style={{background:D.bg1,borderRadius:16,padding:20,border:"1px solid rgba(248,81,73,0.2)"}}>
            <div style={{fontSize:14,fontWeight:700,color:D.red,marginBottom:12}}>Danger Zone</div>
            <button onClick={()=>setConfirm({type:"project",id:proj.id,label:proj.name})} style={{padding:"10px 16px",borderRadius:10,background:D.redBg,border:"1px solid rgba(248,81,73,0.3)",color:D.red,fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><Trash2 size={15}/> Delete Project</button>
          </div>
          {/* ── SMS NOTIFICATION MESSAGES ── */}
          <div style={{marginTop:8,padding:"0 16px",marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>SMS Notification Messages</div>
            <div style={{background:D.bg2,borderRadius:12,padding:14,border:`1px solid ${D.b1}`}}>
              <div style={{fontSize:12,color:D.t3,marginBottom:12,lineHeight:1.6}}>
                Use <strong style={{color:D.t1}}>{"{project}"}</strong> for project name and <strong style={{color:D.t1}}>{"{item}"}</strong> for item title.
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>When Item Is Added</div>
                <input value={proj.smsAddedMessage||""} onChange={e=>updateProjectField("smsAddedMessage",e.target.value)} style={{...dInp(),width:"100%"}} placeholder="New item added to {project}: {item}"/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:D.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>When Item Is Accepted / Closed Out</div>
                <input value={proj.smsAcceptedMessage||""} onChange={e=>updateProjectField("smsAcceptedMessage",e.target.value)} style={{...dInp(),width:"100%"}} placeholder="Item closed out on {project}: {item}"/>
              </div>
              <div style={{fontSize:11,color:D.t3,marginTop:10}}>Messages send to you and any collaborators with SMS notifications enabled.</div>
            </div>
          </div>
          {/* ── COLLABORATORS ── */}
          <div style={{marginTop:8,padding:"0 16px 80px"}}>
            <div style={{fontSize:11,fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Collaborators (Max 2)</div>
            <CollaboratorManager projId={projId} user={user}/>
          </div>
        </div>
      )}

      {(tab==="issues"||tab==="completion")&&(
        <CustomScrollList height="calc(100vh - 200px)" style={{flex:1}}>
        <div style={{paddingBottom:80}}>
          {itemsLoading?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 20px",gap:12,color:D.t3}}>
              <Spinner size={20}/><span style={{fontSize:14}}>Loading items...</span>
            </div>
          ):(<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:D.b1}}>
              {[{l:"Open",v:stats.open,col:D.red,action:null},{l:"Pending",v:stats.pending,col:D.yellow,action:null},{l:"Accepted",v:stats.accepted,col:D.green,action:()=>setFStatus("accepted")}].map(s=>(
                <div key={s.l} onClick={()=>s.action&&s.action()}
                  style={{background:D.bg1,padding:"14px 8px",textAlign:"center",cursor:s.action?"pointer":"default"}}>
                  <div style={{fontSize:30,fontWeight:800,color:s.col,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:10,fontWeight:600,color:D.t3,marginTop:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
                </div>
              ))}
            </div>
            {stats.total>0&&(
              <div style={{background:D.bg1,padding:"10px 16px",borderBottom:`1px solid ${D.b1}`}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:7}}><span style={{color:D.t3}}>{stats.total} items total</span><span style={{fontWeight:800,color:D.green}}>{pct}% accepted</span></div>
                <div style={{height:4,background:D.bg3,borderRadius:100,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#3FB950,#56D364)",borderRadius:100,transition:"width 0.5s"}}/></div>
              </div>
            )}
            <div style={{padding:"12px 16px",background:D.bg1,borderBottom:`1px solid ${D.b1}`,display:"flex",gap:10}}>
              <button onClick={()=>openAdd(false)} style={{flex:1,padding:12,borderRadius:10,background:D.ac,color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer"}}>+ ADD ONE</button>
              <button onClick={()=>{setSessionItems([]);setView("multiAdd");}} style={{flex:1,padding:12,borderRadius:10,background:D.acLL,color:D.t1,fontWeight:700,fontSize:14,border:`1px solid ${D.b3}`,cursor:"pointer"}}>+ ADD MULTI</button>
              <button onClick={()=>loadProjectItems(projId)} title="Refresh list" style={{padding:12,borderRadius:10,background:D.bg2,border:`1px solid ${D.b2}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🔄</button>
            </div>
            <div style={{padding:"10px 16px",background:D.bg0,borderBottom:`1px solid ${D.b1}`,display:"flex",gap:8,flexWrap:"wrap"}}>
              {["all","open","pending","accepted"].map(s=><button key={s} onClick={()=>setFStatus(s)} style={{padding:"5px 12px",borderRadius:100,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${fStatus===s?D.ac:D.b2}`,background:fStatus===s?D.acLL:"transparent",color:fStatus===s?D.t1:D.t3}}>{s==="all"?"All":STATUS_CFG[s]?.label||"Accepted"}</button>)}

              {usedTrades.length>0&&<select value={fTrade} onChange={e=>setFTrade(e.target.value)} style={{padding:"5px 10px",borderRadius:100,fontSize:11,fontWeight:600,border:`1px solid ${fTrade!=="all"?D.ac:D.b2}`,background:fTrade!=="all"?D.acLL:"transparent",color:fTrade!=="all"?D.t1:D.t3,outline:"none",cursor:"pointer",appearance:"none"}}><option value="all">All Trades</option>{usedTrades.map(t=><option key={t} value={t}>{t}</option>)}</select>}
              {usedAreas.length>0&&<select value={fArea} onChange={e=>setFArea(e.target.value)} style={{padding:"5px 10px",borderRadius:100,fontSize:11,fontWeight:600,border:`1px solid ${fArea!=="all"?D.ac:D.b2}`,background:fArea!=="all"?D.acLL:"transparent",color:fArea!=="all"?D.t1:D.t3,outline:"none",cursor:"pointer",appearance:"none"}}><option value="all">All Areas</option>{usedAreas.map(a=><option key={a} value={a}>{a}</option>)}</select>}
              {(fStatus!=="all"||fTrade!=="all"||fArea!=="all")&&<button onClick={()=>{setFStatus("all");setFTrade("all");setFArea("all");}} style={{padding:"5px 10px",borderRadius:100,fontSize:11,fontWeight:600,border:`1px solid ${D.b2}`,background:"transparent",color:D.t3,cursor:"pointer"}}>✕ Clear</button>}
            </div>
            {stats.total>0&&<div style={{padding:"8px 16px 0",fontSize:12,color:D.t3}}>{filtered.length} item{filtered.length!==1?"s":""}</div>}
            <div style={{padding:"10px 16px 20px"}}>
              {filtered.length===0?(
                <div style={{textAlign:"center",padding:"48px 20px",background:D.bg1,borderRadius:16,border:`1px solid ${D.b1}`,marginTop:8}}>
                  <Clipboard size={24} color={D.t3} style={{margin:"0 auto 14px",display:"block"}}/>
                  <div style={{fontSize:16,fontWeight:700,color:D.t1,marginBottom:6}}>{stats.total===0?"No punch items yet":"No items match filters"}</div>
                  <div style={{fontSize:13,color:D.t3}}>{stats.total===0?"Tap ADD ONE to get started.":"Try clearing your filters."}</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {filtered.map(item=>{
                    const nc=NEXT_CFG[item.status];const firstPhoto=(item.photos||[]).find(p=>p?.isPrimary)||(item.photos||[])[0];
                    return(
                      <div key={item.id} style={{background:listType==="completion"?D.amberBg:D.bg1,borderRadius:14,border:`1px solid ${listType==="completion"?D.amberBorder:D.b1}`,overflow:"hidden",boxShadow:D.sh1}}>
                        <div style={{display:"flex"}}>
                          {firstPhoto?<img src={firstPhoto.url} alt="" style={{width:88,height:88,objectFit:"cover",flexShrink:0,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setLightbox({photos:item.photos,startIndex:0});}}/>:<div style={{width:88,height:88,background:D.bg2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ImageIcon size={22} color={D.b3}/></div>}
                          <div style={{flex:1,padding:"10px 12px 8px",minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:11,fontWeight:800,color:D.ac}}>#{item.num}</span>
                                <StatusBadge status={item.status}/><PriBadge priority={item.priority}/>
                              </div>
                              <button onClick={e=>openEdit(item,e)} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,padding:3,display:"flex"}}><Pencil size={14}/></button>
                            </div>
                            <div style={{fontSize:13,fontWeight:600,color:D.t1,lineHeight:1.45,marginBottom:5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{item.title}</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {item.trade&&<span style={{fontSize:10,fontWeight:600,color:D.t2,background:D.bg2,padding:"2px 7px",borderRadius:5,border:`1px solid ${D.b1}`}}>{item.trade}</span>}
                              {item.area&&<span style={{fontSize:10,fontWeight:600,color:D.t2,background:D.bg2,padding:"2px 7px",borderRadius:5,border:`1px solid ${D.b1}`}}>{item.area}</span>}
                              {item.assignedTo&&<span style={{fontSize:10,color:D.t3}}>👤 {item.assignedTo}</span>}
                              {item.comments&&<span style={{fontSize:10,color:D.t3}}>💬 Note</span>}
                              {(item.photos||[]).length>0&&<span style={{fontSize:10,color:D.t3}}>📷 {item.photos.length}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{borderTop:`1px solid ${D.b1}`,padding:"7px 12px",display:"flex",justifyContent:"flex-end",background:D.bg0}}>
                          <button onClick={e=>cycleStatus(item.id,e)} style={{padding:"5px 14px",borderRadius:8,border:`1px solid ${nc.border}`,background:nc.bg,color:nc.color,cursor:"pointer",fontSize:12,fontWeight:700}}>{NEXT_LABEL[item.status]}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>)}

        </div>
        </CustomScrollList>
      )}

      {tab==="preview"&&(
        <div>
          {/* Preview filters */}
          <div style={{padding:"10px 16px",background:D.bg1,borderBottom:`1px solid ${D.b1}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",position:"sticky",top:120,zIndex:30}}>
            <div style={{fontSize:11,fontWeight:600,color:D.t3,textTransform:"uppercase",letterSpacing:"0.06em"}}>List:</div>
            {["punch","completion"].map(lt=>(
              <button key={lt} onClick={()=>setPreviewListType(lt)}
                style={{padding:"4px 12px",borderRadius:100,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${previewListType===lt?D.ac:D.b2}`,background:previewListType===lt?D.acLL:"transparent",color:previewListType===lt?D.t1:D.t3}}>
                {lt==="punch"?"Punch":"Completion"}
              </button>
            ))}
            <div style={{width:1,height:14,background:D.b2}}/>
            <div style={{fontSize:11,fontWeight:600,color:D.t3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Status:</div>
            {["all","open","pending","accepted"].map(s=>(
              <button key={s} onClick={()=>setPreviewStatus(s)}
                style={{padding:"4px 12px",borderRadius:100,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid ${previewStatus===s?D.ac:D.b2}`,background:previewStatus===s?D.acLL:"transparent",color:previewStatus===s?D.t1:D.t3}}>
                {s==="all"?"All":s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
          <div style={{padding:"20px 16px",maxWidth:700,margin:"0 auto"}}>
          <div style={{background:D.bg1,borderRadius:16,padding:24,border:`1px solid ${D.b1}`}}>
            <div style={{borderBottom:`2px solid ${D.ac}`,paddingBottom:14,marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,color:previewListType==="completion"?D.amber:D.ac,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{previewListType==="completion"?"Completion List Report":"Punch List Report"}{previewStatus!=="all"?` · ${previewStatus.charAt(0).toUpperCase()+previewStatus.slice(1)} Only`:""}</div>
              <div style={{fontSize:20,fontWeight:800,color:D.t1}}>{proj.name}</div>
              {proj.clientName&&<div style={{fontSize:13,color:D.t3,marginTop:2}}>Client: {proj.clientName}</div>}
              <div style={{display:"flex",gap:16,marginTop:12}}>
                {[["Open",previewStats.open,D.red],["Pending",previewStats.pending,D.yellow],["Accepted",previewStats.accepted,D.green],["Total",previewStats.total,D.t1]].map(([l,v,col])=>(
                  <div key={l} style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:col}}>{v}</div><div style={{fontSize:10,color:D.t3,textTransform:"uppercase"}}>{l}</div></div>
                ))}
              </div>
            </div>
            {previewItems.map(item=>(
              <div key={item.id} style={{borderBottom:`1px solid ${D.b1}`,paddingBottom:12,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:800,color:D.ac}}>#{item.num}</span><StatusBadge status={item.status}/><PriBadge priority={item.priority}/>
                </div>
                <div style={{fontSize:13,fontWeight:600,color:D.t1,marginBottom:4}}>{item.title}</div>
                <div style={{fontSize:12,color:D.t3,display:"flex",gap:10,flexWrap:"wrap"}}>
                  {item.trade&&<span>🔧 {item.trade}</span>}{item.area&&<span>📍 {item.area}</span>}{item.assignedTo&&<span>👤 {item.assignedTo}</span>}
                </div>
                {item.comments&&<div style={{fontSize:12,color:D.t2,background:D.bg2,padding:"8px 12px",borderRadius:8,marginTop:6}}>💬 {item.comments}</div>}
                {(item.photos||[]).length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>{item.photos.map((ph,i)=><img key={i} src={ph.url} alt="" onClick={()=>setLightbox({photos:item.photos,startIndex:i})} style={{width:72,height:54,objectFit:"cover",borderRadius:6,cursor:"pointer",border:`1px solid ${D.b2}`}}/>)}</div>}
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {tab==="share"&&(
        <div style={{padding:"20px 16px",maxWidth:600,margin:"0 auto"}}>

          {/* ── PDF EXPORT ── */}
          <div style={{background:D.bg1,borderRadius:16,overflow:"hidden",border:`1px solid ${D.b1}`,marginBottom:14}}>
            <div style={{padding:"12px 16px",fontSize:11,fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${D.b1}`}}>Export</div>
            <button onClick={()=>setView("print")} style={{width:"100%",padding:"14px 16px",display:"flex",alignItems:"center",gap:14,background:"none",border:"none",cursor:"pointer"}}>
              <div style={{width:36,height:36,borderRadius:10,background:D.bg2,display:"flex",alignItems:"center",justifyContent:"center"}}><FileText size={18} color={D.red}/></div>
              <span style={{flex:1,fontSize:14,fontWeight:500,color:D.t1,textAlign:"left"}}>Download / Print PDF</span>
              <ChevronRight size={16} color={D.t3}/>
            </button>
          </div>

          {/* ── CLIENT ACCESS ── */}
          <div style={{background:D.bg1,borderRadius:16,overflow:"hidden",border:`1px solid ${D.b1}`,marginBottom:14}}>
            <div style={{padding:"12px 16px",fontSize:11,fontWeight:700,color:D.t3,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${D.b1}`}}>Client View Link</div>
            <div style={{padding:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:proj.shareToken?14:0}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:D.t1}}>Enable Client Access</div>
                  <div style={{fontSize:11,color:D.t3,marginTop:2}}>Anyone with the link can view this punch list</div>
                </div>
                {/* Toggle */}
                <div onClick={async()=>{
                  if(proj.shareToken){
                    // Revoke
                    await sb.from("projects").update({share_token:null}).eq("id",projId);
                    setProjects(prev=>prev.map(p=>p.id!==projId?p:{...p,shareToken:null}));
                  } else {
                    // Enable
                    const token=generateToken();
                    await sb.from("projects").update({share_token:token}).eq("id",projId);
                    setProjects(prev=>prev.map(p=>p.id!==projId?p:{...p,shareToken:token}));
                  }
                }} style={{width:48,height:28,borderRadius:100,background:proj.shareToken?D.green:D.bg3,border:`1px solid ${proj.shareToken?"rgba(63,185,80,0.4)":D.b2}`,cursor:"pointer",display:"flex",alignItems:"center",padding:3,transition:"all 0.25s",flexShrink:0}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:"#fff",transform:proj.shareToken?"translateX(20px)":"translateX(0)",transition:"transform 0.25s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
                </div>
              </div>

              {proj.shareToken&&(()=>{
                const shareUrl=`${window.location.origin}/view/${proj.shareToken}`;
                const shareMsg=`${proj.name} Punch List — View Here: ${shareUrl}`;
                return(
                  <div style={{animation:"fadeUp 0.3s ease"}}>
                    {/* Link display */}
                    <div style={{background:D.bg2,borderRadius:10,padding:"10px 14px",border:`1px solid ${D.b1}`,marginBottom:10,fontSize:12,color:D.t2,wordBreak:"break-all",lineHeight:1.5}}>
                      {shareUrl}
                    </div>
                    {/* Buttons */}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <button onClick={()=>navigator.clipboard.writeText(shareUrl).then(()=>alert("Link copied!"))}
                        style={{flex:1,padding:"10px 14px",borderRadius:10,background:D.acLL,border:`1px solid ${D.b3}`,color:D.t1,fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        🔗 Copy Link
                      </button>
                      <button onClick={()=>navigator.clipboard.writeText(customShareMsg||shareMsg).then(()=>alert("Message copied!"))}
                        style={{flex:1,padding:"10px 14px",borderRadius:10,background:D.bg2,border:`1px solid ${D.b2}`,color:D.t2,fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        💬 Copy Message
                      </button>
                    </div>
                    <div style={{marginTop:10}}>
                      <div style={{fontSize:11,color:D.t3,marginBottom:5}}>Edit message before copying:</div>
                      <textarea value={customShareMsg||shareMsg} onChange={e=>setCustomShareMsg(e.target.value)}
                        rows={3} style={{...dInp(),fontSize:12,resize:"vertical",width:"100%",lineHeight:1.5}}/>
                      {customShareMsg&&customShareMsg!==shareMsg&&(
                        <button onClick={()=>setCustomShareMsg("")} style={{fontSize:11,color:D.t3,background:"none",border:"none",cursor:"pointer",marginTop:4}}>↩ Reset to default</button>
                      )}
                    </div>
                    <div style={{marginTop:10,padding:"10px 14px",background:D.yellowBg,borderRadius:8,border:`1px solid rgba(210,153,34,0.3)`,fontSize:11,color:D.yellow}}>
                      ⚠ Toggle off above to revoke access at any time
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── CLOUD STATUS ── */}
          <div style={{background:D.bg1,borderRadius:16,overflow:"hidden",border:`1px solid ${D.b1}`}}>
            <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:36,height:36,borderRadius:10,background:D.greenBg,display:"flex",alignItems:"center",justifyContent:"center"}}><Cloud size={18} color={D.green}/></div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:D.t1}}>Supabase Cloud</div><div style={{fontSize:11,color:D.green,marginTop:2,fontWeight:600}}>✓ Connected — syncing across all devices</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // DASHBOARD
  return(
    <div style={{minHeight:"100vh",background:D.bg0}}>
      <Confirm item={confirm} onConfirm={doDelete} onCancel={()=>setConfirm(null)}/>
      <div style={{background:D.bg0,borderBottom:`1px solid ${D.b1}`,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",height:60,padding:"0 16px",maxWidth:720,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
            <div style={{width:38,height:38,borderRadius:10,overflow:"hidden",flexShrink:0,boxShadow:"0 2px 8px rgba(180,120,60,0.35)"}}><img src="/icon.png" alt="KAOS" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
            <div>
              <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:20,color:D.t1,letterSpacing:"0.2em",lineHeight:1}}>KAOS</div>
              <div style={{fontSize:9,color:D.t3,fontWeight:500,letterSpacing:"0.12em",textTransform:"uppercase"}}>PunchList Pro</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>setView("wizard")} style={{padding:"8px 16px",background:D.ac,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><Plus size={14}/>ADD</button>
          </div>
        </div>
        <TabBar tabs={DASH_TABS} active={dashTab} onTab={setDashTab}/>
      </div>

      <TrialBanner companyProfile={companyProfile} onSubscribe={async()=>{
        const res=await fetch(`${SUPA_URL}/functions/v1/create-checkout-session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,email:user.email})});
        const data=await res.json();
        if(data.url)window.location.href=data.url;
      }}/>
      {dashTab==="projects"&&(
        <div style={{padding:16,maxWidth:720,margin:"0 auto"}}>
          {user?.user_metadata?.name&&<div style={{marginBottom:14,fontSize:13,color:D.t3}}>Welcome back, <span style={{color:D.t1,fontWeight:700}}>{user.user_metadata.name.split(" ")[0]}</span></div>}
          <div style={{position:"relative",marginBottom:14}}>
            <Search size={16} color={D.t3} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects..." style={{...dInp(),paddingLeft:38}}/>
          </div>
          {loading?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 20px",gap:12,color:D.t3}}>
              <Spinner size={24}/><span style={{fontSize:14}}>Loading projects...</span>
            </div>
          ):(<>
            <div style={{fontSize:13,fontWeight:600,color:D.t3,marginBottom:10}}>{filteredProjects.length} Project{filteredProjects.length!==1?"s":""}</div>
            {filteredProjects.length===0&&(
              <div style={{textAlign:"center",padding:"56px 24px",background:D.bg1,borderRadius:20,border:`1px solid ${D.b1}`}}>
                <div style={{width:60,height:60,background:D.acLL,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><Clipboard size={28} color={D.ac}/></div>
                <div style={{fontSize:19,fontWeight:800,color:D.t1,marginBottom:8}}>No projects yet</div>
                <div style={{fontSize:14,color:D.t3,marginBottom:22}}>Tap ADD to create your first project.</div>
                <button onClick={()=>setView("wizard")} style={{padding:"11px 24px",borderRadius:10,background:D.ac,color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer"}}>+ New Project</button>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filteredProjects.map(p=>{
                const tmpl=TEMPLATES[p.template];
                return(
                  <div key={p.id} onClick={()=>openProject(p.id)} style={{background:D.bg1,borderRadius:16,overflow:"hidden",cursor:"pointer",border:`1px solid ${D.b1}`,boxShadow:D.sh1,display:"flex"}}>
                    <div style={{width:4,background:`linear-gradient(180deg,${D.ac},${D.acL})`,flexShrink:0}}/>
                    <div style={{width:68,background:p.clientLogoUrl?"#fff":D.bg2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                      {p.clientLogoUrl
                        ? <img src={p.clientLogoUrl} alt="Client Logo" style={{width:68,minHeight:80,objectFit:"contain",padding:6}}/>
                        : <span style={{fontSize:24}}>{tmpl?.icon||"📋"}</span>
                      }
                    </div>
                    <div style={{flex:1,padding:"14px 14px 12px",minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:700,color:D.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                          <div style={{fontSize:12,color:D.t3,marginTop:1}}>{p.clientName||"No client"}{p.projectNumber?" · #"+p.projectNumber:""}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:8}}>
                          <button onClick={e=>{e.stopPropagation();setConfirm({type:"project",id:p.id,label:p.name});}} style={{background:"none",border:"none",cursor:"pointer",color:D.t3,padding:4,display:"flex",borderRadius:6}}><Trash2 size={13}/></button>
                          <ChevronRight size={16} color={D.t3}/>
                        </div>
                      </div>
                      {p.template&&<div style={{fontSize:10,color:D.t3,marginBottom:4}}>{tmpl?.icon} {p.template}</div>}
                      <div style={{fontSize:12,color:D.t3}}>{p.areas?.length||0} areas configured · tap to open</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>)}
        </div>
      )}

      {dashTab==="cloud"&&(
        <div style={{padding:"24px 16px",maxWidth:500,margin:"0 auto"}}>
          <div style={{background:D.bg1,borderRadius:16,padding:"32px 20px",textAlign:"center",border:`1px solid ${D.b1}`}}>
            <div style={{width:64,height:64,background:D.greenBg,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}><Cloud size={30} color={D.green}/></div>
            <div style={{fontSize:18,fontWeight:800,color:D.t1,marginBottom:8}}>Cloud Sync Active</div>
            <div style={{fontSize:14,color:D.t3,lineHeight:1.6,marginBottom:24}}>Your data is stored securely in Supabase and syncs across all your devices automatically. Photos are stored in cloud storage — no local storage limits.</div>
            <div style={{padding:"12px 16px",background:D.greenBg,borderRadius:10,border:`1px solid rgba(63,185,80,0.3)`,fontSize:13,color:D.green,fontWeight:600}}>✓ Connected to Supabase</div>
          </div>
        </div>
      )}

      {dashTab==="settings"&&(
        <div style={{padding:"20px 16px",maxWidth:500,margin:"0 auto"}}>
          <AccountEditor user={user} companyProfile={companyProfile} setCompanyProfile={setCompanyProfile}/>
          <div style={{background:D.bg1,borderRadius:16,overflow:"hidden",border:`1px solid ${D.b1}`,marginBottom:16}}>
            {[{l:"App Version",v:"4.0.0"},{l:"Backend",v:"Supabase Cloud"},{l:"Storage",v:"Supabase Storage"},{l:"Total Projects",v:projects.length}].map((row,i,arr)=>(
              <div key={row.l} style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",borderBottom:i<arr.length-1?`1px solid ${D.b1}`:"none"}}>
                <span style={{fontSize:14,color:D.t2}}>{row.l}</span><span style={{fontSize:13,color:D.t3,fontWeight:600}}>{row.v}</span>
              </div>
            ))}
          </div>
          <button onClick={async()=>{
            try{
              const res=await fetch(`${SUPA_URL}/functions/v1/create-billing-portal`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,returnUrl:"https://kaospunchlist.pro"})});
              const data=await res.json();
              if(data.url)window.location.href=data.url;
              else alert("Billing portal not available yet.");
            }catch{alert("Billing portal not available yet.");}
          }} style={{width:"100%",padding:"11px",borderRadius:12,background:D.bg2,border:`1px solid ${D.b2}`,color:D.t2,fontWeight:600,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
            💳 Manage Billing / Cancel
          </button>
          <button onClick={onLogout} style={{width:"100%",padding:"13px",borderRadius:12,background:D.redBg,border:"1px solid rgba(248,81,73,0.2)",color:D.red,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><LogOut size={16}/>Log Out</button>
          <div style={{background:D.bg1,borderRadius:16,overflow:"hidden",border:`1px solid ${D.b1}`,marginTop:16}}>
            {[{l:"Privacy Policy",url:"/privacy"},{l:"Terms of Service",url:"/terms"}].map((row,i,arr)=>(
              <button key={row.l} onClick={()=>window.location.href=row.url}
                style={{width:"100%",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",borderBottom:i<arr.length-1?`1px solid ${D.b1}`:"none",cursor:"pointer"}}>
                <span style={{fontSize:14,color:D.t2}}>{row.l}</span>
                <span style={{fontSize:14,color:D.t3}}>›</span>
              </button>
            ))}
          </div>
          <div style={{marginTop:16,textAlign:"center",fontSize:11,color:D.t3,letterSpacing:"0.06em"}}>Kaos Design Werks, LLC — Punch List Pro v4.0</div>
        </div>
      )}

      
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════ */
function AppInner(){
  useEffect(()=>{injectStyles();},[]);
  const [screen,setScreen]=useState("splash");
  const [user,setUser]=useState(null);

  const routeAfterAuth=async(sessionUser)=>{
    setUser(sessionUser);
    try{
      const{data}=await sb.from("company_profile").select("id").eq("user_id",sessionUser.id).maybeSingle();
      if(!data)setScreen("company-setup");
      else setScreen("app");
    }catch{setScreen("app");}
  };

  useEffect(()=>{
    const path=window.location.pathname;
    // Handle Stripe success redirect
    if(window.location.search.includes("subscribed=true")){
      window.history.replaceState({},"","/");
    }
    if(path.startsWith("/view/")){setScreen("share");return;}
    if(path.startsWith("/collaborate/")){setScreen("collaborate");return;}
    if(path==="/privacy"){setScreen("privacy");return;}
    if(path==="/terms"){setScreen("terms");return;}
    const hash=window.location.hash;
    if(hash.includes("type=recovery")||window.location.search.includes("reset=true")){
      setScreen("reset");return;
    }
    sb.auth.getSession().then(({data:{session}})=>{
      if(session)routeAfterAuth(session.user);
      else setScreen("landing");
    });
    const{data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{
      if(event==="PASSWORD_RECOVERY"){setScreen("reset");return;}
      if(session)routeAfterAuth(session.user);
      else{setUser(null);setScreen("landing");}
    });
    return()=>subscription.unsubscribe();
  },[]);

  // ── Intercept browser back button / swipe to prevent leaving app ──
  useEffect(()=>{
    // Push a state so there is always something to pop back to
    window.history.pushState({app:true},"",window.location.href);
    const handlePop=(e)=>{
      // Always push a new state to keep us in the app
      window.history.pushState({app:true},"",window.location.href);
      // Dispatch a custom event so MainApp can handle the back action
      window.dispatchEvent(new CustomEvent("appback"));
    };
    window.addEventListener("popstate",handlePop);
    return()=>window.removeEventListener("popstate",handlePop);
  },[]);

  const handleLogout=async()=>{await sb.auth.signOut();setUser(null);setScreen("landing");};

  // Extract token from URL for share view
  const shareToken = window.location.pathname.startsWith("/view/")
    ? window.location.pathname.replace("/view/","").trim()
    : null;

  if(screen==="share"&&shareToken)return<ClientShareView token={shareToken}/>;
  const collabToken=window.location.pathname.startsWith("/collaborate/")?window.location.pathname.split("/collaborate/")[1]:null;
  if(screen==="collaborate"&&collabToken)return<CollaboratorVerify token={collabToken}/>;
  if(screen==="privacy")return<PrivacyPolicy/>;
  if(screen==="terms")return<TermsOfService/>;
  if(screen==="landing")return<LandingPage onGetStarted={()=>setScreen("auth")} onLogin={()=>setScreen("auth")}/>;
  if(screen==="company-setup"&&user)return(<><CompanySetup user={user} onComplete={()=>setScreen("app")}/></>);


  if(screen==="splash")return<Splash onDone={()=>setScreen("auth")}/>;
  if(screen==="reset")return<PasswordReset/>;
  if(screen==="auth")return<Auth/>;
  if(screen==="app"&&user)return(
    <>
      <MainApp user={user} onLogout={handleLogout}/>
      <ThemeToggle/>
      {/* Log Out — fixed bottom right — hidden on print */}
      <button onClick={handleLogout} className="no-print"
        style={{position:"fixed",bottom:20,right:16,zIndex:100,display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:D.bg1,border:`1px solid ${D.b2}`,borderRadius:20,cursor:"pointer",color:D.t3,fontSize:12,fontWeight:600,boxShadow:D.sh1}}>
        <LogOut size={13}/> Log Out
      </button>
    </>
  );
  return<div style={{minHeight:"100vh",background:D.bg0,display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner size={32} color={D.t3}/></div>;
}

export default function App(){
  const [dark,setDark]=useState(()=>{
    const saved=localStorage.getItem("kdw_theme");
    return saved===null ? true : saved==="dark";
  });

  // Keep D in sync whenever theme changes
  D = dark ? DARK : LIGHT;

  useEffect(()=>{
    localStorage.setItem("kdw_theme", dark?"dark":"light");
    applyTheme(dark);
  },[dark]);

  // Apply theme on first render too
  useEffect(()=>{ applyTheme(dark); },[]);

  const toggle=()=>setDark(v=>!v);

  return(
    <ThemeContext.Provider value={{dark,toggle}}>
      <AppInner/>
    </ThemeContext.Provider>
  );
}
