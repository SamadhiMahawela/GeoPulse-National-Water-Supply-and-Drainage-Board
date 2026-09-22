(function(){
  "use strict";

  /* ---------------- storage keys ---------------- */
  var SURVEYS_KEY = "ves_surveys_v1";
  var DRAFT_KEY   = "ves_draft_v1";
  var PROFILE_KEY = "ves_profile_v1";
  var THEME_KEY   = "ves_theme_v1";
  var SYNC_KEY    = "ves_sync_settings_v1";
  var DEVICE_KEY  = "ves_device_id_v1";

  /* ---------------- utilities ---------------- */
  function uid(){ return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function $(id){ return document.getElementById(id); }
  function toast(msg){
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._h);
    toast._h = setTimeout(function(){ t.classList.remove("show"); }, 2200);
  }
  function todayISO(){
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }
  function fmtNum(v){
    if (v === null || v === undefined || v === "" || isNaN(v)) return "—";
    var n = Number(v);
    if (Math.abs(n) >= 1000) return n.toLocaleString(undefined,{maximumFractionDigits:1});
    if (Math.abs(n) >= 1) return n.toLocaleString(undefined,{maximumFractionDigits:2});
    return n.toLocaleString(undefined,{maximumFractionDigits:4});
  }
  function generateChartId(){
    var d = new Date();
    var ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0");
    var suffix = Math.random().toString(36).slice(2,6).toUpperCase();
    return "VES-" + ymd + "-" + suffix;
  }
  function ensureChartId(survey){
    if (!survey.chartId) survey.chartId = generateChartId();
    return survey;
  }

  /* ---------------- state ---------------- */
  var emptyReading = function(){ return {id: uid(), ab2:"", mn2:"", rho:""}; };
  var current = {
    id: uid(),
    siteName:"", clientName:"", chartId: generateChartId(), lat:"", lng:"", date: todayISO(), vesNo:"",
    operator:"", array:"Schlumberger", remarks:"",
    readings: [emptyReading(), emptyReading(), emptyReading(), emptyReading()],
    attachments: [],
    createdAt: Date.now(), updatedAt: Date.now()
  };

  function safeSetItem(key, value){
    try{ localStorage.setItem(key, value); return true; }
    catch(e){ return false; }
  }

  function loadSurveys(){
    try{ return JSON.parse(localStorage.getItem(SURVEYS_KEY)) || []; }catch(e){ return []; }
  }
  function saveSurveys(list){
    return safeSetItem(SURVEYS_KEY, JSON.stringify(list));
  }
  function loadProfile(){
    try{
      return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {
        org:"National Water Supply & Drainage Board — Sri Lanka",
        office:"", contact:"", logo:""
      };
    }catch(e){
      return {org:"National Water Supply & Drainage Board — Sri Lanka", office:"", contact:"", logo:""};
    }
  }
  function saveProfile(p){ localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

  /* ---------------- device id ---------------- */
  function getDeviceId(){
    var id = localStorage.getItem(DEVICE_KEY);
    if (!id){ id = uid(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  }

  /* ---------------- server sync ---------------- */
  function loadSyncSettings(){
    try{ return JSON.parse(localStorage.getItem(SYNC_KEY)) || {baseUrl:"", apiKey:"", lastSync:0}; }
    catch(e){ return {baseUrl:"", apiKey:"", lastSync:0}; }
  }
  function saveSyncSettings(s){ localStorage.setItem(SYNC_KEY, JSON.stringify(s)); }

  function apiFetch(path, options){
    var s = loadSyncSettings();
    if (!s.baseUrl) return Promise.reject(new Error("No server configured"));
    var base = s.baseUrl.replace(/\/+$/,"");
    options = options || {};
    options.headers = Object.assign({
      "Content-Type": "application/json",
      "x-api-key": s.apiKey || ""
    }, options.headers || {});
    return fetch(base + path, options).then(function(res){
      if (!res.ok){
        return res.json().catch(function(){ return {}; }).then(function(body){
          throw new Error(body.error || ("Server responded " + res.status));
        });
      }
      return res.json();
    });
  }

  function surveyToPayload(s){
    return {
      siteName: s.siteName, clientName: s.clientName, chartId: s.chartId, lat: s.lat, lng: s.lng, date: s.date, vesNo: s.vesNo,
      operator: s.operator, array: s.array, remarks: s.remarks, readings: s.readings, attachments: s.attachments || [],
      createdAt: s.createdAt, updatedAt: s.updatedAt, deviceId: getDeviceId()
    };
  }
  function payloadToSurvey(id, p){
    return {
      id: id, siteName: p.siteName||"", clientName: p.clientName||"", chartId: p.chartId||"",
      lat: p.lat||"", lng: p.lng||"", date: p.date||"",
      vesNo: p.vesNo||"", operator: p.operator||"", array: p.array||"Schlumberger",
      remarks: p.remarks||"", readings: p.readings || [], attachments: p.attachments || [],
      createdAt: p.createdAt || Date.now(), updatedAt: p.updatedAt || Date.now()
    };
  }

  function pushSurvey(survey){
    return apiFetch("/api/surveys/" + encodeURIComponent(survey.id), {
      method: "PUT", body: JSON.stringify(surveyToPayload(survey))
    });
  }

  function pushAllLocal(){
    var list = loadSurveys();
    if (list.length === 0){ toast("No local surveys to push"); return; }
    toast("Pushing " + list.length + " survey(s)…");
    var chain = Promise.resolve();
    var ok = 0, fail = 0;
    list.forEach(function(s){
      chain = chain.then(function(){
        return pushSurvey(s).then(function(){ ok++; }).catch(function(){ fail++; });
      });
    });
    chain.then(function(){
      var s = loadSyncSettings(); s.lastSync = Date.now(); saveSyncSettings(s);
      renderLastSyncNote();
      toast("Pushed " + ok + " survey(s)" + (fail ? (", " + fail + " failed") : ""));
    });
  }

  function pullAll(){
    return apiFetch("/api/surveys", {method:"GET"}).then(function(rows){
      var local = loadSurveys();
      var byId = {};
      local.forEach(function(s){ byId[s.id] = s; });
      rows.forEach(function(row){
        var incoming = payloadToSurvey(row.id, row);
        var existing = byId[row.id];
        if (!existing || (incoming.updatedAt || 0) > (existing.updatedAt || 0)){
          byId[row.id] = incoming;
        }
      });
      var merged = Object.keys(byId).map(function(k){ return byId[k]; })
        .sort(function(a,b){ return (b.updatedAt||0) - (a.updatedAt||0); });
      saveSurveys(merged);
      var s = loadSyncSettings(); s.lastSync = Date.now(); saveSyncSettings(s);
      renderLastSyncNote();
      return merged;
    });
  }

  function renderLastSyncNote(){
    var el = $("lastSyncNote");
    if (!el) return;
    var s = loadSyncSettings();
    if (!s.baseUrl){ el.textContent = "Not connected to a server yet."; return; }
    el.textContent = s.lastSync
      ? ("Last synced: " + new Date(s.lastSync).toLocaleString())
      : "Connected — not synced yet.";
  }

  function saveDraft(){
    var ok = safeSetItem(DRAFT_KEY, JSON.stringify(current));
    if (!ok) toast("⚠ Storage is full — remove a photo/file or export & clear old surveys");
    return ok;
  }
  function loadDraft(){
    try{
      var d = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (d && d.readings && d.readings.length) return d;
    }catch(e){}
    return null;
  }

  /* ---------------- tabs ---------------- */
  var panels = {
    survey: $("panel-survey"), report: $("panel-report"),
    saved: $("panel-saved"), tools: $("panel-tools")
  };
  document.querySelectorAll(".tabbtn").forEach(function(btn){
    btn.addEventListener("click", function(){
      document.querySelectorAll(".tabbtn").forEach(function(b){ b.classList.remove("active"); });
      btn.classList.add("active");
      Object.keys(panels).forEach(function(k){ panels[k].classList.remove("active"); });
      var tab = btn.getAttribute("data-tab");
      panels[tab].classList.add("active");
      if (tab === "report") renderReport();
      if (tab === "saved") renderSavedList();
    });
  });

  /* ---------------- theme ---------------- */
  function applyTheme(t){
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
  }
  $("themeToggleBtn").addEventListener("click", function(){
    var cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  });
  applyTheme(localStorage.getItem(THEME_KEY) || "light");

  /* ---------------- form binding ---------------- */
  var formFields = {
    f_siteName:"siteName", f_clientName:"clientName", f_lat:"lat", f_lng:"lng", f_date:"date",
    f_vesNo:"vesNo", f_operator:"operator", f_array:"array", f_remarks:"remarks"
  };
  function fillFormFromState(){
    ensureChartId(current);
    if (!current.attachments) current.attachments = [];
    Object.keys(formFields).forEach(function(elId){
      $(elId).value = current[formFields[elId]] || "";
    });
    $("f_chartId").value = current.chartId;
    renderReadingsTable();
    renderChart();
    renderAttachments();
  }
  Object.keys(formFields).forEach(function(elId){
    $(elId).addEventListener("input", function(){
      current[formFields[elId]] = $(elId).value;
      current.updatedAt = Date.now();
      saveDraft();
    });
  });

  $("gpsBtn").addEventListener("click", function(){
    if (!navigator.geolocation){ toast("GPS not available on this device/browser"); return; }
    toast("Getting location…");
    navigator.geolocation.getCurrentPosition(function(pos){
      current.lat = pos.coords.latitude.toFixed(6);
      current.lng = pos.coords.longitude.toFixed(6);
      $("f_lat").value = current.lat;
      $("f_lng").value = current.lng;
      saveDraft();
      toast("Location captured");
    }, function(err){
      toast("Could not get location: " + err.message);
    }, {enableHighAccuracy:true, timeout:12000});
  });

  /* ---------------- readings table ---------------- */
  function renderReadingsTable(){
    var body = $("readingsBody");
    body.innerHTML = "";
    var flags = computeQcFlags(current.readings);
    current.readings.forEach(function(r, i){
      var tr = document.createElement("tr");

      var tdIdx = document.createElement("td");
      tdIdx.className = "idx";
      tdIdx.textContent = (i+1);
      if (flags[i]) {
        var flag = document.createElement("span");
        flag.className = "qc-flag";
        flag.title = flags[i];
        flag.textContent = " ⚠";
        tdIdx.appendChild(flag);
      }
      tr.appendChild(tdIdx);

      ["ab2","mn2","rho"].forEach(function(key){
        var td = document.createElement("td");
        var inp = document.createElement("input");
        inp.type = "text";
        inp.inputMode = "decimal";
        inp.value = r[key];
        inp.placeholder = key==="mn2" ? "opt." : "";
        inp.addEventListener("input", function(){
          r[key] = inp.value;
          current.updatedAt = Date.now();
          saveDraft();
          renderChart();
          renderQcNote();
        });
        td.appendChild(inp);
        tr.appendChild(td);
      });

      var tdActions = document.createElement("td");
      tdActions.className = "rowactions";

      var upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.innerHTML = "⬆";
      upBtn.title = "Insert row above";
      upBtn.addEventListener("click", function(){
        current.readings.splice(i, 0, emptyReading());
        saveDraft(); renderReadingsTable(); renderChart();
      });
      tdActions.appendChild(upBtn);

      var downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.innerHTML = "⬇";
      downBtn.title = "Insert row below";
      downBtn.addEventListener("click", function(){
        current.readings.splice(i+1, 0, emptyReading());
        saveDraft(); renderReadingsTable(); renderChart();
      });
      tdActions.appendChild(downBtn);

      var rmBtn = document.createElement("button");
      rmBtn.type = "button";
      rmBtn.className = "rm";
      rmBtn.innerHTML = "✕";
      rmBtn.title = "Remove row";
      rmBtn.addEventListener("click", function(){
        current.readings.splice(i,1);
        if (current.readings.length === 0) current.readings.push(emptyReading());
        saveDraft();
        renderReadingsTable();
        renderChart();
      });
      tdActions.appendChild(rmBtn);
      tr.appendChild(tdActions);

      body.appendChild(tr);
    });
    renderQcNote();
  }

  function computeQcFlags(readings){
    var flags = {};
    var parsed = readings.map(function(r){
      return {ab2: parseFloat(r.ab2), rho: parseFloat(r.rho)};
    });
    for (var i=0;i<parsed.length;i++){
      var p = parsed[i];
      if (p.ab2 && p.ab2 <= 0) flags[i] = "AB/2 must be greater than 0";
      if (p.rho !== "" && !isNaN(p.rho) && p.rho <= 0) flags[i] = "Resistivity must be greater than 0";
      if (i>0 && !isNaN(p.ab2) && !isNaN(parsed[i-1].ab2) && p.ab2 <= parsed[i-1].ab2 && p.ab2 && parsed[i-1].ab2){
        flags[i] = "AB/2 should increase with each row";
      }
      if (i>0 && !isNaN(p.rho) && !isNaN(parsed[i-1].rho) && p.rho>0 && parsed[i-1].rho>0){
        var ratio = p.rho / parsed[i-1].rho;
        if (ratio > 4 || ratio < 0.25){
          flags[i] = flags[i] ? flags[i] + " · large jump in ρa vs previous point — check reading" :
            "Large jump in ρa vs previous point — check reading";
        }
      }
    }
    return flags;
  }
  function renderQcNote(){
    var flags = computeQcFlags(current.readings);
    var n = Object.keys(flags).length;
    var box = $("qcNote");
    if (n === 0){ box.innerHTML = ""; return; }
    box.innerHTML = "<div class='note warn'>" + n + " row(s) flagged for review — check the ⚠ marks in the table. This is a data-entry sanity check only, not a geological judgement.</div>";
  }

  $("addRowBtn").addEventListener("click", function(){
    current.readings.push(emptyReading());
    saveDraft(); renderReadingsTable(); renderChart();
  });
  $("add5RowBtn").addEventListener("click", function(){
    for (var i=0;i<5;i++) current.readings.push(emptyReading());
    saveDraft(); renderReadingsTable(); renderChart();
  });
  $("clearRowsBtn").addEventListener("click", function(){
    if (!confirm("Clear all readings in this survey?")) return;
    current.readings = [emptyReading(), emptyReading(), emptyReading(), emptyReading()];
    saveDraft(); renderReadingsTable(); renderChart();
  });

  /* ---------------- chart (custom log-log SVG) ---------------- */
  function validReadings(){
    return current.readings
      .map(function(r){ return {ab2: parseFloat(r.ab2), rho: parseFloat(r.rho)}; })
      .filter(function(r){ return !isNaN(r.ab2) && !isNaN(r.rho) && r.ab2>0 && r.rho>0; })
      .sort(function(a,b){ return a.ab2 - b.ab2; });
  }

  function buildChartSVG(readings, opts){
    opts = opts || {};
    var W = 640, H = 460;
    var mL = 60, mR = 18, mT = 18, mB = 44;
    var plotW = W - mL - mR, plotH = H - mT - mB;

    var isDark = (document.documentElement.getAttribute("data-theme") === "dark");
    var col = {
      grid: isDark ? "#2C3742" : "#D6D0BE",
      gridMajor: isDark ? "#44515C" : "#B9B196",
      axis: isDark ? "#B7BEC3" : "#50575C",
      line: isDark ? "#E3A34D" : "#C67B2E",
      point: isDark ? "#12191E" : "#F6F4EE",
      pointStroke: isDark ? "#E3A34D" : "#A9631E",
      text: isDark ? "#EDEBE3" : "#1B1E1F"
    };

    if (readings.length < 2){
      return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none"/>' +
        '<text x="'+(W/2)+'" y="'+(H/2)+'" text-anchor="middle" font-family="sans-serif" font-size="14" fill="'+col.text+'">' +
        'Enter at least 2 valid readings (AB/2 &amp; ρa &gt; 0) to draw the curve</text></svg>';
    }

    var xs = readings.map(function(r){return r.ab2;});
    var ys = readings.map(function(r){return r.rho;});
    var xMinE = Math.floor(Math.log10(Math.min.apply(null, xs)));
    var xMaxE = Math.ceil(Math.log10(Math.max.apply(null, xs)));
    if (xMinE === xMaxE) xMaxE = xMinE + 1;
    var yMinE = Math.floor(Math.log10(Math.min.apply(null, ys)));
    var yMaxE = Math.ceil(Math.log10(Math.max.apply(null, ys)));
    if (yMinE === yMaxE) yMaxE = yMinE + 1;

    function xPix(v){ return mL + (Math.log10(v) - xMinE) / (xMaxE - xMinE) * plotW; }
    function yPix(v){ return mT + plotH - (Math.log10(v) - yMinE) / (yMaxE - yMinE) * plotH; }

    function decadeLabel(e){
      var v = Math.pow(10, e);
      if (v >= 1) return v.toLocaleString();
      return v.toString();
    }

    var svg = [];
    svg.push('<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" font-family="'+ '-apple-system,Segoe UI,Roboto,Arial,sans-serif' +'">');
    svg.push('<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none"/>');

    // minor + major gridlines, X
    for (var e = xMinE; e <= xMaxE; e++){
      var xMaj = xPix(Math.pow(10,e));
      svg.push('<line x1="'+xMaj+'" y1="'+mT+'" x2="'+xMaj+'" y2="'+(mT+plotH)+'" stroke="'+col.gridMajor+'" stroke-width="1"/>');
      svg.push('<text x="'+xMaj+'" y="'+(mT+plotH+16)+'" text-anchor="middle" font-size="10.5" fill="'+col.axis+'">'+decadeLabel(e)+'</text>');
      if (e < xMaxE){
        for (var m=2; m<=9; m++){
          var v = m * Math.pow(10,e);
          var xp = xPix(v);
          if (xp <= mL+plotW) svg.push('<line x1="'+xp+'" y1="'+mT+'" x2="'+xp+'" y2="'+(mT+plotH)+'" stroke="'+col.grid+'" stroke-width="0.6"/>');
        }
      }
    }
    // minor + major gridlines, Y
    for (var ey = yMinE; ey <= yMaxE; ey++){
      var yMaj = yPix(Math.pow(10,ey));
      svg.push('<line x1="'+mL+'" y1="'+yMaj+'" x2="'+(mL+plotW)+'" y2="'+yMaj+'" stroke="'+col.gridMajor+'" stroke-width="1"/>');
      svg.push('<text x="'+(mL-6)+'" y="'+(yMaj+3.5)+'" text-anchor="end" font-size="10.5" fill="'+col.axis+'">'+decadeLabel(ey)+'</text>');
      if (ey < yMaxE){
        for (var my=2; my<=9; my++){
          var vy = my * Math.pow(10,ey);
          var yp = yPix(vy);
          if (yp >= mT) svg.push('<line x1="'+mL+'" y1="'+yp+'" x2="'+(mL+plotW)+'" y2="'+yp+'" stroke="'+col.grid+'" stroke-width="0.6"/>');
        }
      }
    }

    // axes border
    svg.push('<rect x="'+mL+'" y="'+mT+'" width="'+plotW+'" height="'+plotH+'" fill="none" stroke="'+col.axis+'" stroke-width="1.1"/>');

    // axis titles
    svg.push('<text x="'+(mL+plotW/2)+'" y="'+(H-6)+'" text-anchor="middle" font-size="11.5" fill="'+col.text+'" font-weight="600">AB/2 (m)</text>');
    svg.push('<text x="14" y="'+(mT+plotH/2)+'" text-anchor="middle" font-size="11.5" fill="'+col.text+'" font-weight="600" transform="rotate(-90 14 '+(mT+plotH/2)+')">Apparent resistivity ρa (Ω·m)</text>');

    // polyline
    var pts = readings.map(function(r){ return xPix(r.ab2) + "," + yPix(r.rho); }).join(" ");
    svg.push('<polyline points="'+pts+'" fill="none" stroke="'+col.line+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>');

    // points
    readings.forEach(function(r){
      svg.push('<circle cx="'+xPix(r.ab2)+'" cy="'+yPix(r.rho)+'" r="4" fill="'+col.point+'" stroke="'+col.pointStroke+'" stroke-width="2"/>');
    });

    svg.push('</svg>');
    return svg.join("");
  }

  function renderChart(){
    var readings = validReadings();
    $("chartHost").innerHTML = buildChartSVG(readings);
  }

  /* ---------------- attachments (photos & files) ---------------- */
  function fmtBytes(n){
    if (n < 1024) return n + " B";
    if (n < 1024*1024) return (n/1024).toFixed(0) + " KB";
    return (n/(1024*1024)).toFixed(1) + " MB";
  }

  function readAsDataURL(file){
    return new Promise(function(resolve, reject){
      var r = new FileReader();
      r.onload = function(){ resolve(r.result); };
      r.onerror = function(){ reject(new Error("Could not read " + file.name)); };
      r.readAsDataURL(file);
    });
  }

  // Downscale + re-compress images before storing, so a handful of phone
  // photos don't blow through the browser's local-storage quota.
  function compressImageDataUrl(dataUrl, maxDim, quality){
    return new Promise(function(resolve, reject){
      var img = new Image();
      img.onload = function(){
        var w = img.width, h = img.height;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, cw, ch);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = function(){ reject(new Error("Could not process image")); };
      img.src = dataUrl;
    });
  }

  function processFile(file){
    var isImage = file.type.indexOf("image/") === 0;
    return readAsDataURL(file).then(function(raw){
      if (isImage){
        return compressImageDataUrl(raw, 1280, 0.72).catch(function(){ return raw; });
      }
      return raw;
    }).then(function(dataUrl){
      return {
        id: uid(),
        name: file.name,
        kind: isImage ? "image" : "file",
        mime: file.type || "",
        size: file.size,
        dataUrl: dataUrl,
        includeInReport: false,
        addedAt: Date.now()
      };
    });
  }

  function fileIconFor(att){
    if (att.kind === "image") return "";
    var m = (att.mime||"").toLowerCase();
    if (m.indexOf("pdf") >= 0) return "📄";
    if (m.indexOf("word") >= 0 || att.name.match(/\.docx?$/i)) return "📝";
    if (m.indexOf("sheet") >= 0 || att.name.match(/\.xlsx?$/i)) return "📊";
    return "📎";
  }

  function renderAttachments(){
    var host = $("attachmentsList");
    var list = current.attachments || [];
    host.innerHTML = "";
    list.forEach(function(att){
      var row = document.createElement("div");
      row.className = "attach-item";

      var thumb;
      if (att.kind === "image"){
        thumb = document.createElement("img");
        thumb.className = "thumb";
        thumb.src = att.dataUrl;
        thumb.alt = att.name;
      } else {
        thumb = document.createElement("div");
        thumb.className = "thumb";
        thumb.textContent = fileIconFor(att);
      }
      row.appendChild(thumb);

      var info = document.createElement("div");
      info.className = "info";
      var fname = document.createElement("div");
      fname.className = "fname";
      fname.textContent = att.name;
      var fmeta = document.createElement("div");
      fmeta.className = "fmeta";
      fmeta.innerHTML = '<span class="up-badge">Uploaded ✓</span> · ' + fmtBytes(att.size);
      info.appendChild(fname);
      info.appendChild(fmeta);
      row.appendChild(info);

      var controls = document.createElement("div");
      controls.className = "controls";

      var incLabel = document.createElement("label");
      incLabel.className = "inc";
      var incBox = document.createElement("input");
      incBox.type = "checkbox";
      incBox.checked = !!att.includeInReport;
      incBox.addEventListener("change", function(){
        att.includeInReport = incBox.checked;
        current.updatedAt = Date.now();
        saveDraft();
      });
      incLabel.appendChild(incBox);
      incLabel.appendChild(document.createTextNode("Include in report"));
      controls.appendChild(incLabel);

      var rmBtn = document.createElement("button");
      rmBtn.type = "button";
      rmBtn.className = "rmfile";
      rmBtn.innerHTML = "✕ remove";
      rmBtn.addEventListener("click", function(){
        current.attachments = current.attachments.filter(function(a){ return a.id !== att.id; });
        current.updatedAt = Date.now();
        saveDraft();
        renderAttachments();
      });
      controls.appendChild(rmBtn);

      row.appendChild(controls);
      host.appendChild(row);
    });

    var note = $("attachStorageNote");
    if (list.length === 0){
      note.textContent = "No files attached yet.";
    } else {
      var totalBytes = list.reduce(function(sum,a){ return sum + (a.size||0); }, 0);
      var inReport = list.filter(function(a){ return a.includeInReport; }).length;
      note.textContent = list.length + " file(s) attached (" + fmtBytes(totalBytes) + " total) — " +
        inReport + " selected for the report.";
    }
  }

  $("fileUploadInput").addEventListener("change", function(e){
    var files = Array.prototype.slice.call(e.target.files || []);
    if (!files.length) return;
    toast("Uploading " + files.length + " file(s)…");
    Promise.all(files.map(processFile)).then(function(newAtts){
      if (!current.attachments) current.attachments = [];
      var prev = current.attachments.slice();
      current.attachments = current.attachments.concat(newAtts);
      current.updatedAt = Date.now();
      var ok = saveDraft();
      if (!ok){
        current.attachments = prev;
        toast("Not enough storage for these files — try fewer/smaller files, or export & clear old surveys first");
      } else {
        toast(newAtts.length + " file(s) uploaded");
      }
      renderAttachments();
      $("fileUploadInput").value = "";
    }).catch(function(err){
      toast("Upload failed: " + err.message);
      $("fileUploadInput").value = "";
    });
  });

  /* ---------------- save / load survey ---------------- */
  $("saveSurveyBtn").addEventListener("click", function(){
    if (!current.siteName){ toast("Add a site name before saving"); return; }
    var list = loadSurveys();
    var idx = list.findIndex(function(s){ return s.id === current.id; });
    current.updatedAt = Date.now();
    if (idx >= 0) list[idx] = JSON.parse(JSON.stringify(current));
    else list.unshift(JSON.parse(JSON.stringify(current)));
    var ok = saveSurveys(list);
    if (!ok){
      toast("⚠ Could not save — storage is full. Remove a photo/file or export & clear old surveys, then try again.");
      return;
    }
    toast("Survey saved");
    var syncSettings = loadSyncSettings();
    if (syncSettings.baseUrl){
      pushSurvey(current).then(function(){
        var s = loadSyncSettings(); s.lastSync = Date.now(); saveSyncSettings(s);
        renderLastSyncNote();
        toast("Saved locally and synced to server");
      }).catch(function(){
        toast("Saved locally — could not reach server, will need to sync later");
      });
    }
  });

  $("newSurveyBtn").addEventListener("click", function(){
    if (!confirm("Start a new blank survey? Unsaved changes to the current one will be lost.")) return;
    current = {
      id: uid(), siteName:"", clientName:"", chartId: generateChartId(), lat:"", lng:"", date: todayISO(), vesNo:"",
      operator:"", array:"Schlumberger", remarks:"",
      readings: [emptyReading(), emptyReading(), emptyReading(), emptyReading()],
      attachments: [],
      createdAt: Date.now(), updatedAt: Date.now()
    };
    saveDraft();
    fillFormFromState();
    toast("New survey started");
  });

  /* ---------------- saved list ---------------- */
  function renderSavedList(){
    var list = loadSurveys();
    var q = ($("searchSaved").value || "").toLowerCase();
    if (q){
      list = list.filter(function(s){
        return (s.siteName||"").toLowerCase().indexOf(q)>=0 ||
               (s.vesNo||"").toLowerCase().indexOf(q)>=0 ||
               (s.date||"").toLowerCase().indexOf(q)>=0;
      });
    }
    var host = $("savedList");
    host.innerHTML = "";
    if (list.length === 0){
      host.innerHTML = '<div class="empty">No saved surveys yet.<br>Fill the Survey tab and tap "Save survey".</div>';
      return;
    }
    list.forEach(function(s){
      var el = document.createElement("div");
      el.className = "savecard";
      var validCount = s.readings.filter(function(r){ return r.ab2!=="" && r.rho!==""; }).length;
      el.innerHTML =
        '<div class="top">' +
          '<div><div class="site">'+escapeHtml(s.siteName||"Untitled site")+'</div>' +
          '<div class="meta">'+escapeHtml(s.chartId||"—")+' · '+escapeHtml(s.vesNo||"—")+' · '+escapeHtml(s.date||"")+' · '+validCount+' readings · '+escapeHtml(s.array||"")+'</div>' +
          (s.clientName ? '<div class="meta">Client: '+escapeHtml(s.clientName)+'</div>' : '') + '</div>' +
          '<span class="badge muted">'+new Date(s.updatedAt).toLocaleDateString()+'</span>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn secondary small" data-act="load">Open</button>' +
          '<button class="btn ghost small" data-act="dup">Duplicate</button>' +
          '<button class="btn ghost small" data-act="csv">CSV</button>' +
          '<button class="btn ghost small" data-act="txt">Text file</button>' +
          '<button class="btn danger small" data-act="del">Delete</button>' +
        '</div>';
      el.querySelector('[data-act="load"]').addEventListener("click", function(){
        current = JSON.parse(JSON.stringify(s));
        saveDraft();
        fillFormFromState();
        document.querySelector('.tabbtn[data-tab="survey"]').click();
        toast("Survey loaded");
      });
      el.querySelector('[data-act="dup"]').addEventListener("click", function(){
        var copy = JSON.parse(JSON.stringify(s));
        copy.id = uid();
        copy.chartId = generateChartId();
        copy.siteName = copy.siteName + " (copy)";
        copy.createdAt = Date.now(); copy.updatedAt = Date.now();
        var l = loadSurveys(); l.unshift(copy); saveSurveys(l);
        renderSavedList();
        toast("Duplicated");
      });
      el.querySelector('[data-act="csv"]').addEventListener("click", function(){
        downloadCsv(s);
      });
      el.querySelector('[data-act="txt"]').addEventListener("click", function(){
        downloadTxt(s);
      });
      el.querySelector('[data-act="del"]').addEventListener("click", function(){
        if (!confirm("Delete this survey? This cannot be undone.")) return;
        var l = loadSurveys().filter(function(x){ return x.id !== s.id; });
        saveSurveys(l);
        renderSavedList();
        toast("Deleted");
      });
      host.appendChild(el);
    });
  }
  $("searchSaved").addEventListener("input", renderSavedList);

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  /* ---------------- CSV export/import ---------------- */
  function downloadBlob(content, filename, type){
    var blob = new Blob([content], {type: type});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }
  function downloadCsv(survey){
    var lines = ["AB/2 (m),MN/2 (m),Apparent Resistivity (ohm-m)"];
    survey.readings.forEach(function(r){
      if (r.ab2==="" && r.rho==="") return;
      lines.push([r.ab2, r.mn2, r.rho].join(","));
    });
    var fname = ((survey.vesNo||survey.siteName||"ves_survey").replace(/[^a-z0-9\-_]+/gi,"_")) + ".csv";
    downloadBlob(lines.join("\n"), fname, "text/csv");
    toast("CSV exported");
  }
  $("exportCsvBtn").addEventListener("click", function(){ downloadCsv(current); });

  function surveyToText(survey){
    var lines = [];
    lines.push("VERTICAL ELECTRICAL SOUNDING - FIELD DATA");
    lines.push("=".repeat(42));
    lines.push("Chart / VES ID  : " + (survey.chartId || "—"));
    lines.push("VES / Station No: " + (survey.vesNo || "—"));
    lines.push("Site / location : " + (survey.siteName || "—"));
    lines.push("Client          : " + (survey.clientName || "—"));
    lines.push("Date            : " + (survey.date || "—"));
    lines.push("Electrode array : " + (survey.array || "—"));
    lines.push("Coordinates     : " + ((survey.lat && survey.lng) ? (survey.lat + ", " + survey.lng) : "—"));
    lines.push("Recorded by     : " + (survey.operator || "—"));
    if (survey.remarks) lines.push("Remarks         : " + survey.remarks);
    lines.push("");
    lines.push("AB/2 (m)\tMN/2 (m)\tApparent Resistivity (ohm-m)");
    lines.push("-".repeat(42));
    survey.readings.forEach(function(r){
      if (r.ab2==="" && r.rho==="") return;
      lines.push([r.ab2, (r.mn2||""), r.rho].join("\t"));
    });
    return lines.join("\n") + "\n";
  }
  function downloadTxt(survey){
    var fname = ((survey.chartId||survey.vesNo||survey.siteName||"ves_survey").replace(/[^a-z0-9\-_]+/gi,"_")) + ".txt";
    downloadBlob(surveyToText(survey), fname, "text/plain");
    toast("Text file saved");
  }
  $("saveTxtBtn").addEventListener("click", function(){ downloadTxt(current); });

  $("exportJsonAllBtn").addEventListener("click", function(){
    var list = loadSurveys();
    downloadBlob(JSON.stringify({exportedAt:new Date().toISOString(), surveys:list}, null, 2),
      "ves_surveys_backup_" + todayISO() + ".json", "application/json");
    toast("Backup exported");
  });

  $("jsonImportFile").addEventListener("change", function(e){
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var data = JSON.parse(reader.result);
        var incoming = data.surveys || data;
        if (!Array.isArray(incoming)) throw new Error("bad format");
        var list = loadSurveys();
        incoming.forEach(function(s){
          if (!s.id || list.some(function(x){ return x.id === s.id; })) s.id = uid();
          list.unshift(s);
        });
        saveSurveys(list);
        renderSavedList();
        toast("Imported " + incoming.length + " survey(s)");
      }catch(err){
        toast("Could not read that file as a VES backup");
      }
      $("jsonImportFile").value = "";
    };
    reader.readAsText(file);
  });

  $("importPasteBtn").addEventListener("click", function(){
    var raw = $("csvPaste").value.trim();
    if (!raw){ toast("Paste some AB/2, ρa pairs first"); return; }
    var lines = raw.split(/\r?\n/).filter(Boolean);
    var added = 0;
    lines.forEach(function(line){
      var parts = line.split(/[,;\t]+|\s{2,}|\s+/).filter(Boolean);
      if (parts.length < 2) return;
      var ab2 = parseFloat(parts[0]);
      var rho = parseFloat(parts[parts.length-1]);
      var mn2 = parts.length >= 3 ? parts[1] : "";
      if (isNaN(ab2) || isNaN(rho)) return;
      current.readings.push({id: uid(), ab2: String(ab2), mn2: mn2, rho: String(rho)});
      added++;
    });
    if (added){
      current.readings = current.readings.filter(function(r){ return r.ab2!=="" || r.rho!==""; });
      saveDraft();
      renderReadingsTable();
      renderChart();
      $("csvPaste").value = "";
      toast(added + " reading(s) imported");
      document.querySelector('.tabbtn[data-tab="survey"]').click();
    } else {
      toast("Could not parse any valid rows");
    }
  });

  /* ---------------- raw reading calculator ---------------- */
  $("c_array").addEventListener("change", function(){
    var isW = $("c_array").value === "Wenner";
    $("c_mn2wrap").style.display = isW ? "none" : "block";
    $("c_awrap").style.display = isW ? "block" : "none";
  });
  $("calcBtn").addEventListener("click", function(){
    var arr = $("c_array").value;
    var I = parseFloat($("c_i").value);
    var V = parseFloat($("c_v").value);
    var box = $("calcResult");
    if (isNaN(I) || isNaN(V) || I===0){
      box.style.display = "block";
      box.className = "note warn";
      box.textContent = "Enter valid current and voltage values.";
      return;
    }
    var K, rho, detail;
    if (arr === "Wenner"){
      var a = parseFloat($("c_a").value);
      if (isNaN(a) || a<=0){ box.style.display="block"; box.className="note warn"; box.textContent="Enter electrode spacing a."; return; }
      K = 2 * Math.PI * a;
      detail = "K = 2πa = " + fmtNum(K);
    } else {
      var AB2 = parseFloat($("c_ab2").value);
      var MN2 = parseFloat($("c_mn2").value);
      if (isNaN(AB2) || isNaN(MN2) || MN2<=0 || AB2<=MN2){
        box.style.display="block"; box.className="note warn";
        box.textContent = "Enter AB/2 and MN/2 with AB/2 > MN/2 > 0.";
        return;
      }
      K = Math.PI * (AB2*AB2 - MN2*MN2) / (2*MN2);
      detail = "K = π[(AB/2)²−(MN/2)²]/MN = " + fmtNum(K);
    }
    // I in mA, V in mV -> ratio V/I is same in mV/mA as V/A (ohms)
    rho = K * (V / I);
    box.style.display = "block";
    box.className = "note";
    box.innerHTML = detail + "<br><strong>ρa ≈ " + fmtNum(rho) + " Ω·m</strong>";
  });

  /* ---------------- profile ---------------- */
  function fillProfileForm(){
    var p = loadProfile();
    $("p_org").value = p.org || "";
    $("p_office").value = p.office || "";
    $("p_contact").value = p.contact || "";
    if (p.logo){
      $("profileLogoPreview").src = p.logo;
      $("hdrLogo").src = p.logo;
      $("hdrLogo").style.display = "block";
    }
    $("hdrOrg").textContent = p.org || "National Water Supply & Drainage Board — Sri Lanka";
  }
  $("logoInput").addEventListener("change", function(e){
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      $("profileLogoPreview").src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  $("saveProfileBtn").addEventListener("click", function(){
    var p = {
      org: $("p_org").value, office: $("p_office").value,
      contact: $("p_contact").value, logo: $("profileLogoPreview").src && $("profileLogoPreview").src.indexOf("data:")===0 ? $("profileLogoPreview").src : (loadProfile().logo || "")
    };
    saveProfile(p);
    fillProfileForm();
    toast("Profile saved");
  });

  /* ---------------- sync UI wiring ---------------- */
  function fillSyncForm(){
    var s = loadSyncSettings();
    $("s_baseUrl").value = s.baseUrl || "";
    $("s_apiKey").value = s.apiKey || "";
    $("deviceIdDisplay").textContent = getDeviceId();
    renderLastSyncNote();
  }
  $("saveSyncBtn").addEventListener("click", function(){
    saveSyncSettings({
      baseUrl: $("s_baseUrl").value.trim(),
      apiKey: $("s_apiKey").value.trim(),
      lastSync: loadSyncSettings().lastSync || 0
    });
    renderLastSyncNote();
    toast("Connection settings saved");
  });
  $("testSyncBtn").addEventListener("click", function(){
    var box = $("syncStatus");
    box.style.display = "block";
    box.className = "note";
    box.textContent = "Checking…";
    var s = loadSyncSettings();
    if (!s.baseUrl){ box.className = "note warn"; box.textContent = "Enter a server URL first."; return; }
    var base = s.baseUrl.replace(/\/+$/,"");
    fetch(base + "/api/health").then(function(r){ return r.json(); }).then(function(){
      return apiFetch("/api/surveys", {method:"GET"});
    }).then(function(rows){
      box.className = "note";
      box.textContent = "Connected. Server has " + rows.length + " survey(s). API key OK.";
    }).catch(function(err){
      box.className = "note warn";
      box.textContent = "Could not connect: " + err.message;
    });
  });
  $("pushAllBtn").addEventListener("click", function(){
    if (!loadSyncSettings().baseUrl){ toast("Save a server URL first"); return; }
    pushAllLocal();
  });
  $("pullAllBtn").addEventListener("click", function(){
    if (!loadSyncSettings().baseUrl){ toast("Save a server URL first"); return; }
    toast("Pulling from server…");
    pullAll().then(function(merged){
      renderSavedList();
      toast("Synced. " + merged.length + " survey(s) locally.");
    }).catch(function(err){
      toast("Pull failed: " + err.message);
    });
  });

  /* ---------------- report ---------------- */
  function renderReport(){
    var p = loadProfile();
    var readings = current.readings.filter(function(r){ return r.ab2!=="" || r.rho!==""; });
    var chartSvg = buildChartSVG(validReadings());
    var rows = readings.map(function(r,i){
      return "<tr><td>"+(i+1)+"</td><td>"+escapeHtml(r.ab2)+"</td><td>"+escapeHtml(r.mn2||"—")+"</td><td>"+escapeHtml(r.rho)+"</td></tr>";
    }).join("");

    var reportAtts = (current.attachments || []).filter(function(a){ return a.includeInReport; });
    var reportImages = reportAtts.filter(function(a){ return a.kind === "image"; });
    var reportOtherFiles = reportAtts.filter(function(a){ return a.kind !== "image"; });
    var attachmentsHtml = "";
    if (reportImages.length || reportOtherFiles.length){
      attachmentsHtml += '<div class="report-attachments"><h3 style="font-size:12.5px;margin:0 0 4px;">Attachments</h3>';
      if (reportImages.length){
        attachmentsHtml += '<div class="rgrid">';
        reportImages.forEach(function(a){
          attachmentsHtml += '<div><img src="'+a.dataUrl+'"><div class="cap">'+escapeHtml(a.name)+'</div></div>';
        });
        attachmentsHtml += '</div>';
      }
      if (reportOtherFiles.length){
        attachmentsHtml += '<ul style="font-size:11.5px;margin:8px 0 0;padding-left:18px;">' +
          reportOtherFiles.map(function(a){ return '<li>'+escapeHtml(a.name)+' (see saved copy — attached file, not shown inline)</li>'; }).join("") +
          '</ul>';
      }
      attachmentsHtml += '</div>';
    }

    var html =
      '<div class="rl-header">' +
        (p.logo ? '<img src="'+p.logo+'">' : '') +
        '<div><div class="rl-org">'+escapeHtml(p.org||"National Water Supply & Drainage Board — Sri Lanka")+'</div>' +
        '<h1>Vertical Electrical Sounding — Field Report</h1>' +
        '<div style="font-size:11px;color:#666;">Chart / VES ID: '+escapeHtml(current.chartId||"—")+'</div></div>' +
      '</div>' +
      '<div class="report-info-grid">' +
        infoCell("Site / location", current.siteName) +
        infoCell("Client", current.clientName) +
        infoCell("VES / station no.", current.vesNo) +
        infoCell("Chart / VES ID", current.chartId) +
        infoCell("Date", current.date) +
        infoCell("Electrode array", current.array) +
        infoCell("Coordinates", (current.lat && current.lng) ? (current.lat+", "+current.lng) : "—") +
        infoCell("Recorded by", current.operator) +
        infoCell("Office", p.office) +
        infoCell("Contact", p.contact) +
      '</div>' +
      (current.remarks ? '<p style="font-size:12.5px;"><strong>Field remarks:</strong> '+escapeHtml(current.remarks)+'</p>' : '') +
      '<div style="margin:12px 0;">' + chartSvg + '</div>' +
      '<table class="rtbl"><thead><tr><th>#</th><th>AB/2 (m)</th><th>MN/2 (m)</th><th>ρa (Ω·m)</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p style="font-size:11px;color:#666;margin-top:8px;">Curve and table as recorded in the field. Interpretation of subsurface layering is to be carried out separately by a qualified hydrogeologist.</p>' +
      attachmentsHtml +
      '<div class="sig-row">' +
        '<div><div class="sig-line">Recorded by (name, date)</div></div>' +
        '<div><div class="sig-line">Checked by (name, date)</div></div>' +
      '</div>';
    $("reportPage").innerHTML = html;
  }
  function infoCell(label, val){
    return '<div><span>'+escapeHtml(label)+'</span>'+escapeHtml(val || "—")+'</div>';
  }
  $("printBtn").addEventListener("click", function(){ window.print(); });

  /* ---------------- init ---------------- */
  var draft = loadDraft();
  if (draft) current = draft;
  $("f_date").value = current.date || todayISO();
  fillFormFromState();
  fillProfileForm();

  // If this page was opened via http(s) from the backend itself (rather than
  // as a local file), and no server is configured yet, assume "this same
  // server" — saves field staff from having to type the URL themselves.
  (function autoDetectServer(){
    var s = loadSyncSettings();
    if (!s.baseUrl && window.location.protocol.indexOf("http") === 0){
      s.baseUrl = window.location.origin;
      saveSyncSettings(s);
    }
  })();

  fillSyncForm();
  renderSavedList();

  // if a server is configured, quietly try to pull the latest data on startup
  if (loadSyncSettings().baseUrl){
    pullAll().then(function(){ renderSavedList(); }).catch(function(){ /* stay on local data if offline */ });
  }

  // re-render chart on theme change so colours match
  $("themeToggleBtn").addEventListener("click", function(){ renderChart(); });

  /* ---------------- offline support ---------------- */
  // Caches the app's own files so it still opens with zero signal after the
  // first visit. Only works when served over http(s) (e.g. from the backend) —
  // harmless no-op when opened as a local file, which already works offline
  // by nature of being a local file.
  if ("serviceWorker" in navigator && window.location.protocol.indexOf("http") === 0){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("service-worker.js").catch(function(){
        /* not available in this context (e.g. plain http without a proper host) — app still works */
      });
    });
  }

  function updateConnBadge(){
    var badge = $("connBadge");
    badge.style.display = navigator.onLine ? "none" : "inline-block";
  }
  window.addEventListener("online", updateConnBadge);
  window.addEventListener("offline", updateConnBadge);
  updateConnBadge();

})();
