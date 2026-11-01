import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, LogOut, Plus, Search, Activity, Clock3, Menu, X, Settings } from "lucide-react";
import { api } from "./api";

function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ clinicName: "", name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("dentalos_token", result.token);
      onAuth(result.user);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap"><section className="auth-card">
    <div className="brand-mark">D</div><p className="eyebrow">CLINIC OPERATIONS PLATFORM</p>
    <h1>Welcome to DentalOS</h1><p className="muted">One workspace for your clinic enquiries and appointments.</p>
    <div className="tabs"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Sign in</button><button className={mode==="register"?"active":""} onClick={()=>setMode("register")}>Create clinic</button></div>
    <form onSubmit={submit} className="form">
      {mode==="register" && <><label>Clinic name<input name="clinicName" value={form.clinicName} onChange={change} required placeholder="Smile Dental Clinic"/></label><label>Your name<input name="name" value={form.name} onChange={change} required placeholder="Clinic owner"/></label><label>Clinic phone<input name="phone" value={form.phone} onChange={change} placeholder="+91..."/></label></>}
      <label>Email<input type="email" name="email" value={form.email} onChange={change} required placeholder="you@clinic.com"/></label>
      <label>Password<input type="password" name="password" value={form.password} onChange={change} required minLength={mode==="register"?10:1} placeholder={mode==="register"?"At least 10 characters":"Your password"}/></label>
      {error && <div className="error">{error}</div>}
      <button className="primary full" disabled={busy}>{busy?"Please wait...":mode==="login"?"Sign in":"Create clinic workspace"}</button>
    </form>
    <p className="tiny muted">Demo starter. Do not enter real patient information until production security controls are completed.</p>
  </section></main>;
}

function Shell({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const links = [{to:"/",label:"Overview",icon:LayoutDashboard},{to:"/leads",label:"Enquiries",icon:Users},{to:"/appointments",label:"Appointments",icon:CalendarDays},...( ["owner","admin"].includes(user?.role) ? [{to:"/settings",label:"Clinic settings",icon:Settings}] : [] )];
  return <div className="app-shell">
    <aside className={open?"sidebar open":"sidebar"}>
      <div className="side-brand"><div className="brand-mark small">D</div><div><b>DentalOS</b><small>Clinic workspace</small></div><button className="icon-btn mobile-only" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{links.map(({to,label,icon:Icon})=><NavLink end={to==="/"} to={to} key={to} onClick={()=>setOpen(false)}><Icon size={18}/>{label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="avatar">{user?.name?.[0]?.toUpperCase()||"U"}</div><div className="user-meta"><b>{user?.name}</b><small>{user?.email}</small></div><button className="icon-btn" title="Sign out" onClick={onLogout}><LogOut size={17}/></button></div>
    </aside>
    <main className="main"><header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setOpen(true)}><Menu/></button><span className="muted">Clinic workspace / <b>Overview</b></span><div className="top-right"><span className="status-dot"/>Workspace active</div></header>{children}</main>
  </div>;
}

function Overview() {
  const [data,setData] = useState(null);
  const [error,setError] = useState("");
  useEffect(()=>{api("/dashboard/summary").then(setData).catch(e=>setError(e.message));},[]);
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">YOUR CLINIC AT A GLANCE</p><h1>Overview</h1><p className="muted">Track enquiries and keep appointments moving.</p></div><span className="date-chip">{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span></div>
    {error&&<div className="error">{error}</div>}
    <div className="stat-grid">
      <Stat icon={Users} label="Total enquiries" value={data?.totalLeads??"—"} tone="teal"/>
      <Stat icon={Activity} label="New enquiries" value={data?.newLeads??"—"} tone="blue"/>
      <Stat icon={CalendarDays} label="Today's appointments" value={data?.todayAppointments??"—"} tone="orange"/>
      <Stat icon={Clock3} label="Upcoming appointments" value={data?.upcomingAppointments?.length??"—"} tone="purple"/>
    </div>
    <section className="panel"><div className="panel-head"><div><h2>Upcoming appointments</h2><p className="muted">Your next scheduled visits</p></div><a className="text-link" href="/appointments">View calendar →</a></div>
      {data?.upcomingAppointments?.length ? <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Service</th><th>Date & time</th><th>Status</th></tr></thead><tbody>{data.upcomingAppointments.map(a=><tr key={a._id}><td><b>{a.patientName}</b><small>{a.phone}</small></td><td>{a.service||"—"}</td><td>{new Date(a.startsAt).toLocaleString()}</td><td><span className={`pill ${a.status}`}>{a.status}</span></td></tr>)}</tbody></table></div>:<Empty title="No upcoming appointments" text="New appointments will appear here once added."/>}
    </section>
    <div className="module-note"><b>More clinic tools are coming</b><span>Voice receptionist · WhatsApp automation · Local SEO · Clinic analytics</span></div>
  </div>;
}
function Stat({icon:Icon,label,value,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><p>{label}</p><strong>{value}</strong></div>; }
function Empty({title,text}) { return <div className="empty"><div className="empty-icon"><CalendarDays size={22}/></div><b>{title}</b><p>{text}</p></div>; }

function SlotPicker({ date, durationMinutes, value, onChange }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!date) { setSlots([]); setError(""); return; }
    setLoading(true); setError("");
    api(`/appointments/availability?date=${encodeURIComponent(date)}&durationMinutes=${durationMinutes}`)
      .then(data => { if (active) setSlots(data.slots || []); })
      .catch(err => { if (active) { setSlots([]); setError(err.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, durationMinutes]);
  return <label>Available start time
    <select required value={value} onChange={e => onChange(e.target.value)} disabled={!date || loading || slots.length === 0}>
      <option value="">{!date ? "Choose a date first" : loading ? "Loading slots…" : slots.length ? "Choose a time" : "No available slots"}</option>
      {slots.map(slot => <option key={slot.time} value={slot.time}>{slot.time}</option>)}
    </select>
    {error && <small className="field-error">{error}</small>}
  </label>;
}

function Leads() {
  const [items,setItems]=useState([]),[q,setQ]=useState(""),[error,setError]=useState(""),[show,setShow]=useState(false);
  const [bookingLead,setBookingLead]=useState(null);
  const [booking,setBooking]=useState({date:"",time:"",durationMinutes:"30"});
  const [form,setForm]=useState({patientName:"",phone:"",email:"",source:"phone",serviceInterest:"",notes:"",consentToContact:false});
  async function load(){try{const d=await api(`/leads?q=${encodeURIComponent(q)}`);setItems(d.items);}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[]);
  async function create(e){e.preventDefault();setError("");try{await api("/leads",{method:"POST",body:JSON.stringify(form)});setForm({patientName:"",phone:"",email:"",source:"phone",serviceInterest:"",notes:"",consentToContact:false});setShow(false);load();}catch(e){setError(e.message);}}
  async function status(id,value){try{await api(`/leads/${id}`,{method:"PATCH",body:JSON.stringify({status:value})});load();}catch(e){setError(e.message);}}
  function startBooking(lead){setBookingLead(lead);setBooking({date:"",time:"",durationMinutes:"30"});setError("");}
  async function convert(e){e.preventDefault();if(!bookingLead)return;setError("");try{await api(`/leads/${bookingLead._id}/convert`,{method:"POST",body:JSON.stringify({date:booking.date,time:booking.time,durationMinutes:Number(booking.durationMinutes)})});setBookingLead(null);setBooking({date:"",time:"",durationMinutes:"30"});await load();}catch(e){setError(e.message);}}
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">PATIENT PIPELINE</p><h1>Enquiries</h1><p className="muted">Capture enquiries and turn them into scheduled clinic visits.</p></div><button className="primary" onClick={()=>setShow(!show)}><Plus size={17}/> Add enquiry</button></div>
    {error&&<div className="error">{error}</div>}
    {show&&<form className="panel form-grid" onSubmit={create}><label>Patient name<input required value={form.patientName} onChange={e=>setForm({...form,patientName:e.target.value})}/></label><label>Phone<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Interested service<input value={form.serviceInterest} onChange={e=>setForm({...form,serviceInterest:e.target.value})} placeholder="e.g. Consultation"/></label><label>Source<select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}>{["website","phone","whatsapp","google","walk_in","other"].map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={form.consentToContact} onChange={e=>setForm({...form,consentToContact:e.target.checked})}/> Patient agreed to be contacted</label><label className="span-2">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="form-actions"><button className="primary">Save enquiry</button><button type="button" className="secondary" onClick={()=>setShow(false)}>Cancel</button></div></form>}
    {bookingLead&&<form className="panel form-grid booking-panel" onSubmit={convert}><div className="span-2"><p className="eyebrow">CONVERT ENQUIRY</p><h2>Book an appointment for {bookingLead.patientName}</h2><p className="muted">{bookingLead.phone} · {bookingLead.serviceInterest||"General consultation"}</p></div><label>Date<input type="date" required min={new Intl.DateTimeFormat("en-CA").format(new Date())} value={booking.date} onChange={e=>setBooking({...booking,date:e.target.value,time:""})}/></label><label>Duration<select value={booking.durationMinutes} onChange={e=>setBooking({...booking,durationMinutes:e.target.value,time:""})}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select></label><SlotPicker date={booking.date} durationMinutes={booking.durationMinutes} value={booking.time} onChange={time=>setBooking({...booking,time})}/><div className="form-actions"><button className="primary" disabled={!booking.date||!booking.time}>Create appointment</button><button type="button" className="secondary" onClick={()=>setBookingLead(null)}>Cancel</button></div></form>}
    <section className="panel"><div className="panel-head"><div><h2>All enquiries</h2><p className="muted">{items.length} shown</p></div><div className="search"><Search size={16}/><input placeholder="Search name or phone" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><button onClick={load}>Search</button></div></div>
      {items.length?<div className="table-wrap"><table><thead><tr><th>Patient</th><th>Interested in</th><th>Source</th><th>Created</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.map(x=><tr key={x._id}><td><b>{x.patientName}</b><small>{x.phone}</small></td><td>{x.serviceInterest||"—"}</td><td>{x.source}</td><td>{new Date(x.createdAt).toLocaleDateString()}</td><td><select className="status-select" value={x.status} onChange={e=>status(x._id,e.target.value)}>{["new","contacted","appointment_requested","lost",...(x.status==="converted"?["converted"]:[])].map(s=><option key={s}>{s}</option>)}</select></td><td>{x.status!=="converted"?<button className="small-action" onClick={()=>startBooking(x)}>Book</button>:<span className="muted">Booked</span>}</td></tr>)}</tbody></table></div>:<Empty title="No enquiries yet" text="Add your first enquiry to start using the CRM."/>}
    </section>
  </div>;
}

function Appointments() {
  const [items,setItems]=useState([]),[show,setShow]=useState(false),[error,setError]=useState("");
  const [form,setForm]=useState({patientName:"",phone:"",service:"",date:"",time:"",durationMinutes:"30"});
  async function load(){try{const d=await api("/appointments");setItems(d.items);}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[]);
  async function create(e){e.preventDefault();setError("");try{await api("/appointments",{method:"POST",body:JSON.stringify({patientName:form.patientName,phone:form.phone,service:form.service,date:form.date,time:form.time,durationMinutes:Number(form.durationMinutes),source:"manual"})});setShow(false);setForm({patientName:"",phone:"",service:"",date:"",time:"",durationMinutes:"30"});load();}catch(e){setError(e.message);}}
  async function setStatus(id,status){try{await api(`/appointments/${id}`,{method:"PATCH",body:JSON.stringify({status})});load();}catch(e){setError(e.message);}}
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">SCHEDULING</p><h1>Appointments</h1><p className="muted">Choose from available clinic slots and manage visits.</p></div><button className="primary" onClick={()=>setShow(!show)}><Plus size={17}/> New appointment</button></div>
    {error&&<div className="error">{error}</div>}
    {show&&<form className="panel form-grid" onSubmit={create}><label>Patient name<input required value={form.patientName} onChange={e=>setForm({...form,patientName:e.target.value})}/></label><label>Phone<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Service<input value={form.service} onChange={e=>setForm({...form,service:e.target.value})}/></label><label>Date<input type="date" required min={new Intl.DateTimeFormat("en-CA").format(new Date())} value={form.date} onChange={e=>setForm({...form,date:e.target.value,time:""})}/></label><label>Duration<select value={form.durationMinutes} onChange={e=>setForm({...form,durationMinutes:e.target.value,time:""})}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select></label><SlotPicker date={form.date} durationMinutes={form.durationMinutes} value={form.time} onChange={time=>setForm({...form,time})}/><div className="form-actions"><button className="primary" disabled={!form.date||!form.time}>Create appointment</button><button type="button" className="secondary" onClick={()=>setShow(false)}>Cancel</button></div></form>}
    <section className="panel"><div className="panel-head"><div><h2>Appointment list</h2><p className="muted">{items.length} appointments</p></div></div>
      {items.length?<div className="table-wrap"><table><thead><tr><th>Patient</th><th>Service</th><th>Date & time</th><th>Status</th><th>Update</th></tr></thead><tbody>{items.map(a=><tr key={a._id}><td><b>{a.patientName}</b><small>{a.phone}</small></td><td>{a.service||"—"}</td><td>{new Date(a.startsAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"})}</td><td><span className={`pill ${a.status}`}>{a.status}</span></td><td><select className="status-select" value={a.status} onChange={e=>setStatus(a._id,e.target.value)}>{["requested","confirmed","completed","cancelled","no_show"].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>:<Empty title="No appointments scheduled" text="Create an appointment to see it here."/>}
    </section>
  </div>;
}

function ClinicSettings() {
  const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const [clinic,setClinic]=useState(null),[error,setError]=useState(""),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{api("/clinic/settings").then(d=>setClinic(d.clinic)).catch(e=>setError(e.message));},[]);
  function changeHours(day,key,value){setClinic(current=>({...current,businessHours:{...current.businessHours,[day]:{...current.businessHours[day],[key]:value}}}));}
  async function save(e){e.preventDefault();setError("");setSaved(false);setBusy(true);try{const d=await api("/clinic/settings",{method:"PATCH",body:JSON.stringify({name:clinic.name,phone:clinic.phone,address:clinic.address,timezone:clinic.timezone,businessHours:clinic.businessHours})});setClinic(d.clinic);setSaved(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
  if(!clinic&&!error)return <div className="loading">Loading clinic settings…</div>;
  if(!clinic)return <div className="page"><div className="error">{error}</div></div>;
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">WORKSPACE CONFIGURATION</p><h1>Clinic settings</h1><p className="muted">Set your clinic details and opening hours. Slot availability uses these hours.</p></div></div>
    {error&&<div className="error">{error}</div>}{saved&&<div className="success">Settings saved successfully.</div>}
    <form className="panel form-grid" onSubmit={save}><label>Clinic name<input required maxLength="120" value={clinic.name} onChange={e=>setClinic({...clinic,name:e.target.value})}/></label><label>Clinic phone<input value={clinic.phone||""} onChange={e=>setClinic({...clinic,phone:e.target.value})}/></label><label className="span-2">Address<input value={clinic.address||""} onChange={e=>setClinic({...clinic,address:e.target.value})}/></label><label>Timezone<input required value={clinic.timezone} onChange={e=>setClinic({...clinic,timezone:e.target.value})} placeholder="Asia/Kolkata"/><small className="muted">Use an IANA timezone, e.g. Asia/Kolkata.</small></label>
      <div className="span-2"><h2>Weekly business hours</h2><p className="muted">Appointments can only be booked inside these hours.</p></div>
      <div className="hours-grid span-2">{days.map(day=>{const hours=clinic.businessHours?.[day]||{isOpen:false,open:"09:00",close:"18:00"};return <div className="hours-row" key={day}><label className="day-toggle"><input type="checkbox" checked={Boolean(hours.isOpen)} onChange={e=>changeHours(day,"isOpen",e.target.checked)}/><span>{day[0].toUpperCase()+day.slice(1)}</span></label><label>Opens<input type="time" value={hours.open} disabled={!hours.isOpen} onChange={e=>changeHours(day,"open",e.target.value)}/></label><label>Closes<input type="time" value={hours.close} disabled={!hours.isOpen} onChange={e=>changeHours(day,"close",e.target.value)}/></label></div>})}</div>
      <div className="form-actions"><button className="primary" disabled={busy}>{busy?"Saving…":"Save settings"}</button></div>
    </form>
  </div>;
}

export default function App() {
  const [user,setUser]=useState(null),[checking,setChecking]=useState(true),navigate=useNavigate();
  useEffect(()=>{const token=localStorage.getItem("dentalos_token");if(!token){setChecking(false);return;}api("/auth/me").then(d=>setUser(d.user)).catch(()=>localStorage.removeItem("dentalos_token")).finally(()=>setChecking(false));},[]);
  function logout(){localStorage.removeItem("dentalos_token");setUser(null);navigate("/");}
  if(checking)return <div className="loading">Loading DentalOS…</div>;
  if(!user)return <Auth onAuth={u=>setUser(u)}/>;
  return <Shell user={user} onLogout={logout}><Routes><Route path="/" element={<Overview/>}/><Route path="/leads" element={<Leads/>}/><Route path="/appointments" element={<Appointments/>}/><Route path="/settings" element={<ClinicSettings/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Shell>;
}
