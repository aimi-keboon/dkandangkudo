/**
 * D'Kandang Kudo — Google Sheets + Stripe Checkout.
 * Separate Apps Script deployment. Nothing charges until DKK_CHECKOUT_ENABLED=true.
 * Do not store Stripe secrets in GitHub or Sheets.
 */
const DKK = Object.freeze({
  outride: "Outride Bookings",
  membership: "Membership Registrations",
  riders: "Outride Riders",
  baseUrl: "https://dkandangkudo.com",
  ridingPrices: {"lesson-trial":7500,"lesson-5":45000,"lesson-10":85000,"paddock-hour":10000},
  rentalCents: 1500,
  membershipCents: 5000,
  maxPax: 10,
  // Existing LIVE Stripe subscription price for D'Kandang Kudo Stable Membership.
  membershipPriceId: "price_1UEnG7L8CyJDBl205qCoFbh9",

  experiences: ["Beginner", "Intermediate", "Experienced"]
});
const OUT_HEADERS = [
  "Submitted At","Booking ID","Booking Status","Payment Status","Name","Phone","Email",
  "Pax","Price / Pax (RM)","Total (RM)","Ride Date","Session","Notes",
  "Timing Acknowledged","Source",
  "Stripe Session ID","Stripe Customer ID","Payment Confirmed At","Last Checked At",
  "Helmet Count","Boots Count","Rental Total (RM)","Riding Option","Paddock Hours","Preferred Time"
];
const MEM_HEADERS = [
  "Submitted At","Member Registration ID","Registration Status","Payment Status","Name","Phone",
  "Email","Riding Experience","Monthly Fee (RM)","Billing","Source",
  "Stripe Session ID","Stripe Customer ID","Stripe Subscription ID",
  "Latest Invoice ID","Payment Confirmed At","Last Checked At","Subscription Status"
];
const RIDER_HEADERS = [
  "Booking ID","Rider Number","Full Name","Mobile","Weight (kg)",
  "Experience","Helmet Rental","Boots Rental"
];

function props_() { return PropertiesService.getScriptProperties(); }
function sheetBook_() {
  const id = String(props_().getProperty("DKK_SPREADSHEET_ID") || "");
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error("Set DKK_SPREADSHEET_ID");
  return SpreadsheetApp.openById(id);
}
function ensureSheet_(book, name, headers) {
  let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(),headers.length-sheet.getMaxColumns());
  }
  const oldWidth = Math.min(sheet.getLastColumn(),headers.length);
  if (sheet.getLastRow() > 0 && oldWidth > 0) {
    const existing = sheet.getRange(1,1,1,oldWidth).getValues()[0];
    if (existing.some((h,i) => String(h) !== headers[i]))
      throw new Error("Unexpected columns in " + name + ". No data changed.");
  }
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  sheet.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#20533b").setFontColor("#fff");
  sheet.setFrozenRows(1);
  return sheet;
}
function setupDkkCheckout() {
  const book = sheetBook_();
  ensureSheet_(book,DKK.outride,OUT_HEADERS);
  ensureSheet_(book,DKK.membership,MEM_HEADERS);
  ensureSheet_(book,DKK.riders,RIDER_HEADERS);
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === "syncDkkPayments")) {
    ScriptApp.newTrigger("syncDkkPayments").timeBased().everyMinutes(5).create();
  }
  return book.getUrl();
}
function stripe_(method,path,fields) {
  const secret = String(props_().getProperty("DKK_STRIPE_SECRET_KEY") || "");
  if (!/^sk_live_/.test(secret)) throw new Error("A live Stripe secret key is required in DKK_STRIPE_SECRET_KEY");
  const options = {
    method:method,
    headers:{"Authorization":"Bearer "+secret},
    muteHttpExceptions:true
  };
  if (method === "post") {
    options.contentType="application/x-www-form-urlencoded";
    options.payload=Object.keys(fields||{}).map(k =>
      encodeURIComponent(k)+"="+encodeURIComponent(fields[k])).join("&");
  }
  const res=UrlFetchApp.fetch("https://api.stripe.com/v1"+path,options);
  if (res.getResponseCode()<200 || res.getResponseCode()>=300)
    throw new Error("Stripe API error "+res.getResponseCode());
  return JSON.parse(res.getContentText());
}
function validEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||"").trim()); }
function validPhone_(v) { return /^\+?[0-9 ()-]{7,24}$/.test(String(v||"").trim()); }
function safe_(v) {
  const s=String(v===undefined||v===null?"":v).trim().slice(0,3800);
  return /^[=+@-]/.test(s)?"'"+s:s;
}
function esc_(v) {
  return String(v||"").replace(/[&<>"']/g,c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function reference_(kind) {
  return "DKK-"+kind+"-"+Utilities.formatDate(new Date(),"Asia/Kuala_Lumpur","yyyyMMdd-HHmmss")+"-"+
    Utilities.getUuid().replace(/-/g,"").slice(0,6).toUpperCase();
}
function rateLimit_(email,phone) {
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,email+"|"+phone);
  const key="dkk_"+digest.map(n=>("0"+(n&255).toString(16)).slice(-2)).join("").slice(0,40);
  const lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cache=CacheService.getScriptCache();
    const count=Number(cache.get(key)||"0");
    if(count>=5)throw new Error("Too many attempts. Please try later.");
    cache.put(key,String(count+1),900);
  } finally { lock.releaseLock(); }
}
function eligibleDate_(text) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return false;
  const date=new Date(text+"T12:00:00+08:00");
  if(!Number.isFinite(date.getTime()) || Utilities.formatDate(date,"Asia/Kuala_Lumpur","yyyy-MM-dd")!==text) return false;
  const today=Utilities.formatDate(new Date(),"Asia/Kuala_Lumpur","yyyy-MM-dd");
  return text>=today;
}
function validRideDate_(text) {
  if(!eligibleDate_(text))return false;
  const date=new Date(text+"T12:00:00+08:00");
  return date.getUTCDay()!==1; // Malaysia local noon has the same calendar weekday in UTC
}
function parseRiding_(p) {
  const name=String(p.name||"").trim(), phone=String(p.phone||"").trim(),email=String(p.email||"").trim();
  const pax=Number(p.pax),service=String(p.service||""),date=String(p.date||"");
  const hours=service==="paddock-hour"?Number(p.hours):1;
  const preferredTime=String(p.preferred_time||"");
  const unitCents=DKK.ridingPrices[service];
  if(!name || name.length>120 || !validPhone_(phone) || !validEmail_(email) ||
    !Number.isInteger(pax) || pax<1 || pax>DKK.maxPax ||
    !Object.prototype.hasOwnProperty.call(DKK.ridingPrices,service) ||
    !Number.isInteger(hours) || hours<1 || hours>8 ||
    !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(preferredTime) ||
    !validRideDate_(date) || p.timing_ack!=="yes")
    throw new Error("Please check the booking contact, date, session, and rider count.");
  const json=String(p.riders_json||"");
  if(json.length>18000)throw new Error("Too much rider information.");
  let riders;
  try { riders=JSON.parse(json); } catch (_) { throw new Error("Rider details are invalid."); }
  if(!Array.isArray(riders)||riders.length!==pax) throw new Error("Details for all riders are required.");
  const sanitized=riders.map((r,i)=>{
    if(!r || typeof r!=="object" || Array.isArray(r))throw new Error("Invalid rider "+(i+1));
    const riderName=String(r.name||"").trim(),mobile=String(r.phone||"").trim();
    const weight=Number(r.weight),experience=String(r.experience||"");
    if(!riderName || riderName.length>120 || !validPhone_(mobile) ||
       !Number.isFinite(weight) || weight<20 || weight>250 ||
       !DKK.experiences.includes(experience) || typeof r.helmet!=="boolean" ||
       typeof r.boots!=="boolean")
      throw new Error("Please complete name, mobile, weight, experience and rentals for rider "+(i+1)+".");
    return {name:riderName,phone:mobile,weight,experience,helmet:r.helmet,boots:r.boots};
  });
  const helmets=sanitized.filter(r=>r.helmet).length;
  const boots=sanitized.filter(r=>r.boots).length;
  const totalCents=pax*unitCents*hours+(helmets+boots)*DKK.rentalCents;
  return {name,phone,email,pax,date,service,hours,preferredTime,unitCents,riders:sanitized,helmets,boots,
    totalCents,notes:String(p.notes||"").trim().slice(0,1500)};
}
function validateMembership_(p) {
  const name=String(p.name||"").trim(),phone=String(p.phone||"").trim(),
    email=String(p.email||"").trim(),exp=String(p.experience||"");
  if(!name || name.length>120 || !validPhone_(phone) || !validEmail_(email) ||
     !DKK.experiences.includes(exp) || p.subscription_ack!=="yes")
    throw new Error("Please complete membership details and accept recurring billing.");
  return {name,phone,email,experience:exp};
}
function addLine_(fields,index,name,amount,quantity) {
  fields["line_items["+index+"][price_data][currency]"]="myr";
  fields["line_items["+index+"][price_data][unit_amount]"]=String(amount);
  fields["line_items["+index+"][price_data][product_data][name]"]=name;
  fields["line_items["+index+"][quantity]"]=String(quantity);
}
function saveRiding_(order,session,id) {
  const lock=LockService.getScriptLock();lock.waitLock(25000);
  try {
    const book=sheetBook_();
    const main=book.getSheetByName(DKK.outride),riders=book.getSheetByName(DKK.riders);
    if(!main||!riders)throw new Error("Run setupDkkCheckout first");
    const values=[new Date(),id,"Awaiting payment","Pending",safe_(order.name),safe_(order.phone),
      safe_(order.email),order.pax,order.unitCents/100,order.totalCents/100,order.date,order.preferredTime,
      safe_(order.notes),"Yes","riding-booking",safe_(session.id),"","","",
      order.helmets,order.boots,(order.helmets+order.boots)*15,
      safe_(order.service),order.hours,safe_(order.preferredTime)];
    main.appendRow(values);
    const riderRows=order.riders.map((r,i)=>[id,i+1,safe_(r.name),safe_(r.phone),r.weight,
      r.experience,r.helmet?"Yes":"No",r.boots?"Yes":"No"]);
    riders.getRange(riders.getLastRow()+1,1,riderRows.length,RIDER_HEADERS.length).setValues(riderRows);
    SpreadsheetApp.flush();
  } finally {lock.releaseLock();}
}
function saveMember_(data,session,id) {
  const lock=LockService.getScriptLock();lock.waitLock(25000);
  try {
    const sheet=sheetBook_().getSheetByName(DKK.membership);
    if(!sheet)throw new Error("Run setupDkkCheckout first");
    sheet.appendRow([new Date(),id,"Awaiting payment","Pending",safe_(data.name),
      safe_(data.phone),safe_(data.email),data.experience,50,"Monthly","membership-registration",
      safe_(session.id),"","","","","",""]);
    SpreadsheetApp.flush();
  } finally {lock.releaseLock();}
}
function doPost(e) {
  try {
    const p=e&&e.parameter||{};
    if(String(p.flowerpot||"").trim())return page_("Thank you.",null);
    if(props_().getProperty("DKK_CHECKOUT_ENABLED")!=="true")
      return page_("Secure checkout is not enabled yet. Please contact the stable.",null);
    const source=String(p.source||"");
    if(source==="riding-booking") {
      const o=parseRiding_(p);
      rateLimit_(o.email,o.phone);
      const id=reference_("RID");
      const f={
        mode:"payment",customer_email:o.email,"client_reference_id":id,
        "metadata[booking_id]":id,
        success_url:DKK.baseUrl+"/booking.html?checkout=success&ref="+encodeURIComponent(id),
        cancel_url:DKK.baseUrl+"/booking.html?checkout=cancel"
      };
      const productNames={"lesson-trial":"Trial lessons (2 sessions)","lesson-5":"Horse riding lessons (5 sessions)",
         "lesson-10":"Horse riding lessons (10 sessions)","paddock-hour":"Paddock riding (hourly)"};
       addLine_(f,0,productNames[o.service],o.unitCents,o.pax*o.hours);
      let item=1;
      if(o.helmets)addLine_(f,item++,"Helmet rental",DKK.rentalCents,o.helmets);
      if(o.boots)addLine_(f,item++,"Boots rental",DKK.rentalCents,o.boots);
      const session=stripe_("post","/checkout/sessions",f);
      // Never send a rider to checkout if Stripe's total differs from our server calculation.
      // Existing static Payment Links cannot satisfy this check.
      assertCheckoutTotal_(session, {
        id: id, mode: "payment", totalCents: o.totalCents
      });
      try { saveRiding_(o,session,id); }
      catch(err) { expire_(session.id);throw err; }
      return page_("Booking "+id+" recorded. Continue to secure Stripe payment (RM"+(o.totalCents/100).toFixed(2)+"). Your ride remains subject to stable confirmation.",session.url);
    }
    if(source==="membership-registration") {
       return page_("New memberships are no longer offered. Please contact the stable about an existing membership.",null);
     }
     if(false && source==="membership-registration") {
      const m=validateMembership_(p);rateLimit_(m.email,m.phone);
      const priceId=DKK.membershipPriceId;
      if(!/^price_[A-Za-z0-9]+$/.test(priceId))throw new Error("Subscription price is not configured.");
      const price=stripe_("get","/prices/"+encodeURIComponent(priceId));
      if(!price.livemode||!price.active||price.currency!=="myr"||price.unit_amount!==DKK.membershipCents||
          !price.recurring||price.recurring.interval!=="month"||price.recurring.interval_count!==1)
        throw new Error("The Stripe membership price must be recurring RM50/month.");
      const id=reference_("MEM");
      const f={
        mode:"subscription",customer_email:m.email,"client_reference_id":id,
        "metadata[registration_id]":id,
        "subscription_data[metadata][registration_id]":id,
        "line_items[0][price]":priceId,"line_items[0][quantity]":"1",
        success_url:DKK.baseUrl+"/membership.html?checkout=success&ref="+encodeURIComponent(id),
        cancel_url:DKK.baseUrl+"/membership.html?checkout=cancel"
      };
      const session=stripe_("post","/checkout/sessions",f);
      // Membership is a fixed RM50 monthly subscription; verify its initial total.
      assertCheckoutTotal_(session, {
        id: id, mode: "subscription", totalCents: DKK.membershipCents
      });
      try {saveMember_(m,session,id);} catch(err){expire_(session.id);throw err;}
      return page_("Registration "+id+" saved. Continue to secure Stripe to start your RM50/month subscription.",session.url);
    }
    return page_("Unrecognised request.",null);
  } catch(err) {
    console.warn("Checkout failed: "+err.message);
    return page_("Unable to prepare checkout: "+err.message+" Please review your details or contact the stable.",null);
  }
}
function validCheckout_(s) {
  return s&&/^cs_(test_)?[A-Za-z0-9_]+$/.test(String(s.id||""))&&
    /^https:\/\/checkout\.stripe\.com\//.test(String(s.url||""));
}
/**
 * Fail closed if Stripe returns a payment URL with an unexpected total.
 * The booking displayed total is not trusted: parseRiding_ independently
 * validates each rider and rental choice, then computes expected cents.
 */
function assertCheckoutTotal_(session, expected) {
  const valid = validCheckout_(session) &&
    session.mode === expected.mode &&
    session.currency === "myr" &&
    Number.isInteger(session.amount_total) &&
    session.amount_total === expected.totalCents &&
    session.client_reference_id === expected.id &&
    !session.payment_link;
  if (!valid) {
    if (session && /^cs_(test_)?[A-Za-z0-9_]+$/.test(String(session.id || ""))) {
      expire_(session.id);
    }
    throw new Error("Stripe checkout total did not match the calculated booking amount. No payment link was issued.");
  }
}

function expire_(id) {
  try{stripe_("post","/checkout/sessions/"+encodeURIComponent(id)+"/expire",{});}
  catch(err){console.warn("Could not expire untracked checkout: "+err.message);}
}
function doGet(){return page_("Please start your riding booking on dkandangkudo.com.",null);}
function page_(message,url) {
  const safeUrl=url&&/^https:\/\/checkout\.stripe\.com\//.test(url)?url:"";
  const action=safeUrl?
    '<a class="btn" href="'+esc_(safeUrl)+'" target="_top">Continue to secure Stripe payment</a>':
    '<a class="btn" href="'+DKK.baseUrl+'" target="_top">Return to D’Kandang Kudo</a>';
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>D’Kandang Kudo Checkout</title><style>body{margin:0;background:#f7f6f1;color:#19281f;font:16px/1.6 system-ui,sans-serif;'+
    'display:grid;place-items:center;min-height:95vh;padding:20px;box-sizing:border-box}.panel{max-width:520px;padding:34px;'+
    'border:1px solid #e2e7df;border-radius:20px;background:#fff}.btn{display:inline-block;margin-top:16px;'+
    'background:#20533b;color:#fff;padding:14px 20px;border-radius:40px;text-decoration:none;font-weight:700}</style></head>'+ 
    '<body><main class="panel"><h1>D’Kandang Kudo Stable</h1><p>'+esc_(message)+'</p>'+action+
    '<p><small>Stripe processes payment. Returning to the website alone does not prove payment. The stable confirms all ride bookings separately.</small></p>'+
    '</main></body></html>').setTitle("D’Kandang Kudo — Checkout");
}
/**
 * Time-based polling (no incoming Stripe webhook; Apps Script doesn't expose headers
 * required to validate Stripe-Signature). Only a verified Stripe API response marks Paid.
 * Keep old rows unchanged if they have no Stripe session.
 */
function syncDkkPayments() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))return;
  try {
    const book=sheetBook_();
    syncOutrides_(book.getSheetByName(DKK.outride));
    syncMemberships_(book.getSheetByName(DKK.membership));
  } finally{lock.releaseLock();}
}
function syncOutrides_(sheet) {
  if(!sheet||sheet.getLastRow()<2)return;
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,OUT_HEADERS.length).getValues();
  let processed=0;
  for(let i=rows.length-1;i>=0&&processed<40;i--){
    const row=rows[i],id=String(row[1]),sessionId=String(row[15]||"");
    const previous=String(row[3]||"");
    if(!/^cs_(test_)?[A-Za-z0-9_]+$/.test(sessionId)||
      ["Paid","Expired","Review"].includes(previous))continue;
    processed++;
    try {
      const session=stripe_("get","/checkout/sessions/"+encodeURIComponent(sessionId));
      const expected=Math.round(Number(row[9])*100);
      if(session.client_reference_id!==id||session.currency!=="myr"||
        session.amount_total!==expected||session.mode!=="payment") {
        sheet.getRange(i+2,4).setValue("Review");continue;
      }
      let status="Pending",booking="Awaiting payment";
      if(session.status==="complete"&&session.payment_status==="paid") {
        status="Paid";booking="Awaiting stable confirmation";
        sheet.getRange(i+2,18).setValue(new Date());
        if(session.customer)sheet.getRange(i+2,17).setValue(safe_(session.customer));
      } else if(session.status==="expired") {
        status="Expired";booking="Payment not completed";
      } else if(session.status==="complete")status="Processing";
      sheet.getRange(i+2,3).setValue(booking);
      sheet.getRange(i+2,4).setValue(status);
      sheet.getRange(i+2,19).setValue(new Date());
      if(status==="Paid"&&previous!=="Paid")notifyPaid_(String(row[6]),id,"Riding payment verified. Your ride is awaiting stable confirmation.");
    } catch(err){console.warn("Riding sync error "+id+": "+err.message);}
  }
}
function syncMemberships_(sheet) {
  if(!sheet||sheet.getLastRow()<2)return;
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,MEM_HEADERS.length).getValues();
  let processed=0;
  for(let i=rows.length-1;i>=0&&processed<40;i--){
    const r=rows[i],id=String(r[1]),sessionId=String(r[11]||"");
    if(!/^cs_(test_)?[A-Za-z0-9_]+$/.test(sessionId))continue;
    processed++;
    try {
      const session=stripe_("get","/checkout/sessions/"+encodeURIComponent(sessionId));
      if(session.client_reference_id!==id||session.mode!=="subscription"||
         session.currency!=="myr"||session.amount_total!==DKK.membershipCents) {
        sheet.getRange(i+2,4).setValue("Review");continue;
      }
      if(session.customer)sheet.getRange(i+2,13).setValue(safe_(session.customer));
      const subId=typeof session.subscription==="string"?session.subscription:
        String(r[13]||"");
      let status="Pending",memberStatus="Awaiting payment",subStatus="",invoiceId="";
      if(subId&&/^sub_[A-Za-z0-9]+$/.test(subId)){
        const sub=stripe_("get","/subscriptions/"+encodeURIComponent(subId));
        subStatus=String(sub.status||"");
        invoiceId=typeof sub.latest_invoice==="string"?sub.latest_invoice:
          sub.latest_invoice&&sub.latest_invoice.id||"";
        let invoicePaid=false;
        if(invoiceId){
          const invoice=stripe_("get","/invoices/"+encodeURIComponent(invoiceId));
          invoicePaid=invoice.paid===true&&invoice.status==="paid";
        }
        if(subStatus==="active"&&invoicePaid){
          status="Paid";memberStatus="Active";
        } else if(subStatus==="past_due"||subStatus==="unpaid"){
          status="Payment issue";memberStatus="Payment issue";
        } else if(["canceled","incomplete_expired"].includes(subStatus)){
          status="Expired";memberStatus="Inactive";
        } else if(subStatus==="active") {
          status="Processing";memberStatus="Awaiting payment verification";
        } else if(subStatus==="trialing"){
          status="Review";memberStatus="Requires review";
        }
        sheet.getRange(i+2,14).setValue(safe_(subId));
        sheet.getRange(i+2,15).setValue(safe_(invoiceId));
      } else if(session.status==="expired"){
        status="Expired";memberStatus="Registration expired";
      } else if(session.status==="complete"){
        status="Processing";
      }
      const previous=String(r[3]);
      sheet.getRange(i+2,3).setValue(memberStatus);
      sheet.getRange(i+2,4).setValue(status);
      sheet.getRange(i+2,17).setValue(new Date());
      sheet.getRange(i+2,18).setValue(safe_(subStatus));
      if(status==="Paid"&&previous!=="Paid"){
        sheet.getRange(i+2,16).setValue(new Date());
        notifyPaid_(String(r[6]),id,"Your RM50/month membership payment is verified. Your subscription is active.");
      }
    }catch(err){console.warn("Membership sync error "+id+": "+err.message);}
  }
}
function notifyPaid_(to,id,text) {
  if(!validEmail_(to))return;
  try{
    MailApp.sendEmail({to,subject:"D'Kandang Kudo — "+id,body:text+"\nReference: "+id+
      "\nContact: +60 19-258 4291",name:"D'Kandang Kudo Stable"});
    const admin=String(props_().getProperty("DKK_ADMIN_EMAIL")||"");
    if(validEmail_(admin))MailApp.sendEmail({to:admin,
      subject:"Payment update — "+id,body:text+"\nReference: "+id,
      name:"D'Kandang Kudo Stable"});
  }catch(err){console.warn("Payment email failed: "+err.message);}
}


/** Test pricing and reject old outrides without charging Stripe. */
function testDkkBookingValidation() {
  const now=new Date();
  let date="";
  for(let i=1;i<=8;i++){
    const d=Utilities.formatDate(new Date(now.getTime()+i*86400000),"Asia/Kuala_Lumpur","yyyy-MM-dd");
    if(validRideDate_(d)){date=d;break;}
  }
  for(const service in DKK.ridingPrices){
    const p={name:"Test",phone:"+60111111111",email:"test@example.com",pax:"2",
      date:date,service:service,hours:service==="paddock-hour"?"3":"1",
      preferred_time:"10:00",timing_ack:"yes",
      riders_json:JSON.stringify([
        {name:"Rider A",phone:"+60111111111",weight:65,experience:"Beginner",helmet:true,boots:false},
        {name:"Rider B",phone:"+60122222222",weight:72,experience:"Intermediate",helmet:false,boots:true}
      ])};
    const order=parseRiding_(p);
    const expected=2*DKK.ridingPrices[service]*(service==="paddock-hour"?3:1)+3000;
    if(order.totalCents!==expected)throw new Error("Pricing mismatch for "+service);
  }
  const old={name:"Test",phone:"+60111111111",email:"test@example.com",pax:"1",
    date:date,service:"outride",preferred_time:"10:00",timing_ack:"yes",riders_json:"[]"};
  let rejected=false;
  try{parseRiding_(old);}catch(e){rejected=true;}
  if(!rejected)throw new Error("Retired outride accepted");
  console.log("All service prices, rentals and retired outride rejection validated; no charges created.");
}
