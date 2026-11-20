(function () {
  "use strict";

  var C = window.SOLETE_CONFIG || {};
  var KEY = "solete_soc_registered";
  var LAST = "solete_soc_last_try";
  var loadedAt = Date.now();

  var $ = function (id) { return document.getElementById(id); };
  var form = $("regForm"), submitBtn = $("submitBtn"), msg = $("formMsg");
  var formView = $("formView"), doneView = $("doneView"), fullView = $("fullView");

  /* ---------- storage helpers (safe if blocked) ---------- */
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- views ---------- */
  function show(view) {
    formView.hidden = view !== "form";
    doneView.hidden = view !== "done";
    fullView.hidden = view !== "full";
  }

function setWhatsApp() {
    var a = $("waBtn");
    var link = String(C.WHATSAPP_LINK || "").trim();
    if (/^https:\/\/(chat\.whatsapp\.com|whatsapp\.com\/channel|wa\.me)\//.test(link)) {
      a.href = link;
    }
  }
  /* ---------- seats with animated counter ---------- */
  var seatsFull = false, currentFilled = 0;

  function animateCount(el, target) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = target;
      return;
    }
    var start = 0;
    var duration = 700;
    var t0 = performance.now();
    function step(now) {
      var p = Math.min(1, (now - t0) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderSeats(filled) {
    var total = Math.max(1, Number(C.SEATS_TOTAL) || 100);
    filled = Math.min(total, Math.max(0, Number(filled) || 0));
    currentFilled = filled;
    var left = total - filled;
    var pct = Math.round((filled / total) * 100);

    animateCount($("seatsLeft"), left);
    $("seatsText").textContent = left === 1 ? "Seat Left" : "Seats Left";
    $("barFill").style.width = pct + "%";
    document.querySelector(".bar").setAttribute("aria-valuenow", pct);
    $("seats").classList.toggle("low", left <= Math.ceil(total * 0.15));

    seatsFull = left === 0;
    if (seatsFull && get(KEY) !== "1") {
      show("full");
      $("heroBtn").style.display = "none";
    }
  }

  function loadSeats() {
    renderSeats(C.SEATS_FILLED);
    var url = String(C.SHEET_CSV_URL || "");
    if (!/^https:\/\/docs\.google\.com\//.test(url)) return;
    fetch(url, { cache: "no-store", credentials: "omit" })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
      .then(function (t) {
        var rows = t.trim().split(/\r?\n/).length - 1;
        renderSeats(Math.max(rows, Number(C.SEATS_FILLED) || 0));
      })
      .catch(function () { /* keep fallback count */ });
  }

  /* ---------- validation ---------- */
  function clean(s) {
    return String(s || "")
      .replace(/[\u0000-\u001f\u007f<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function fieldError(name, text) {
    var el = document.querySelector('.err[data-for="' + name + '"]');
    if (el) el.textContent = text || "";
    var input = $(name);
    if (input) {
      input.classList.toggle("bad", !!text);
      if (text) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function validate() {
    var v = {
      name: clean($("name").value),
      phone: $("phone").value.replace(/[\s\-()]/g, ""),
      college: clean($("college").value),
      location: clean($("location").value)
    };
    var ok = true, first = null;

    function bad(n, t) { fieldError(n, t); ok = false; if (!first) first = n; }

    ["name", "phone", "college", "location"].forEach(function (n) { fieldError(n, ""); });

    if (v.name.length < 2) bad("name", "Enter your full name.");
    else if (!/^[\p{L}][\p{L}\s.'\-]{1,79}$/u.test(v.name)) bad("name", "Use letters only in your name.");

    var digits = v.phone.replace(/^(\+91|91|0)(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) bad("phone", "Enter a valid 10-digit mobile number.");
    else v.phone = digits;

    if (v.college.length > 120) bad("college", "College name is too long.");
    if (v.location.length < 2) bad("location", "Enter your city or town.");

    if (first) $(first).focus();
    return ok ? v : null;
  }

  /* ---------- submit to Google Form ---------- */
  function configured() {
    return /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/formResponse$/.test(String(C.FORM_ACTION || "")) &&
      C.FORM_ACTION.indexOf("YOUR_FORM_ID") === -1;
  }

  function busy(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle("loading", on);
    submitBtn.querySelector(".btn-label").textContent = on ? "Registering..." : "Register Now";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = "";

    if ($("website").value || Date.now() - loadedAt < 2500) return;
    if (seatsFull) { show("full"); return; }

    var last = Number(get(LAST) || 0);
    if (Date.now() - last < 15000) {
      msg.textContent = "Please wait a few seconds before trying again.";
      return;
    }

    var v = validate();
    if (!v) return;

    if (!configured()) {
      msg.textContent = "Registration is not connected yet. Please contact the organisers.";
      return;
    }

    set(LAST, String(Date.now()));
    busy(true);

    var body = new URLSearchParams();
    body.append(C.ENTRY.name, v.name);
    body.append(C.ENTRY.phone, v.phone);
    body.append(C.ENTRY.college, v.college);
    body.append(C.ENTRY.location, v.location);

    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 15000);

    fetch(C.FORM_ACTION, {
      method: "POST",
      mode: "no-cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: ctrl.signal
    }).then(function () {
      clearTimeout(t);
      set(KEY, "1");
      form.reset();
      setWhatsApp();
      show("done");
      renderSeats(currentFilled + 1);
      doneView.scrollIntoView({ behavior: "smooth", block: "center" });
      $("waBtn").focus({ preventScroll: true });
    }).catch(function () {
      clearTimeout(t);
      busy(false);
      msg.textContent = "Could not send your registration. Check your internet and try again.";
    });
  });

  $("phone").addEventListener("input", function () {
    this.value = this.value.replace(/[^\d+\s\-()]/g, "");
  });
  ["name", "phone", "college", "location"].forEach(function (n) {
    $(n).addEventListener("input", function () { fieldError(n, ""); });
  });

  /* ---------- text jumping to reveal animation ---------- */
  function splitWordsForJump(el) {
    if (el.dataset.jumpPrepared === "1") return;
    el.dataset.jumpPrepared = "1";
    var wordIndex = 0;
    function walk(node) {
      if (node.nodeType === 3) {
        var text = node.nodeValue;
        if (!text.trim()) return;
        var frag = document.createDocumentFragment();
        var parts = text.split(/(\s+)/);
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            var wrap = document.createElement("span");
            wrap.className = "jump-word-wrap";
            var inner = document.createElement("span");
            inner.className = "jump-word";
            inner.style.setProperty("--jump-delay", (wordIndex * 70) + "ms");
            inner.textContent = part;
            wrap.appendChild(inner);
            frag.appendChild(wrap);
            wordIndex++;
          }
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        Array.prototype.slice.call(node.childNodes).forEach(walk);
      }
    }
    walk(el);
  }

  function initAnimations() {
    var jumpEls = document.querySelectorAll("[data-jump-text]");
    jumpEls.forEach(function (el) {
      splitWordsForJump(el);
      if (el.getAttribute("data-jump-text") === "immediate") {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.classList.add("is-revealed");
          });
        });
      }
    });

    document.querySelectorAll(".reveal-fade, .reveal-scale").forEach(function (el) {
      var delay = Number(el.getAttribute("data-delay") || 0);
      setTimeout(function () {
        el.classList.add("is-visible");
      }, 80 + delay);
    });

    var scrollTargets = document.querySelectorAll('.reveal-scroll, [data-jump-text="scroll"]');
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var stagger = Number(el.getAttribute("data-stagger") || 0);
          el.style.transitionDelay = (stagger * 90) + "ms";
          if (el.hasAttribute("data-jump-text")) el.classList.add("is-revealed");
          else el.classList.add("is-visible");
          io.unobserve(el);
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -30px 0px" });

      scrollTargets.forEach(function (el) { io.observe(el); });
    } else {
      scrollTargets.forEach(function (el) {
        el.classList.add("is-visible", "is-revealed");
      });
    }
  }

  /* ---------- page routing (Home vs Contact Us) ---------- */
  function initRouting() {
    var homePage = $("homePage");
    var contactPage = $("contactPage");
    var locEl = $("contactLocation");
    var phoneEl = $("contactPhone");

    if (locEl && C.CONTACT_LOCATION) locEl.textContent = C.CONTACT_LOCATION;
    if (phoneEl && C.CONTACT_PHONE) phoneEl.textContent = C.CONTACT_PHONE;

    function setRoute(route, scrollTargetId) {
      var isContact = route === "contact";
      homePage.hidden = isContact;
      contactPage.hidden = !isContact;

      document.querySelectorAll(".main-nav .nav-link").forEach(function (link) {
        var linkRoute = link.getAttribute("data-route");
        link.classList.toggle("active", (isContact && linkRoute === "contact") || (!isContact && linkRoute === "home"));
      });

      if (isContact) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        var cTitle = contactPage.querySelector("[data-jump-text]");
        if (cTitle) {
          cTitle.classList.remove("is-revealed");
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { cTitle.classList.add("is-revealed"); });
          });
        }
      } else if (scrollTargetId) {
        var target = $(scrollTargetId);
        if (target) {
          setTimeout(function () {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            if (scrollTargetId === "register" && $("name")) $("name").focus({ preventScroll: true });
          }, 40);
        }
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    document.querySelectorAll("[data-route]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var route = el.getAttribute("data-route");
        var scrollTo = el.getAttribute("data-scroll");
        setRoute(route, scrollTo);
        var drawer = $("mobileDrawer");
        var toggle = $("menuToggle");
        if (drawer && !drawer.hidden) {
          drawer.hidden = true;
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
      });
    });

    if (window.location.hash === "#contact") setRoute("contact");
  }

  /* ---------- scroll progress & sticky header ---------- */
  function initScrollEffects() {
    var bar = $("scrollProgress");
    var header = $("siteHeader");
    function onScroll() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
      if (bar) bar.style.transform = "scaleX(" + ratio + ")";
      if (header) header.classList.toggle("scrolled", window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- mobile drawer ---------- */
  function initMobileNav() {
    var toggle = $("menuToggle");
    var drawer = $("mobileDrawer");
    if (!toggle || !drawer) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      drawer.hidden = !open;
    }

    toggle.addEventListener("click", function () {
      setOpen(drawer.hidden);
    });
  }

  /* ---------- interactive modals & toast ---------- */
  var TOPICS = {
    overview: {
      kicker: "Masterclass Overview",
      title: "SOC Analysis with AI Integration",
      desc: "A practical, live masterclass by SOLETE designed to bridge foundational cybersecurity operations with modern AI-assisted workflows.",
      bullets: [
        "Understand Tier-1 / Tier-2 Security Operations Center workflows",
        "Learn how AI assists with alert triage, log correlation, and summary drafting",
        "Spot real attack patterns in authentication, network, and endpoint logs",
        "Walk through realistic SOC incident scenarios from alert to resolution"
      ]
    },
    soc: {
      kicker: "Module 01",
      title: "SOC Operations",
      desc: "See how a modern Security Operations Center is structured and how analysts coordinate during live incidents.",
      bullets: [
        "Alert queues, severity classification, and escalation paths",
        "Playbook-driven triage and SLA response expectations",
        "Hand-off between automated rules and human analysts"
      ]
    },
    ai: {
      kicker: "Module 02",
      title: "AI in Cybersecurity",
      desc: "Discover where AI accelerates security analysis and where human judgment remains essential.",
      bullets: [
        "Using AI for rapid log summarization and indicator extraction",
        "Reducing alert fatigue without trusting false positives blindly",
        "Verification habits every AI-enabled SOC analyst needs"
      ]
    },
    detection: {
      kicker: "Module 03",
      title: "Threat Detection",
      desc: "Practice reading raw logs and SIEM alerts to catch suspicious behaviour before it escalates.",
      bullets: [
        "Identifying brute-force, privilege escalation, and anomalous logins",
        "Connecting timeline clues across host and network telemetry",
        "Separating benign noise from genuine security incidents"
      ]
    },
    usecases: {
      kicker: "Module 04",
      title: "Real-world Use Cases",
      desc: "Follow worked examples modeled on how active SOC teams investigate and contain threats.",
      bullets: [
        "End-to-end phishing and credential compromise walkthrough",
        "Suspicious process execution and lateral movement analysis",
        "Writing clear, actionable incident notes for stakeholders"
      ]
    }
  };

  function initModalAndToast() {
    var modal = $("infoModal");
    var closeBtn = $("modalClose");
    var toast = $("toast");
    var toastTimer = null;

    function openTopic(key) {
      var data = TOPICS[key];
      if (!data) return;
      $("modalKicker").textContent = data.kicker;
      $("modalTitle").textContent = data.title;
      $("modalDesc").textContent = data.desc;
      var list = $("modalList");
      list.innerHTML = "";
      data.bullets.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      modal.hidden = false;
      closeBtn.focus();
    }

    function closeModal() {
      modal.hidden = true;
    }

    var overviewBtn = $("overviewBtn");
    if (overviewBtn) overviewBtn.addEventListener("click", function () { openTopic("overview"); });

    document.querySelectorAll("[data-topic]").forEach(function (btn) {
      btn.addEventListener("click", function () { openTopic(btn.getAttribute("data-topic")); });
    });

    closeBtn.addEventListener("click", closeModal);
    $("modalCta").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });

    document.querySelectorAll("[data-social]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var name = btn.getAttribute("data-social");
        toast.textContent = "Follow SOLETE on " + name + " — community links are shared in the WhatsApp group after registration.";
        toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.hidden = true; }, 3500);
      });
    });

    var heroBtn = $("heroBtn");
    if (heroBtn) {
      heroBtn.addEventListener("click", function () {
        setTimeout(function () { if ($("name")) $("name").focus(); }, 350);
      });
    }
  }

  /* ---------- init ---------- */
  setWhatsApp();
  loadSeats();
  if (get(KEY) === "1") show("done");
  initAnimations();
  initRouting();
  initScrollEffects();
  initMobileNav();
  initModalAndToast();
})();
