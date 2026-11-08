
/* =========================================================
   DIGITAL DETECTIVE — OPERATION BLACKOUT
   Main investigation engine
========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const STORAGE_KEY = "digitalDetectiveOperationBlackout";

const MAX_POINTS = 380;

const RANKS = [
    { name: "Trainee Analyst", threshold: 0 },
    { name: "Threat Spotter", threshold: 80 },
    { name: "Security Investigator", threshold: 160 },
    { name: "Cyber Detective", threshold: 240 },
    { name: "Elite Incident Responder", threshold: 320 }
];

const MISSIONS = [
    "Would You Trust This Email?",
    "Identify the Red Flags.",
    "Investigate the Email.",
    "Examine the Evidence.",
    "What Really Happened?"
];

const ACHIEVEMENTS = [
    {
        id: "eagleEye",
        name: "Eagle Eye",
        description: "Identify all four red flags.",
        icon: "⌕"
    },
    {
        id: "headerHunter",
        name: "Header Hunter",
        description: "Correctly interpret the email authentication.",
        icon: "⌁"
    },
    {
        id: "evidenceExpert",
        name: "Evidence Expert",
        description: "Inspect every evidence log.",
        icon: "▣"
    },
    {
        id: "timelineMaster",
        name: "Timeline Master",
        description: "Correctly reconstruct the incident.",
        icon: "◷"
    },
    {
        id: "incidentCommander",
        name: "Incident Commander",
        description: "Answer all three final questions correctly.",
        icon: "✦"
    }
];

/* =========================================================
   EVIDENCE DATABASE
========================================================= */

const EVIDENCE_DATABASE = [
    {
        id: "email",
        title: "Evidence 01 — Suspicious Email",
        source: "Employee mailbox",
        description: "Original phishing message.",
        content: `
From: ITsupport@aureliaglobal-support.com
To: employee@aureliaglobal.coY
Reply-To: collect.aurelia@mail-relay.net
Subject: Immediate Action Required — Account Verification
Date: 08 Nov 2026 07:42 UTC

Your account access will be suspended unless you
verify your credentials immediately.

Verify account:
https://aureliaglobal-support.com/verify-account

Regards,
Aurelia Global IT Support
        `.trim()
    },
    {
        id: "browser",
        title: "Evidence 02 — Browser Activity",
        source: "Endpoint browser history",
        description: "Recorded navigation following email interaction.",
        content: `
09:12 — Email opened
09:14 — aureliaglobal-support.com/verify-account visited
09:16 — Credentials submitted
        `.trim()
    },
    {
        id: "credentials",
        title: "Evidence 03 — Credential Submission",
        source: "Endpoint telemetry",
        description: "User interaction with a suspicious login page.",
        content: `
09:16:08 — Username submitted
09:16:11 — Password submitted
09:16:13 — Redirect to legitimate portal
        `.trim()
    },
    {
        id: "authentication",
        title: "Evidence 04 — Authentication Logs",
        source: "Identity platform",
        description: "Unexpected account authentication.",
        content: `
09:24 — Successful login
Source: 198.51.100.24
Device: Unknown browser
Location: Unfamiliar region
09:25 — Session established
        `.trim()
    },
    {
        id: "files",
        title: "Evidence 05 — File Access Logs",
        source: "Finance file server",
        description: "Unexpected access after account compromise.",
        content: `
09:27 — Finance directory accessed
09:27 — Payroll.xlsx opened
09:28 — Multiple file requests recorded
        `.trim()
    }
];

/* =========================================================
   INCIDENT TIMELINE
========================================================= */

const TIMELINE_EVENTS = [
    {
        id: "emailReceived",
        time: "09:05",
        label: "Suspicious email received",
        explanation: "The phishing message reaches the employee mailbox."
    },
    {
        id: "emailOpened",
        time: "09:12",
        label: "Email opened",
        explanation: "The employee opens the suspicious message."
    },
    {
        id: "linkVisited",
        time: "09:14",
        label: "Verification link visited",
        explanation: "The employee navigates to the lookalike website."
    },
    {
        id: "credentialsSubmitted",
        time: "09:16",
        label: "Credentials submitted",
        explanation: "Credentials are entered into the suspicious page."
    },
    {
        id: "login",
        time: "09:24",
        label: "Unfamiliar login detected",
        explanation: "An unknown device successfully authenticates."
    },
    {
        id: "fileAccess",
        time: "09:27",
        label: "Finance files accessed",
        explanation: "The account accesses sensitive finance files."
    },
    {
        id: "itContacted",
        time: "09:30",
        label: "IT contacted",
        explanation: "The employee reports the suspicious activity."
    }
];

/* =========================================================
   STATE
========================================================= */

function createDefaultState() {
    return {
        currentMission: 0,
        completedMissions: [],
        unlockedMissions: [0],

        points: 0,
        pointLedger: {},

        collectedEvidence: [],
        inspectedLogs: [],

        answers: {
            mission1: null,
            mission2: [],
            mission3: null,
            mission4Timeline: [],
            finalVerdict: {}
        },

        achievements: [],
        finalReport: false
    };
}

let state = loadState();

let selectedHotspots = [];
let selectedFinalAnswers = {};
let toastTimeout = null;
let completionTimeout = null;

/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("Unable to save investigation:", error);
        showToast("Progress could not be saved in this browser.", "error");
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return createDefaultState();

        const parsed = JSON.parse(saved);
        const defaults = createDefaultState();

        return {
            ...defaults,
            ...parsed,
            answers: {
                ...defaults.answers,
                ...(parsed.answers || {})
            },
            pointLedger: parsed.pointLedger || {},
            collectedEvidence: parsed.collectedEvidence || [],
            inspectedLogs: parsed.inspectedLogs || [],
            achievements: parsed.achievements || [],
            completedMissions: parsed.completedMissions || [],
            unlockedMissions: parsed.unlockedMissions || [0]
        };
    } catch (error) {
        console.error("Saved progress could not be loaded:", error);
        return createDefaultState();
    }
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message, type = "") {
    const toast = $("#toast");

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.className = "toast";
    }, 3200);
}

/* =========================================================
   POINTS / SCORING
========================================================= */

/*
    Each scoring action has a unique ledger key.
    The same key cannot award points twice.
*/

function awardPoints(key, amount, description) {
    if (state.pointLedger[key]) {
        return false;
    }

    const safeAmount = Math.max(0, Math.min(amount, MAX_POINTS));

    state.pointLedger[key] = {
        amount: safeAmount,
        description,
        timestamp: new Date().toISOString()
    };

    state.points = Object.values(state.pointLedger)
        .reduce((total, entry) => total + entry.amount, 0);

    state.points = Math.min(state.points, MAX_POINTS);

    saveState();
    updateRank();

    return true;
}

function getRankIndex(points = state.points) {
    let index = 0;

    RANKS.forEach((rank, i) => {
        if (points >= rank.threshold) index = i;
    });

    return index;
}

function getRank() {
    return RANKS[getRankIndex()];
}

function getNextRank() {
    const index = getRankIndex();

    if (index >= RANKS.length - 1) return null;

    return RANKS[index + 1];
}

function updateRank() {
    const index = getRankIndex();
    const rank = RANKS[index];
    const nextRank = getNextRank();

    $("#rankLevel").textContent = `LEVEL ${String(index + 1).padStart(2, "0")}`;
    $("#rankName").textContent = rank.name;
    $("#investigationPoints").textContent = state.points;

    const progressFill = $("#rankProgressFill");

    if (!nextRank) {
        progressFill.style.width = "100%";
        $("#rankNext").textContent = "Maximum rank achieved · 380 IP";
    } else {
        const range = nextRank.threshold - rank.threshold;
        const earned = state.points - rank.threshold;
        const percentage = Math.max(0, Math.min(100, (earned / range) * 100));

        progressFill.style.width = `${percentage}%`;
        $("#rankNext").textContent =
            `Next rank: ${nextRank.name} · ${nextRank.threshold} IP`;
    }

    $$("#rankList li").forEach(item => {
        const rankItem = Number(item.dataset.rank);

        item.classList.toggle("current", rankItem === index);
        item.classList.toggle("achieved", rankItem < index);
    });
}

/* =========================================================
   ACHIEVEMENTS
========================================================= */

function unlockAchievement(id) {
    if (state.achievements.includes(id)) return false;

    state.achievements.push(id);
    saveState();

    const achievement = ACHIEVEMENTS.find(item => item.id === id);

    if (achievement) {
        showToast(`Achievement unlocked: ${achievement.name}`, "success");
    }

    return true;
}

function updateAchievements() {
    const correctFlags = [
        "sender",
        "domain",
        "urgency",
        "replyTo"
    ];

    if (
        correctFlags.every(flag => state.answers.mission2.includes(flag))
    ) {
        unlockAchievement("eagleEye");
    }

    if (state.answers.mission3 === "suspicious") {
        unlockAchievement("headerHunter");
    }

    if (state.inspectedLogs.length === EVIDENCE_DATABASE.length) {
        unlockAchievement("evidenceExpert");
    }

    if (
        state.answers.mission4Timeline.length === TIMELINE_EVENTS.length &&
        state.answers.mission4Timeline.every((id, index) =>
            id === TIMELINE_EVENTS[index].id
        )
    ) {
        unlockAchievement("timelineMaster");
    }

    const finalAnswers = state.answers.finalVerdict;

    if (
        finalAnswers.classification === "phishing" &&
        finalAnswers.action === "contain" &&
        finalAnswers.impact === "unknown"
    ) {
        unlockAchievement("incidentCommander");
    }
}

/* =========================================================
   EVIDENCE
========================================================= */

function collectEvidence(id) {
    if (!state.collectedEvidence.includes(id)) {
        state.collectedEvidence.push(id);
        saveState();
    }

    updateEvidenceCount();
}

function updateEvidenceCount() {
    $("#evidenceCount").textContent = state.collectedEvidence.length;
}

function openEvidenceLocker() {
    renderEvidenceLocker();
    $("#evidenceModal").classList.remove("hidden");
}

function closeEvidenceLocker() {
    $("#evidenceModal").classList.add("hidden");
}

function renderEvidenceLocker() {
    const container = $("#evidenceList");

    if (!state.collectedEvidence.length) {
        container.innerHTML = `
            <div class="callout">
                No evidence has been collected yet.
                Progress through the missions to recover digital records.
            </div>
        `;
        return;
    }

    container.innerHTML = state.collectedEvidence
        .map(id => EVIDENCE_DATABASE.find(item => item.id === id))
        .filter(Boolean)
        .map(item => `
            <article class="evidence-record">
                <div class="tag cyan">${escapeHTML(item.source)}</div>
                <h3>${escapeHTML(item.title)}</h3>
                <p>${escapeHTML(item.description)}</p>
                <pre>${escapeHTML(item.content)}</pre>
            </article>
        `).join("");
}

/* =========================================================
   MISSION NAVIGATION
========================================================= */

function unlockMission(index) {
    if (!state.unlockedMissions.includes(index)) {
        state.unlockedMissions.push(index);
        state.unlockedMissions.sort((a, b) => a - b);
        saveState();
    }
}

function completeMission(index) {
    if (!state.completedMissions.includes(index)) {
        state.completedMissions.push(index);
        state.completedMissions.sort((a, b) => a - b);
    }

    unlockMission(Math.min(index + 1, 4));

    saveState();
    updateProgress();
    updateMissionNavigation();
}

function goToMission(index) {
    if (!state.unlockedMissions.includes(index)) {
        showToast("Complete the previous mission to unlock this phase.", "error");
        return;
    }

    state.currentMission = index;

    selectedHotspots = [...state.answers.mission2];
    selectedFinalAnswers = { ...state.answers.finalVerdict };

    saveState();

    renderMission();
    updateMissionNavigation();
    updateProgress();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateMissionNavigation() {
    $$("#missionNav .mission-link").forEach(button => {
        const index = Number(button.dataset.mission);

        const unlocked = state.unlockedMissions.includes(index);
        const completed = state.completedMissions.includes(index);
        const active = state.currentMission === index;

        button.classList.toggle("active", active);
        button.classList.toggle("completed", completed);
        button.classList.toggle("locked", !unlocked);

        button.querySelector(".mission-state").textContent =
            completed ? "✓" : unlocked ? "●" : "○";

        button.setAttribute("aria-current", active ? "step" : "false");
    });
}

function updateProgress() {
    const completed = state.completedMissions.length;
    const percentage = (completed / MISSIONS.length) * 100;

    $("#progressCount").textContent = `${completed} / ${MISSIONS.length}`;
    $("#progressFill").style.width = `${percentage}%`;

    $("#progressMessage").textContent =
        completed === MISSIONS.length
            ? "Investigation completed"
            : `${MISSIONS.length - completed} mission(s) remaining`;
}

/* =========================================================
   WORKSPACE
========================================================= */

function showWorkspace() {
    $("#homeView").classList.add("hidden");
    $("#workspaceView").classList.remove("hidden");

    renderMission();
    updateProgress();
    updateMissionNavigation();
    updateEvidenceCount();
    updateRank();
}

function showHome() {
    $("#workspaceView").classList.add("hidden");
    $("#homeView").classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderMission() {
    const index = state.currentMission;

    $("#missionCrumb").textContent =
        `MISSION ${String(index + 1).padStart(2, "0")}`;

    const completed = state.completedMissions.includes(index);
    const status = $("#missionStatus");

    status.classList.toggle("completed", completed);
    status.innerHTML = completed
        ? '<span class="status-dot"></span> COMPLETED'
        : '<span class="status-dot"></span> IN PROGRESS';

    switch (index) {
        case 0:
            renderMissionOne();
            break;
        case 1:
            renderMissionTwo();
            break;
        case 2:
            renderMissionThree();
            break;
        case 3:
            renderMissionFour();
            break;
        case 4:
            renderMissionFive();
            break;
        default:
            renderMissionOne();
    }

    renderMissionFooter();
}

function renderMissionFooter() {
    const index = state.currentMission;
    const completed = state.completedMissions.includes(index);

    let nextButton = "";

    if (index < 4) {
        nextButton = `
            <button class="button button-primary" id="nextMission">
                ${completed ? "Continue investigation" : "Continue"} →
            </button>
        `;
    } else if (state.finalReport) {
        nextButton = `
            <button class="button button-primary" id="printReport">
                Print investigation report ↗
            </button>
        `;
    }

    $("#missionFooter").innerHTML = `
        <div class="footer-left">
            <span class="footer-hint">
                ${completed ? "✓ Mission completed" : "Complete the objective to advance"}
            </span>
        </div>
        <div class="footer-right">
            ${index === 4 ? `
                <button class="button button-ghost" id="openLockerFooter">
                    Evidence locker
                </button>
            ` : ""}
            ${nextButton}
        </div>
    `;
}

/* =========================================================
   MISSION 1 — WOULD YOU TRUST THIS EMAIL?
========================================================= */

function renderMissionOne() {
    const answer = state.answers.mission1;

    $("#missionContent").innerHTML = `
        <div class="mission-kicker">PHASE 01 · INITIAL ASSESSMENT</div>

        <h1 class="mission-title">Would You Trust This Email?</h1>

        <p class="mission-subtitle">
            You are working in the Aurelia Global Security Operations Centre.
            An employee has received a message requesting immediate account verification.
            Your investigation begins here.
        </p>

        <div class="section-label">INCOMING MESSAGE</div>

        <article class="email-window">
            <div class="email-window-top">
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <span class="email-window-title">EMPLOYEE MAILBOX / MESSAGE PREVIEW</span>
            </div>

            <div class="email-meta">
                <div class="email-meta-row">
                    <span>From</span>
                    <strong>ITsupport@aureliaglobal-support.com</strong>
                </div>
                <div class="email-meta-row">
                    <span>To</span>
                    <strong>employee@aureliaglobal.coY</strong>
                </div>
                <div class="email-meta-row">
                    <span>Subject</span>
                    <strong>Immediate Action Required — Account Verification</strong>
                </div>
                <div class="email-meta-row">
                    <span>Date</span>
                    <strong>08 Nov 2026 · 07:42 UTC</strong>
                </div>
            </div>

            <div class="email-body">
                <h4>Immediate Action Required</h4>

                Dear Employee,

                <p>
                    We detected an issue with your account access.
                    Your account will be suspended unless you verify your credentials immediately.
                </p>

                <p>
                    Please use the following verification link:
                </p>

                <span class="fake-link">
                    https://aureliaglobal-support.com/verify-account
                </span>

                <p>
                    Failure to complete this process may result in restricted access
                    to company services.
                </p>

                <div class="email-signature">
                    Aurelia Global<br>
                    IT Support Team
                </div>
            </div>
        </article>

        <div class="section-label">YOUR FIRST DECISION</div>

        <p class="muted small">
            What would you do with this message?
        </p>

        <div class="email-actions">
            <button class="choice-button ${answer === "trust" ? "selected" : ""}"
                data-mission1="trust">
                <strong>Trust it</strong>
                <small>The message appears official.</small>
            </button>

            <button class="choice-button ${answer === "investigate" ? "selected" : ""}"
                data-mission1="investigate">
                <strong>Investigate first</strong>
                <small>Examine the message before acting.</small>
            </button>

            <button class="choice-button ${answer === "suspicious" ? "selected" : ""}"
                data-mission1="suspicious">
                <strong>Flag as suspicious</strong>
                <small>Potential phishing attempt.</small>
            </button>
        </div>

        <div id="mission1Feedback" class="mission-feedback"></div>
    `;

    if (answer) {
        showMissionOneFeedback(answer, false);
    }
}

function answerMissionOne(answer) {
    if (state.completedMissions.includes(0)) {
        showToast("This mission has already been completed.", "success");
        return;
    }

    state.answers.mission1 = answer;

    const points = {
        suspicious: 50,
        investigate: 40,
        trust: 15
    }[answer];

    awardPoints("mission1", points, "Initial email assessment");

    collectEvidence("email");

    completeMission(0);
    saveState();

    showMissionOneFeedback(answer, true);
    updateRank();
    renderMissionFooter();
}

function showMissionOneFeedback(answer, animate) {
    const feedback = $("#mission1Feedback");

    const messages = {
        suspicious: {
            title: "Correct instinct.",
            text: "The message contains multiple warning signs. Treat it as suspicious and investigate before interacting.",
            type: "success"
        },
        investigate: {
            title: "A cautious approach.",
            text: "Investigating first is safer than trusting the message. The indicators should be examined before any action.",
            type: "success"
        },
        trust: {
            title: "The message is not trustworthy.",
            text: "A professional appearance does not establish legitimacy. Urgency, a lookalike domain, and a credential request warrant investigation.",
            type: "warning"
        }
    };

    const result = messages[answer];

    feedback.innerHTML = `
        <div class="callout ${result.type}">
            <strong>${result.title}</strong><br>
            ${result.text}
            <br><br>
            <span class="tag purple">+${state.pointLedger.mission1?.amount || 0} IP</span>
        </div>
    `;

    if (animate) showCompletion("Initial assessment recorded", result.title);
}

/* =========================================================
   MISSION 2 — IDENTIFY THE RED FLAGS
========================================================= */

const RED_FLAGS = [
    {
        id: "sender",
        title: "Lookalike sender domain",
        description: "The sender uses aureliaglobal-support.com instead of the established company domain."
    },
    {
        id: "domain",
        title: "Recipient domain anomaly",
        description: "The recipient address ends in coY rather than the expected company domain."
    },
    {
        id: "urgency",
        title: "Urgency and account suspension",
        description: "The message pressures the employee to act immediately or lose account access."
    },
    {
        id: "replyTo",
        title: "Mismatched Reply-To address",
        description: "Replies are directed to mail-relay.net rather than the company's domain."
    },
    {
        id: "branding",
        title: "Professional-looking signature",
        description: "The message contains a corporate signature. This alone is not evidence of legitimacy."
    },
    {
        id: "format",
        title: "Plain-text formatting",
        description: "The message uses simple formatting. Plain text alone does not establish malicious intent."
    }
];

function renderMissionTwo() {
    selectedHotspots = [...state.answers.mission2];

    $("#missionContent").innerHTML = `
        <div class="mission-kicker">PHASE 02 · THREAT INDICATORS</div>

        <h1 class="mission-title">Identify the Red Flags.</h1>

        <p class="mission-subtitle">
            Inspect the email carefully. Select the four indicators
            that provide the strongest evidence of a phishing attempt.
            Not every unusual detail is necessarily malicious.
        </p>

        <div class="callout warning">
            <strong>Analyst instruction</strong><br>
            Select exactly four indicators. You can change your selections before submitting.
        </div>

        <div class="section-label">EMAIL INDICATORS</div>

        <div class="hotspot-grid">
            ${RED_FLAGS.map((flag, index) => {
                const selected = selectedHotspots.includes(flag.id);

                return `
                    <button class="hotspot ${selected ? "selected" : ""}"
                        data-hotspot="${flag.id}">
                        <div class="hotspot-top">
                            <span class="hotspot-number">INDICATOR ${String(index + 1).padStart(2, "0")}</span>
                            <span class="hotspot-check">${selected ? "✓" : ""}</span>
                        </div>
                        <strong>${flag.title}</strong>
                        <p>${flag.description}</p>
                    </button>
                `;
            }).join("")}
        </div>

        <div class="section-label">SELECTION</div>

        <p class="muted small">
            <span id="hotspotCount">${selectedHotspots.length}</span> / 4 indicators selected
        </p>

        <button class="button button-primary" id="submitHotspots">
            Submit indicators →
        </button>

        <div id="mission2Feedback" style="margin-top:18px;"></div>
    `;

    if (state.completedMissions.includes(1)) {
        showMissionTwoFeedback();
    }
}

function toggleHotspot(id) {
    if (state.completedMissions.includes(1)) return;

    if (selectedHotspots.includes(id)) {
        selectedHotspots = selectedHotspots.filter(item => item !== id);
    } else {
        if (selectedHotspots.length >= 4) {
            showToast("Select no more than four indicators.", "error");
            return;
        }

        selectedHotspots.push(id);
    }

    state.answers.mission2 = [...selectedHotspots];
    saveState();

    renderMissionTwo();
}

function submitHotspots() {
    if (state.completedMissions.includes(1)) return;

    if (selectedHotspots.length !== 4) {
        showToast("Select exactly four indicators before submitting.", "error");
        return;
    }

    const correct = ["sender", "domain", "urgency", "replyTo"];
    const correctCount = selectedHotspots.filter(id => correct.includes(id)).length;

    const points = correctCount * 20;

    awardPoints("mission2", points, "Red flag identification");

    state.answers.mission2 = [...selectedHotspots];

    collectEvidence("email");

    completeMission(1);
    updateAchievements();
    saveState();

    showMissionTwoFeedback(correctCount);
    showCompletion("Threat indicators recorded", `${correctCount} / 4 correct`);
    renderMissionFooter();
}

function showMissionTwoFeedback(correctCount) {
    const count = correctCount ?? selectedHotspots.filter(id =>
        ["sender", "domain", "urgency", "replyTo"].includes(id)
    ).length;

    $("#mission2Feedback").innerHTML = `
        <div class="callout ${count === 4 ? "success" : "warning"}">
            <strong>${count === 4 ? "Excellent analysis." : "Analysis recorded."}</strong><br>
            You identified ${count} of the four strongest indicators.
            The signature and formatting are not sufficient evidence of phishing.
            <br><br>
            <span class="tag purple">+${state.pointLedger.mission2?.amount || 0} IP</span>
        </div>
    `;
}

/* =========================================================
   MISSION 3 — INVESTIGATE THE EMAIL
========================================================= */

function renderMissionThree() {
    const answer = state.answers.mission3;

    $("#missionContent").innerHTML = `
        <div class="mission-kicker">PHASE 03 · TECHNICAL ANALYSIS</div>

        <h1 class="mission-title">Investigate the Email.</h1>

        <p class="mission-subtitle">
            A suspicious email can pass some authentication checks and still be malicious.
            Examine the technical indicators and decide what the evidence actually proves.
        </p>

        <div class="section-label">EMAIL AUTHENTICATION</div>

        <div class="analysis-grid">
            <article class="analysis-card">
                <h3>SPF</h3>
                <span class="tag green">PASS</span>
                <p>Sender is authorized by the domain's SPF record.</p>
                <code>spf=pass</code>
            </article>

            <article class="analysis-card">
                <h3>DKIM</h3>
                <span class="tag green">PASS</span>
                <p>Message signature validates for the signing domain.</p>
                <code>d=aureliaglobal-support.com</code>
            </article>

            <article class="analysis-card">
                <h3>DMARC</h3>
                <span class="tag warning">p=none</span>
                <p>Monitoring policy. It does not request quarantine or rejection.</p>
                <code>dmarc=pass · policy=none</code>
            </article>

            <article class="analysis-card">
                <h3>Sender alignment</h3>
                <span class="tag red">LOOKALIKE</span>
                <p>The authenticated domain is not the established company domain.</p>
                <code>aureliaglobal-support.com</code>
            </article>
        </div>

        <div class="section-label">YOUR TECHNICAL CONCLUSION</div>

        <div class="panel">
            <h3 style="margin-top:0;font-size:14px;">
                Does successful email authentication prove this message is legitimate?
            </h3>

            <label class="analysis-option ${answer === "legitimate" ? "selected" : ""}">
                <input type="radio" name="mission3" value="legitimate"
                    ${answer === "legitimate" ? "checked" : ""}>
                <span>
                    <strong>Yes — SPF and DKIM passed.</strong>
                    <small>Authentication proves the message is safe.</small>
                </span>
            </label>

            <label class="analysis-option ${answer === "suspicious" ? "selected" : ""}">
                <input type="radio" name="mission3" value="suspicious"
                    ${answer === "suspicious" ? "checked" : ""}>
                <span>
                    <strong>No — the message remains suspicious.</strong>
                    <small>Authentication applies to a domain, not its trustworthiness.</small>
                </span>
            </label>

            <label class="analysis-option ${answer === "uncertain" ? "selected" : ""}">
                <input type="radio" name="mission3" value="uncertain"
                    ${answer === "uncertain" ? "checked" : ""}>
                <span>
                    <strong>The results are inconclusive.</strong>
                    <small>More evidence is required to determine legitimacy.</small>
                </span>
            </label>

            <button class="button button-primary" id="submitMission3" style="margin-top:20px;">
                Confirm analysis →
            </button>

            <div id="mission3Feedback" style="margin-top:15px;"></div>
        </div>
    `;

    if (answer) showMissionThreeFeedback(answer, false);
}

function answerMissionThree(answer) {
    if (state.completedMissions.includes(2)) return;

    state.answers.mission3 = answer;

    const points = answer === "suspicious" ? 75 :
        answer === "uncertain" ? 35 : 10;

    awardPoints("mission3", points, "Email authentication analysis");

    collectEvidence("email");

    completeMission(2);
    updateAchievements();
    saveState();

    showMissionThreeFeedback(answer, true);
    renderMissionFooter();
}

function showMissionThreeFeedback(answer, animate) {
    const messages = {
        suspicious: {
            title: "Correct technical interpretation.",
            text: "SPF and DKIM can authenticate a lookalike domain. They do not establish that the sender is the real company. DMARC p=none is a monitoring policy, not a protective enforcement policy.",
            type: "success"
        },
        legitimate: {
            title: "Authentication is not trust.",
            text: "SPF and DKIM passed for the lookalike domain. A malicious sender can authenticate its own domain. DMARC p=none also does not enforce quarantine or rejection.",
            type: "warning"
        },
        uncertain: {
            title: "Reasonable caution, but stronger evidence exists.",
            text: "The domain mismatch, Reply-To anomaly, credential request, and urgency strongly support treating the message as phishing.",
            type: "warning"
        }
    };

    const result = messages[answer];

    $("#mission3Feedback").innerHTML = `
        <div class="callout ${result.type}">
            <strong>${result.title}</strong><br>
            ${result.text}
            <br><br>
            <span class="tag purple">+${state.pointLedger.mission3?.amount || 0} IP</span>
        </div>
    `;

    if (animate) showCompletion("Technical analysis recorded", result.title);
}
