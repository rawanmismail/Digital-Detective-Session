
/* =========================================================
   DIGITAL DETECTIVE
   OPERATION BLACKOUT — CASE FILE 001
   AURELIA GLOBAL
   ========================================================= */

const STORAGE_KEY = "digitalDetectiveOperationBlackout";
const VERSION = 2;

const DEFAULT_STATE = {
    version: VERSION,
    currentMission: 0,
    completedMissions: [],
    unlockedMissions: [0],
    collectedEvidence: [],
    answers: {},
    points: 0,
    activityPoints: {},
    hintUsed: [],
    achievements: [],
    finalReport: false
};

const SCORE = {
    mission1: 50,
    mission2: 80,
    mission3: 75,
    mission4: 100,
    mission5: 75
};

const RANKS = [
    { name: "Trainee Analyst", min: 0 },
    { name: "Threat Spotter", min: 80 },
    { name: "Security Investigator", min: 160 },
    { name: "Cyber Detective", min: 240 },
    { name: "Elite Incident Responder", min: 320 }
];

const ACHIEVEMENTS = {
    eagleEye: {
        title: "Eagle Eye",
        description: "Identify all four phishing indicators.",
        icon: "◉"
    },
    headerHunter: {
        title: "Header Hunter",
        description: "Correctly interpret SPF, DKIM and DMARC.",
        icon: "⌘"
    },
    evidenceExpert: {
        title: "Evidence Expert",
        description: "Inspect every forensic evidence record.",
        icon: "▤"
    },
    timelineMaster: {
        title: "Timeline Master",
        description: "Reconstruct the incident chronology accurately.",
        icon: "◷"
    },
    incidentCommander: {
        title: "Incident Commander",
        description: "Answer all three final verdict questions correctly.",
        icon: "◆"
    }
};

const MISSION_HINTS = {
    0: "Unexpected credential requests should never be trusted solely because they appear to come from IT. Verify through an independent channel.",
    1: "Compare the sender domain with the legitimate domain. Look for pressure, credential requests and mismatched destinations.",
    2: "SPF and DKIM authenticate a sending domain. They do not prove that the domain belongs to the legitimate organisation.",
    3: "Separate delivery from opening, opening from visiting, and credential submission from subsequent authentication.",
    4: "Distinguish confirmed evidence from suspicion. Containment is the priority when compromise is suspected."
};

let state = loadState();
let currentMission = state.currentMission;
let selectedHotspots = [];
let selectedLogs = [];
let timelineAnswers = [];
let selectedFinalAnswers = {};
let toastTimeout;

/* =========================================================
   STATE / STORAGE
   ========================================================= */

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return structuredClone(DEFAULT_STATE);

        const parsed = JSON.parse(saved);

        return {
            ...structuredClone(DEFAULT_STATE),
            ...parsed,
            answers: parsed.answers || {},
            activityPoints: parsed.activityPoints || {},
            collectedEvidence: parsed.collectedEvidence || [],
            completedMissions: parsed.completedMissions || [],
            unlockedMissions: parsed.unlockedMissions || [0],
            achievements: parsed.achievements || [],
            hintUsed: parsed.hintUsed || []
        };
    } catch (error) {
        console.warn("Progress could not be loaded.", error);
        return structuredClone(DEFAULT_STATE);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn("Progress could not be saved.", error);
        showToast("Browser storage unavailable. Progress may not persist.");
    }
}

function $(selector) {
    return document.querySelector(selector);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function currentPoints() {
    return Math.max(0, Math.min(380, state.points || 0));
}

function getRank() {
    const points = currentPoints();
    return [...RANKS].reverse().find(rank => points >= rank.min);
}

function awardPoints(activity, amount) {
    if (state.activityPoints[activity] !== undefined) return;

    const penalty = state.hintUsed.includes(activity.split(":")[0])
        ? 10
        : 0;

    const earned = Math.max(0, amount - penalty);

    state.activityPoints[activity] = earned;
    state.points = currentPoints() + earned;

    saveState();
    updateProgress();

    showToast(`+${earned} Investigation Points`);
}

function unlockAchievement(id) {
    if (!ACHIEVEMENTS[id]) return;
    if (state.achievements.includes(id)) return;

    state.achievements.push(id);
    saveState();
    renderAchievements();
    showToast(`Achievement unlocked: ${ACHIEVEMENTS[id].title}`);
}

function markEvidenceCollected(id) {
    if (state.collectedEvidence.includes(id)) return;

    state.collectedEvidence.push(id);
    saveState();
    updateProgress();
    showToast("Evidence added to your investigation locker.");
}

function isMissionComplete(index) {
    return state.completedMissions.includes(index);
}

function completeMission(index) {
    if (!state.completedMissions.includes(index)) {
        state.completedMissions.push(index);
    }

    if (index < 4 && !state.unlockedMissions.includes(index + 1)) {
        state.unlockedMissions.push(index + 1);
    }

    state.currentMission = Math.min(index + 1, 4);

    saveState();
    updateProgress();
    missionCompletionEffect();
}

function missionCompletionEffect() {
    const content = $("#missionContent");
    if (!content) return;

    content.classList.remove("mission-complete-animation");
    void content.offsetWidth;
    content.classList.add("mission-complete-animation");
}

function useHint(mission) {
    const key = String(mission);

    if (state.hintUsed.includes(key)) {
        showToast("Hint penalty already applied for this mission.");
        return;
    }

    state.hintUsed.push(key);
    state.points = Math.max(0, currentPoints() - 10);

    saveState();
    updateProgress();

    const area = $(`#mission${mission + 1}Hint`);
    if (area) {
        area.innerHTML = `
            <div class="feedback warning">
                <strong>Investigator hint · −10 IP</strong>
                <p>${escapeHTML(MISSION_HINTS[mission])}</p>
            </div>`;
    }

    showToast("Hint unlocked · 10 IP deducted.");
}

function resetTemporaryMissionState() {
    selectedHotspots = [];
    selectedLogs = [];
    timelineAnswers = [];
    selectedFinalAnswers = {};
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showHome() {
    $("#homeView")?.classList.remove("hidden");
    $("#workspaceView")?.classList.add("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showWorkspace() {
    $("#homeView")?.classList.add("hidden");
    $("#workspaceView")?.classList.remove("hidden");

    currentMission = state.currentMission;
    restoreTemporaryState();

    renderMission();
    updateProgress();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function restoreTemporaryState() {
    selectedHotspots = state.answers.mission2Clues || [];
    selectedLogs = state.answers.mission4Logs || [];
    timelineAnswers = state.answers.timeline || [];
    selectedFinalAnswers = state.answers.finalVerdict || {};
}

function goToMission(index) {
    if (!state.unlockedMissions.includes(index)) {
        showToast("Complete the previous mission to unlock this file.");
        return;
    }

    currentMission = index;
    state.currentMission = index;

    restoreTemporaryState();
    saveState();
    renderMission();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   SIDEBAR / PROGRESS / ACHIEVEMENTS
   ========================================================= */

function updateProgress() {
    const completed = state.completedMissions.length;

    if ($("#progressCount")) {
        $("#progressCount").textContent = `${completed} / 5`;
    }

    if ($("#progressFill")) {
        $("#progressFill").style.width = `${completed * 20}%`;
    }

    if ($("#evidenceCount")) {
        $("#evidenceCount").textContent = state.collectedEvidence.length;
    }

    if ($("#investigationPoints")) {
        $("#investigationPoints").textContent = currentPoints();
    }

    if ($("#analystRank")) {
        $("#analystRank").textContent = getRank().name;
    }

    if ($("#achievementCount")) {
        $("#achievementCount").textContent =
            `${state.achievements.length} / ${Object.keys(ACHIEVEMENTS).length}`;
    }

    document.querySelectorAll(".mission-nav-item").forEach(button => {
        const index = Number(button.dataset.mission);
        const unlocked = state.unlockedMissions.includes(index);
        const completedMission = isMissionComplete(index);

        button.disabled = !unlocked;
        button.classList.toggle("locked", !unlocked);
        button.classList.toggle("active", currentMission === index);
        button.classList.toggle("completed", completedMission);

        const status = button.querySelector(".mission-state");

        if (status) {
            status.textContent = completedMission ? "✓" : unlocked
                ? currentMission === index ? "●" : "○"
                : "⌑";
        }
    });

    renderAchievements();
}

function renderAchievements() {
    const container = $("#achievementDisplay");
    if (!container) return;

    container.innerHTML = Object.entries(ACHIEVEMENTS).map(([id, item]) => {
        const unlocked = state.achievements.includes(id);

        return `
            <div class="achievement-item ${unlocked ? "unlocked" : "locked"}"
                 title="${escapeHTML(item.description)}">
                <span class="achievement-icon">${item.icon}</span>
                <span class="achievement-name">${escapeHTML(item.title)}</span>
                <span class="achievement-status">${unlocked ? "UNLOCKED" : "LOCKED"}</span>
            </div>`;
    }).join("");
}

/* =========================================================
   SHARED COMPONENTS
   ========================================================= */

function sectionLabel(text) {
    return `<div class="section-label">${text}</div>`;
}

function panel(title, content, tag = "") {
    return `
        <section class="panel">
            <div class="panel-heading">
                <h3>${title}</h3>
                ${tag ? `<span class="panel-tag">${tag}</span>` : ""}
            </div>
            ${content}
        </section>`;
}

function infoCard(title, description, badge = "") {
    return `
        <article class="info-card">
            ${badge ? `<span class="status-badge badge-info">${badge}</span>` : ""}
            <h3 class="mt-10">${title}</h3>
            <p class="mt-10">${description}</p>
        </article>`;
}

function missionHeading(number, title, description, label) {
    return `
        ${sectionLabel(label)}
        <h1>${title}</h1>
        <p class="mb-15">${description}</p>
        <span class="status-badge badge-purple">
            MISSION ${String(number).padStart(2, "0")} / 05
        </span>`;
}

function feedback(title, description, type = "success") {
    return `
        <div class="feedback ${type}">
            <strong>${title}</strong>
            <p>${description}</p>
        </div>`;
}

function hintButton(mission) {
    return `
        <button class="secondary-button hint-button"
                data-action="hint" data-mission="${mission}">
            REQUEST INVESTIGATOR HINT · −10 IP
        </button>
        <div id="mission${mission + 1}Hint" class="mt-15"></div>`;
}

/* =========================================================
   RENDERER
   ========================================================= */

function renderMission() {
    const renderers = [
        renderMissionOne,
        renderMissionTwo,
        renderMissionThree,
        renderMissionFour,
        renderMissionFive
    ];

    $("#missionCrumb").textContent =
        `CASE FILE 001 / MISSION ${String(currentMission + 1).padStart(2, "0")}`;

    $("#missionContent").innerHTML = renderers[currentMission]();

    renderMissionFooter();
    updateProgress();
}

function renderMissionFooter() {
    const footer = $("#missionFooter");
    if (!footer) return;

    const complete = isMissionComplete(currentMission);

    footer.innerHTML = `
        <span class="footer-note">
            ${complete ? "MISSION COMPLETED · REVIEW THIS FILE" : "COMPLETE THE INVESTIGATION TASK TO CONTINUE"}
        </span>
        <div class="footer-actions">
            <button class="secondary-button" data-action="open-evidence">EVIDENCE LOCKER</button>
            ${currentMission === 4
                ? `<button class="action-button" data-action="print-report">PRINT FINAL REPORT</button>`
                : complete
                    ? `<button class="action-button" data-action="next-mission">NEXT MISSION →</button>`
                    : ""}
        </div>`;
}

/* =========================================================
   MISSION 1 — INITIAL ASSESSMENT
   ========================================================= */

function renderMissionOne() {
    const answer = state.answers.mission1;

    return `
        ${missionHeading(1, "Would You Trust This Email?",
            "An urgent corporate alert has reached an Aurelia Global employee. Make your initial assessment.",
            "FIELD BRIEFING · INITIAL ASSESSMENT")}

        <div class="two-column-layout mt-20">
            <div>
                ${sectionLabel("SIMULATED INBOX CAPTURE")}
                <div class="email-window">
                    <div class="email-top">
                        <strong>✉ Corporate Mailbox</strong>
                        <span class="status-badge badge-warning">URGENT</span>
                    </div>
                    <div class="email-details">
                        <div class="email-detail"><span>From:</span><span>ITsupport@aureliaglobal-support.com</span></div>
                        <div class="email-detail"><span>To:</span><span>employee@aureliaglobal.coY</span></div>
                        <div class="email-detail"><span>Subject:</span><span>Immediate Action Required — Account Verification</span></div>
                        <div class="email-detail"><span>Security:</span><span>TLS 1.3 encrypted · Priority: High</span></div>
                    </div>
                    <div class="email-body">
                        <p>Aurelia Global SSO maintenance has detected unverified multi-factor credentials for your workstation.</p>
                        <p>Verify your profile within two hours to maintain operational continuity.</p>
                        <div class="email-warning"><strong>Failure to verify will result in immediate enterprise access suspension.</strong></div>
                        <div class="email-verify">Verify Account Credentials Now</div>
                        <p class="email-disclaimer">SIMULATED EMAIL · DO NOT OPEN EXTERNAL LINKS</p>
                    </div>
                </div>
            </div>

            <div>
                ${panel("Field briefing", `
                    <h4 class="text-cyan">01 · Would you trust this email?</h4>
                    <p class="mt-10">Compare the sender with normal IT practice.</p>
                    <div class="divider"></div>
                    <h4 class="text-cyan">02 · What makes you suspicious?</h4>
                    <p class="mt-10">Consider tone, domain and pressure.</p>
                    <div class="divider"></div>
                    <h4 class="text-cyan">03 · What would you investigate first?</h4>
                    <p class="mt-10">Verify through an independent official channel.</p>
                `, "INITIAL ASSESSMENT")}

                <div class="panel mt-20">
                    <h3>Your initial judgement</h3>
                    <p class="mt-10">Choose your first action.</p>
                    <div class="mt-20" style="display:grid;gap:10px;">
                        ${[
                            ["trust", "Trust the email and verify immediately"],
                            ["suspicious", "Treat it as suspicious and report it"],
                            ["investigate", "Pause and investigate before deciding"]
                        ].map(([id, text]) => `
                            <button class="option-button ${answer === id ? "selected" : ""}"
                                    data-action="mission1-answer" data-answer="${id}">
                                <span>${answer === id ? "✓" : "＋"}</span>${text}
                            </button>`).join("")}
                    </div>
                    <div id="mission1Feedback" class="mt-20">
                        ${answer ? missionOneFeedback(answer) : ""}
                    </div>
                </div>
            </div>
        </div>
        ${hintButton(0)}
    `;
}

function missionOneFeedback(answer) {
    const messages = {
        trust: ["That decision carries risk.", "Never enter credentials through an unexpected email link.", "warning"],
        suspicious: ["Good security instinct.", "The sender domain and urgent credential request are suspicious. Report it through official channels.", "success"],
        investigate: ["Strong investigative approach.", "Preserve the message and verify through official IT channels before taking action.", "success"]
    };
    const [title, text, type] = messages[answer];
    return feedback(title, text, type);
}

function answerMissionOne(answer) {
    if (state.answers.mission1) {
        showToast("Your initial assessment is already recorded.");
        return;
    }

    state.answers.mission1 = answer;
    markEvidenceCollected("email");

    awardPoints("m1:assessment", answer === "investigate" ? 50 : answer === "suspicious" ? 35 : 0);
    completeMission(0);

    $("#mission1Feedback").innerHTML = missionOneFeedback(answer);
    renderMissionFooter();
    showToast("Mission 1 completed. Mission 2 unlocked.");
}

/* =========================================================
   MISSION 2 — RED FLAGS
   ========================================================= */

const redFlags = {
    sender: "The sender domain does not match the legitimate corporate domain.",
    urgency: "Pressure and threats encourage rushed decisions.",
    credentials: "Unexpected credential requests through email links are suspicious.",
    destination: "The destination host is not the official company domain."
};

function renderMissionTwo() {
    const clues = Object.keys(redFlags);
    const found = state.answers.mission2Clues || [];

    return `
        ${missionHeading(2, "Identify the Red Flags",
            "Inspect the simulated message. Identify all four suspicious indicators.",
            "FORENSIC TELEMETRY · MISSION 2")}

        <div class="panel mt-20">
            <div class="panel-heading">
                <h3>Simulated email evidence</h3>
                <span class="status-badge badge-warning">SUSPICIOUS MESSAGE</span>
            </div>
            <div class="email-window">
                <div class="email-details">
                    <div class="email-detail"><span>From:</span>
                        <button class="hotspot ${found.includes("sender") ? "found" : ""}"
                                data-action="mission2-clue" data-clue="sender">
                            ITsupport@aureliaglobal-support.com
                        </button></div>
                    <div class="email-detail"><span>To:</span><span>employee@aureliaglobal.coY</span></div>
                    <div class="email-detail"><span>Subject:</span><span>Immediate Action Required — Account Verification</span></div>
                </div>
                <div class="email-body">
                    <p>Aurelia Global SSO maintenance has detected unverified multi-factor credentials.</p>
                    <p>Verify your profile within
                        <button class="hotspot ${found.includes("urgency") ? "found" : ""}"
                                data-action="mission2-clue" data-clue="urgency">TWO HOURS</button>
                        to avoid immediate account suspension.</p>
                    <p>Verify your
                        <button class="hotspot ${found.includes("credentials") ? "found" : ""}"
                                data-action="mission2-clue" data-clue="credentials">ACCOUNT CREDENTIALS</button>
                        using the button below.</p>
                    <button class="email-verify" data-action="mission2-clue" data-clue="destination">
                        Verify Account Credentials Now
                    </button>
                    <p class="email-disclaimer">SIMULATED MESSAGE · LINK IS NOT ACTIVE</p>
                </div>
            </div>
        </div>

        <div class="panel mt-20">
            <div class="panel-heading">
                <h3>Find the four red flags</h3>
                <span class="panel-tag">${found.length} / 4 IDENTIFIED</span>
            </div>
            <p>Select each indicator below.</p>
            <div class="card-grid mt-20">
                ${clues.map((id, index) => `
                    <button class="option-button ${found.includes(id) ? "selected" : ""}"
                            data-action="mission2-clue" data-clue="${id}">
                        <span>${found.includes(id) ? "✓" : "＋"}</span>
                        <span>${["Sender domain", "Urgency and threat", "Credential request", "Destination host"][index]}</span>
                    </button>`).join("")}
            </div>
            <div id="mission2Feedback" class="mt-20">
                ${found.length ? `<p class="text-cyan">${found.length} of 4 indicators identified.</p>` : ""}
            </div>
        </div>
        ${hintButton(1)}
    `;
}

function selectMissionTwoClue(id) {
    const found = state.answers.mission2Clues || [];

    if (!redFlags[id] || found.includes(id)) return;

    found.push(id);
    state.answers.mission2Clues = found;

    markEvidenceCollected("metadata");
    awardPoints(`m2:${id}`, 20);

    if (found.length === 4) {
        unlockAchievement("eagleEye");
        completeMission(1);
        showToast("All red flags identified. Mission 3 unlocked.");
    }

    saveState();
    renderMission();
}

/* =========================================================
   MISSION 3 — EMAIL INVESTIGATION
   ========================================================= */

function renderMissionThree() {
    const answer = state.answers.mission3;
    const request = state.answers.mission3Request;

    return `
        ${missionHeading(3, "Investigate the Email",
            "Authentication results introduce a more interesting question. Work through the technical evidence.",
            "FORENSIC TELEMETRY · MISSION 3")}

        <div class="card-grid three-columns mt-20">
            ${infoCard("Sender", "ITsupport@aureliaglobal-support.com", "SIMULATED EVIDENCE")}
            ${infoCard("Legitimate domain", "aureliaglobal.com", "CORPORATE DOMAIN")}
            ${infoCard("Destination", "aureliaglobal-support.com/verify-account", "DO NOT OPEN")}
        </div>

        ${panel("Email authentication results", `
            <div class="card-grid three-columns">
                <div class="info-card"><span class="status-badge badge-success">PASS</span><h3 class="mt-10">SPF</h3><p class="mt-10">Sending IP authorised by the lookalike domain's SPF policy.</p></div>
                <div class="info-card"><span class="status-badge badge-success">PASS</span><h3 class="mt-10">DKIM</h3><p class="mt-10">Valid signature associated with d=aureliaglobal-support.com.</p></div>
                <div class="info-card"><span class="status-badge badge-warning">p=none</span><h3 class="mt-10">DMARC</h3><p class="mt-10">Monitoring policy; no quarantine or reject enforcement.</p></div>
            </div>
            <div class="feedback warning mt-20">
                <strong>Investigator's caution</strong>
                <p>A lookalike domain can pass SPF and DKIM for itself. Authentication establishes provenance, not intent.</p>
            </div>
        `, "PROTOCOL-LEVEL VERIFICATION")}

        ${panel("Email metadata", `
            <div class="table-wrapper"><table class="data-table">
                <thead><tr><th>FIELD</th><th>OBSERVED VALUE</th></tr></thead>
                <tbody>
                    <tr><td>Reply-To</td><td>collect.aurelia@mail-relay.net</td></tr>
                    <tr><td>Received</td><td>Unknown relay 203.0.113.45</td></tr>
                    <tr><td>Date</td><td>08 Nov 2026, 07:42 UTC</td></tr>
                    <tr><td>X-Mailer</td><td>bulk-sender v2</td></tr>
                </tbody></table></div>
            <p class="mt-15">The Reply-To address differs from the sender domain. The relay and bulk-sender metadata deserve investigation.</p>
        `, "SIMULATED METADATA")}

        <div class="panel mt-20">
            <h3>Investigator's challenge</h3>
            <p class="mt-10">Which conclusion best explains the evidence?</p>
            <div class="mt-20" style="display:grid;gap:10px;">
                ${[
                    ["safe", "A. SPF and DKIM passed, so the email is safe."],
                    ["suspicious", "B. The email is suspicious despite passing SPF and DKIM."],
                    ["proof", "C. The metadata proves the identity of the attacker."]
                ].map(([id, text]) => `<button class="option-button ${answer === id ? "selected" : ""}" data-action="mission3-answer" data-answer="${id}">${text}</button>`).join("")}
            </div>
            <div id="mission3Feedback" class="mt-20">${answer ? missionThreeFeedback(answer) : ""}</div>
        </div>

        <div class="panel mt-20">
            <h3>What would you request next?</h3>
            <div class="mt-20" style="display:grid;gap:10px;">
                ${[
                    ["headers", "Full email headers and gateway logs"],
                    ["domain", "The legitimate domain's DMARC record"],
                    ["registration", "The lookalike URL's registration history"]
                ].map(([id, text]) => `<button class="option-button ${request === id ? "selected" : ""}" data-action="mission3-request" data-request="${id}">${text}</button>`).join("")}
            </div>
            <div id="mission3RequestFeedback" class="mt-20">${request ? feedback("Investigation request recorded.", missionThreeRequestText(request)) : ""}</div>
        </div>
        ${hintButton(2)}
    `;
}

function missionThreeFeedback(answer) {
    if (answer === "suspicious") {
        return feedback("Correct assessment.", "SPF and DKIM passed for the lookalike sender domain. DMARC is p=none. These results do not prove the sender is the legitimate company.", "success");
    }
    return feedback("Not quite.", answer === "safe"
        ? "Authentication can pass for an attacker's own domain. Compare the authenticated domain with the legitimate organisation."
        : "Metadata provides clues, but does not establish the attacker's identity.", "warning");
}

function missionThreeRequestText(request) {
    return {
        headers: "Full headers and gateway logs help reconstruct transmission and authentication context.",
        domain: "The legitimate domain's DMARC record helps establish its published email-authentication policy.",
        registration: "Domain registration history can reveal whether the lookalike domain was recently created or changed."
    }[request];
}

function answerMissionThree(answer) {
    state.answers.mission3 = answer;

    if (answer === "suspicious") {
        markEvidenceCollected("authenticationDetails");
        markEvidenceCollected("metadata");
        awardPoints("m3:interpretation", 40);
        unlockAchievement("headerHunter");
    } else {
        showToast("Review the authentication results and try again.");
    }

    saveState();
    renderMission();
    checkMissionThreeCompletion();
}

function answerMissionThreeRequest(request) {
    state.answers.mission3Request = request;
    markEvidenceCollected("metadata");
    awardPoints("m3:request", 35);

    saveState();
    renderMission();
    checkMissionThreeCompletion();
}

function checkMissionThreeCompletion() {
    if (state.answers.mission3 === "suspicious" && state.answers.mission3Request) {
        completeMission(2);
        renderMissionFooter();
        showToast("Email investigation complete. Mission 4 unlocked.");
    }
}

/* =========================================================
   MISSION 4 — EVIDENCE / TIMELINE
   ========================================================= */

const logDatabase = {
    email: {
        file: "email_delivery.log",
        time: "09:05",
        title: "Email delivery record",
        lines: ["[09:05:00] External message accepted by mail gateway.", "[09:05:01] Subject: Urgent: payroll update.", "[09:05:02] Sender classified as external.", "[09:05:03] Message delivered to employee mailbox."],
        evidence: "email"
    },
    browser: {
        file: "browser_activity.log",
        time: "09:14",
        title: "Browser activity record",
        lines: ["[09:14:00] Employee opened external verification URL.", "[09:14:03] Page imitates Aurelia Global login.", "[09:14:05] External page loaded."],
        evidence: "browser"
    },
    credentials: {
        file: "credential_activity.log",
        time: "09:16",
        title: "Credential submission record",
        lines: ["[09:16:00] Credentials submitted to external page.", "[09:16:02] No second-factor challenge recorded."],
        evidence: "credentials"
    },
    authentication: {
        file: "authentication.log",
        time: "09:24",
        title: "Unfamiliar login",
        lines: ["[09:24:00] Successful authentication recorded.", "[09:24:01] Source IP: 203.0.113.47.", "[09:24:02] Device: unfamiliar device.", "[09:24:03] Time: outside usual hours."],
        evidence: "authentication"
    },
    files: {
        file: "file_access.log",
        time: "09:27",
        title: "File access record",
        lines: ["[09:27:00] Shared finance folder listed.", "[09:27:03] One file opened from the new session.", "[09:27:05] Exact access scope not established."],
        evidence: "files"
    }
};

const timelineEvents = [
    { id: "email", time: "09:05", title: "Suspicious email received" },
    { id: "opened", time: "09:12", title: "Employee opens the email" },
    { id: "link", time: "09:14", title: "Suspicious link visited" },
    { id: "credentials", time: "09:16", title: "Login credentials entered" },
    { id: "login", time: "09:24", title: "Unfamiliar successful login" },
    { id: "files", time: "09:27", title: "Unusual finance-file access" },
    { id: "contact", time: "09:30", title: "Employee contacts IT support" }
];

function renderMissionFour() {
    const logs = Object.entries(logDatabase);
    const inspected = state.answers.mission4Logs || [];
    const timeline = state.answers.timeline || [];

    return `
        ${missionHeading(4, "Examine the Evidence",
            "Inspect the records, correlate the events and reconstruct the incident chronology.",
            "DIGITAL FORENSICS · MISSION 4")}

        ${panel("Digital forensics briefing", `
            <div class="card-grid three-columns">
                ${infoCard("Logs", "Time-stamped system records.")}
                ${infoCard("Metadata", "Information about messages and files.")}
                ${infoCard("Indicators of compromise", "Traces that signal possible intrusion.")}
                ${infoCard("Evidence preservation", "Copying data without altering it.")}
                ${infoCard("Chain of custody", "Documenting who handled evidence and when.")}
                ${infoCard("Correlation", "Connecting independent records into a sequence.")}
            </div>
        `, "FORENSIC BRIEFING")}

        <div class="panel mt-20">
            <div class="panel-heading"><h3>Evidence acquisition</h3><span class="panel-tag">${inspected.length} / 5 INSPECTED</span></div>
            <p>Open each record to inspect its contents.</p>
            <div class="card-grid mt-20">
                ${logs.map(([id, log]) => `
                    <button class="option-button ${inspected.includes(id) ? "selected" : ""}" data-action="inspect-log" data-log="${id}">
                        <span>${inspected.includes(id) ? "✓" : "▤"}</span>
                        <span><strong>${log.file}</strong><small class="mono muted">${log.time} · SIMULATED</small></span>
                    </button>`).join("")}
            </div>
            <div id="logViewer" class="mt-20">${renderLogViewer(state.answers.lastLog)}</div>
        </div>

        <div class="panel mt-20">
            <div class="panel-heading"><h3>Reconstruct the incident timeline</h3><span class="panel-tag">${timeline.length} / 7 EVENTS</span></div>
            <p>Arrange the events chronologically. A wrong choice does not erase your progress.</p>
            <div id="timelineProgress" class="mt-20">${renderTimelineProgress()}</div>
            <div class="divider"></div>
            <div class="card-grid timeline-options mt-20">${getTimelineOptions()}</div>
            <div id="timelineFeedback" class="mt-20"></div>
        </div>

        ${panel("Investigator's discussion", `
            <h4 class="text-cyan">What is the strongest correlation?</h4>
            <p class="mt-10">Credential submission is followed by an unfamiliar successful login.</p>
            <div class="divider"></div>
            <h4 class="text-cyan">What remains uncertain?</h4>
            <p class="mt-10">Attacker identity, complete access scope and possible exfiltration remain unconfirmed.</p>
        `, "DISCUSS")}
        ${hintButton(3)}
    `;
}

function renderLogViewer(id) {
    const log = logDatabase[id];

    if (!log) {
        return `<div class="empty-evidence"><span>▤</span><strong>Select an evidence record</strong><p>Its simulated contents will appear here.</p></div>`;
    }

    return `
        <div class="log-window">
            <div class="log-header"><strong>${escapeHTML(log.file)}</strong><span class="status-badge badge-info">SIMULATED RECORD</span></div>
            <div class="log-content">${log.lines.map(line => `<span class="log-line">${escapeHTML(line)}</span>`).join("")}</div>
        </div>
        ${feedback(log.title, evidenceDescription(log.evidence))}
    `;
}

function evidenceDescription(id) {
    return {
        email: "The suspicious message reached the employee mailbox at 09:05.",
        browser: "The employee visited the imitation login page at 09:14.",
        credentials: "Credentials were submitted at 09:16.",
        authentication: "An unfamiliar successful login occurred at 09:24 from 203.0.113.47.",
        files: "A finance folder was listed and one file opened at 09:27. Scope remains uncertain."
    }[id] || "Evidence record preserved.";
}

function inspectLog(id) {
    const log = logDatabase[id];
    if (!log) return;

    const inspected = state.answers.mission4Logs || [];

    if (!inspected.includes(id)) {
        inspected.push(id);
        state.answers.mission4Logs = inspected;

        markEvidenceCollected(log.evidence);
        awardPoints(`m4:log:${id}`, 10);
    }

    state.answers.lastLog = id;

    if (id === "authentication") markEvidenceCollected("authentication");
    if (id === "files") markEvidenceCollected("files");

    saveState();
    renderMission();

    if (inspected.length === 5) {
        unlockAchievement("evidenceExpert");
    }

    updateMissionFourProgress();
}

function renderTimelineProgress() {
    const answers = state.answers.timeline || [];

    if (!answers.length) {
        return `<p class="muted">No events arranged yet. Start with 09:05.</p>`;
    }

    return `<div class="timeline">${answers.map(id => {
        const event = timelineEvents.find(item => item.id === id);
        return `<div class="timeline-item"><span class="timeline-time">${event.time}</span><h4>${event.title}</h4></div>`;
    }).join("")}</div>`;
}

function getTimelineOptions() {
    const answers = state.answers.timeline || [];
    const remaining = timelineEvents.filter(event => !answers.includes(event.id));

    // Deliberately shuffled: participants must interpret the chronology.
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);

    return shuffled.map(event => `
        <button class="option-button" data-action="timeline-select" data-event="${event.id}">
            <span class="mono text-cyan">${event.time}</span><span>${event.title}</span>
        </button>`).join("");
}

function selectTimelineEvent(id) {
    const answers = state.answers.timeline || [];
    const expected = timelineEvents[answers.length];

    if (!expected || answers.includes(id)) return;

    if (id !== expected.id) {
        $("#timelineFeedback").innerHTML = feedback(
            "Sequence mismatch.",
            "Compare the timestamps and distinguish email delivery, opening, link access and credential submission.",
            "warning"
        );
        return;
    }

    answers.push(id);
    state.answers.timeline = answers;

    awardPoints(`m4:timeline:${id}`, Math.round(50 / 7));

    if (answers.length === 7) {
        unlockAchievement("timelineMaster");
    }

    saveState();
    renderMission();
    updateMissionFourProgress();
}

function updateMissionFourProgress() {
    const logs = state.answers.mission4Logs || [];
    const timeline = state.answers.timeline || [];

    if (logs.length === 5 && timeline.length === 7) {
        completeMission(3);
        renderMissionFooter();
        showToast("Evidence examined. Mission 5 unlocked.");
    }
}

/* =========================================================
   MISSION 5 — FINAL VERDICT
   ========================================================= */

const FINAL_ANSWERS = {
    classification: "phishing",
    compromise: "suspected",
    response: "contain"
};

function renderMissionFive() {
    selectedFinalAnswers = state.answers.finalVerdict || {};

    return `
        ${missionHeading(5, "What Really Happened?",
            "Deliver your final assessment using the evidence you collected.",
            "FINAL BRIEFING · MISSION 5")}

        ${panel("Evidence gathered", `
            <div class="card-grid three-columns">
                ${infoCard("Suspicious sender", "Lookalike domain impersonates the company.")}
                ${infoCard("Urgent request", "The email pressures the employee to verify credentials.")}
                ${infoCard("Link visited", "The link was visited at 09:14.")}
                ${infoCard("Credentials entered", "Submission occurred at 09:16.")}
                ${infoCard("Unfamiliar login", "Successful login at 09:24.")}
                ${infoCard("File access", "Finance folder listed; one file opened at 09:27.")}
            </div>
        `, "SIMULATED EVIDENCE")}

        <div class="panel mt-20">
            <h3>Final investigation decisions</h3>
            ${finalQuestion("classification", "01 · How should this incident be classified?", [
                ["phishing", "Credential-harvesting phishing"],
                ["malware", "Confirmed ransomware infection"],
                ["normal", "Normal IT maintenance"]
            ])}
            ${finalQuestion("compromise", "02 · Was the account likely compromised?", [
                ["suspected", "Yes — suspected account compromise is supported."],
                ["unproven", "No — there is no evidence of unusual access."],
                ["certain", "Yes — attacker identity and full activity are confirmed."]
            ])}
            ${finalQuestion("response", "03 · What should happen first?", [
                ["contain", "Contain the incident: secure the account and revoke sessions."],
                ["ignore", "Ignore the activity unless more employees report it."],
                ["delete", "Delete logs to remove suspicious traces."]
            ])}
            <div id="mission5Feedback" class="mt-20"></div>
            <button class="action-button mt-20" data-action="submit-verdict">SUBMIT FINAL VERDICT →</button>
        </div>

        <div id="finalReport">${state.finalReport ? renderVerdictReview() : ""}</div>
        ${hintButton(4)}
    `;
}

function finalQuestion(id, title, options) {
    return `
        <div class="divider"></div><h4>${title}</h4>
        <div class="mt-15" style="display:grid;gap:10px;">
            ${options.map(([value, text]) => `
                <button class="option-button ${selectedFinalAnswers[id] === value ? "selected" : ""}"
                        data-action="mission5-answer" data-question="${id}" data-answer="${value}">
                    ${text}
                </button>`).join("")}
        </div>`;
}

function answerMissionFive(question, answer) {
    if (!FINAL_ANSWERS[question]) return;

    selectedFinalAnswers[question] = answer;
    state.answers.finalVerdict = { ...selectedFinalAnswers };

    saveState();
    renderMission();

    showToast("Answer recorded.");
}

function submitFinalVerdict() {
    const required = Object.keys(FINAL_ANSWERS);
    const answers = state.answers.finalVerdict || {};

    const missing = required.filter(question => !answers[question]);

    if (missing.length) {
        $("#mission5Feedback").innerHTML = feedback(
            "Investigation incomplete",
            "Answer all three questions before submitting your verdict.",
            "warning"
        );
        return;
    }

    const correctCount = required.filter(question =>
        answers[question] === FINAL_ANSWERS[question]
    ).length;

    state.answers.finalScore = correctCount;

    // Each question contributes 25 points, once only.
    required.forEach(question => {
        awardPoints(`m5:${question}`,
            answers[question] === FINAL_ANSWERS[question] ? 25 : 0);
    });

    if (correctCount === 3) unlockAchievement("incidentCommander");

    state.finalReport = true;
    completeMission(4);
    saveState();

    $("#mission5Feedback").innerHTML = feedback(
        "Investigation completed!",
        `Your assessment scored ${correctCount} / 3. Review the evidence-based answers below.`,
        "success"
    );

    $("#finalReport").innerHTML = renderVerdictReview();
    renderMissionFooter();

    showToast("Operation Blackout completed.");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function renderVerdictReview() {
    const answers = state.answers.finalVerdict || {};
    const correct = FINAL_ANSWERS;

    const questions = [
        {
            id: "classification",
            title: "01 · Incident classification",
            options: {
                phishing: "Credential-harvesting phishing",
                malware: "Confirmed ransomware infection",
                normal: "Normal IT maintenance"
            },
            explanation: "The message impersonated IT support and attempted to collect credentials through a lookalike domain."
        },
        {
            id: "compromise",
            title: "02 · Account compromise",
            options: {
                suspected: "Suspected account compromise is supported.",
                unproven: "No evidence of unusual access.",
                certain: "Attacker identity and full activity confirmed."
            },
            explanation: "Credential submission was followed by an unfamiliar successful login and unusual finance-file access. The attacker identity and full activity remain unknown."
        },
        {
            id: "response",
            title: "03 · Immediate response",
            options: {
                contain: "Contain the incident and revoke active sessions.",
                ignore: "Ignore activity unless more employees report it.",
                delete: "Delete logs to remove suspicious traces."
            },
            explanation: "Containment comes first: secure the account, revoke sessions, preserve evidence and investigate affected systems."
        }
    ];

    return `
        <div class="panel mt-20">
            <div class="panel-heading"><h3>Investigation Results</h3><span class="status-badge badge-success">MISSION SOLVED</span></div>
            <p class="muted mt-10">Review your answers against the strongest evidence-based conclusions.</p>
            ${questions.map(question => {
                const selected = answers[question.id];
                const isCorrect = selected === correct[question.id];

                return `
                    <div class="info-card mt-15">
                        <h4>${question.title}</h4>
                        <p class="mt-10"><strong>Your answer:</strong> ${escapeHTML(question.options[selected] || "No answer")}</p>
                        <p class="mt-10"><strong>Correct answer:</strong> <span class="text-cyan">${question.options[correct[question.id]]}</span></p>
                        <p class="mt-10"><strong>Why?</strong> ${question.explanation}</p>
                        <span class="status-badge ${isCorrect ? "badge-success" : "badge-warning"} mt-10">${isCorrect ? "CORRECT" : "REVIEW THIS ANSWER"}</span>
                    </div>`;
            }).join("")}
            <div class="divider"></div>
            <h3>Case outcome</h3>
            <p class="mt-10">The evidence supports credential-harvesting phishing followed by suspected account compromise.</p>
            <p class="muted mt-10">The full extent of the incident and whether data was exfiltrated remain unconfirmed.</p>
        </div>`;
}

/* =========================================================
   FINAL INVESTIGATOR REPORT
   ========================================================= */

function renderFinalReport() {
    const score = currentPoints();
    const rank = getRank();

    return `
        <div class="panel mt-20" id="printableReport">
            <div class="panel-heading"><h2>Final Investigator Report</h2><span class="status-badge badge-success">CASE REVIEW</span></div>
            <div class="divider"></div>
            <div class="report-score">
                <span class="section-label">INVESTIGATION POINTS</span>
                <h1>${score} / 380 IP</h1>
                <h3 class="text-cyan">${rank.name}</h3>
                <p>${state.completedMissions.length} / 5 missions completed</p>
            </div>
            <div class="divider"></div>
            <h3>Achievements unlocked</h3>
            <div class="card-grid mt-20">
                ${state.achievements.map(id => infoCard(ACHIEVEMENTS[id].title, ACHIEVEMENTS[id].description, "UNLOCKED")).join("") || "<p>No achievements unlocked.</p>"}
            </div>
            <div class="divider"></div>
            <p class="section-label">CLASSIFICATION</p>
            <h3 class="text-cyan">Credential-harvesting phishing followed by suspected account compromise.</h3>
            <div class="divider"></div>
            <div class="two-column-layout">
                <div><h3>Confirmed evidence</h3><ul class="report-list">
                    <li>Suspicious credential request.</li><li>Lookalike destination domain.</li><li>Reported credential entry.</li><li>Unfamiliar successful login.</li><li>Finance folder access.</li>
                </ul></div>
                <div><h3>Unanswered questions</h3><ul class="report-list">
                    <li>Attacker identity.</li><li>Exact access scope.</li><li>Whether information was exfiltrated.</li><li>Whether other accounts were affected.</li>
                </ul></div>
            </div>
            <div class="divider"></div>
            <h3>Incident response recommendations</h3>
            <div class="card-grid mt-20">
                ${infoCard("01 · CONTAIN", "Secure the account and revoke active sessions.")}
                ${infoCard("02 · INVESTIGATE", "Preserve logs and examine affected systems.")}
                ${infoCard("03 · RECOVER", "Reset credentials and verify system integrity.")}
                ${infoCard("04 · IMPROVE", "Strengthen MFA and security awareness.")}
            </div>
            <div class="divider"></div>
            ${feedback("CASE FILE 001 · INVESTIGATION COMPLETE", `Your investigator score is ${score} / 380 IP. Rank: ${rank.name}. Findings are stored locally in this browser.`, "success")}
            <p class="email-disclaimer mt-20">ALL CASE DETAILS AND EVIDENCE ARE SIMULATED. THIS REPORT DOES NOT REPRESENT A REAL INCIDENT.</p>
        </div>`;
}

/* =========================================================
   EVIDENCE LOCKER
   ========================================================= */

const evidenceDatabase = {
    email: { title: "Email delivery record", description: "A suspicious external message reached the employee mailbox at 09:05." },
    browser: { title: "Browser activity record", description: "The employee visited the imitation login page at 09:14." },
    credentials: { title: "Credential submission record", description: "Credentials were submitted at 09:16." },
    authentication: { title: "Authentication log", description: "An unfamiliar successful login occurred at 09:24 from 203.0.113.47." },
    files: { title: "File access record", description: "A finance folder was listed and one file opened at 09:27." },
    metadata: { title: "Email metadata", description: "A separate Reply-To address, unknown relay and bulk-sender metadata were observed." },
    authenticationDetails: { title: "Email authentication results", description: "SPF and DKIM passed for the lookalike domain; DMARC was p=none." }
};

function openEvidenceLocker() {
    $("#evidenceModal")?.classList.remove("hidden");
    $("#evidenceModal")?.setAttribute("aria-hidden", "false");
    renderEvidenceLocker();
}

function closeEvidenceLocker() {
    $("#evidenceModal")?.classList.add("hidden");
    $("#evidenceModal")?.setAttribute("aria-hidden", "true");
}

function renderEvidenceLocker() {
    const list = $("#evidenceList");
    if (!list) return;

    if (!state.collectedEvidence.length) {
        list.innerHTML = `<div class="empty-evidence"><span>▤</span><strong>No evidence collected yet</strong><p>Complete investigation tasks to unlock records.</p></div>`;
        return;
    }

    list.innerHTML = state.collectedEvidence.map(id => {
        const item = evidenceDatabase[id];
        if (!item) return "";
        return `<div class="evidence-list-item"><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.description)}</p></div>`;
    }).join("");
}

/* =========================================================
   PRINT
   ========================================================= */

function printReport() {
    if (!state.finalReport) {
        showToast("Complete the final verdict before printing.");
        return;
    }

    const report = $("#finalReport");
    if (!report) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        showToast("Allow pop-ups to print your report.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html><html><head><title>Operation Blackout — Report</title>
        <style>
        body{font-family:Arial,sans-serif;color:#18113D;max-width:900px;margin:40px auto;padding:20px;line-height:1.7}
        h1,h2,h3{color:#6157FF}.panel{padding:20px;border:1px solid #ddd;border-radius:10px}
        .card-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .info-card{padding:15px;border:1px solid #ddd;border-radius:8px}
        .divider{margin:20px 0;border-top:1px solid #ddd}
        .feedback{padding:15px;background:#f0efff}
        </style></head><body>
        <h1>DIGITAL DETECTIVE</h1><p>OPERATION BLACKOUT · AURELIA GLOBAL</p>
        ${report.innerHTML}
        </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

/* =========================================================
   RESET
   ========================================================= */

function resetInvestigation() {
    if (!window.confirm("Reset Operation Blackout? All mission progress, points and evidence will be deleted from this browser.")) return;

    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(DEFAULT_STATE);
    currentMission = 0;
    resetTemporaryMissionState();

    updateProgress();
    showHome();
    showToast("Investigation progress reset.");
}

/* =========================================================
   EVENT HANDLING
   ========================================================= */

document.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    switch (target.dataset.action) {
        case "mission1-answer":
            answerMissionOne(target.dataset.answer);
            break;
        case "mission2-clue":
            selectMissionTwoClue(target.dataset.clue);
            break;
        case "mission3-answer":
            answerMissionThree(target.dataset.answer);
            break;
        case "mission3-request":
            answerMissionThreeRequest(target.dataset.request);
            break;
        case "inspect-log":
            inspectLog(target.dataset.log);
            break;
        case "timeline-select":
            selectTimelineEvent(target.dataset.event);
            break;
        case "mission5-answer":
            answerMissionFive(target.dataset.question, target.dataset.answer);
            break;
        case "submit-verdict":
            submitFinalVerdict();
            break;
        case "open-evidence":
            openEvidenceLocker();
            break;
        case "next-mission":
            goToMission(currentMission + 1);
            break;
        case "print-report":
            printReport();
            break;
        case "hint":
            useHint(Number(target.dataset.mission));
            break;
    }
});

/* =========================================================
   NAVIGATION LISTENERS
   ========================================================= */

$("#startCase")?.addEventListener("click", showWorkspace);
$("#backHome")?.addEventListener("click", showHome);

$("#brandHome")?.addEventListener("click", event => {
    event.preventDefault();
    showHome();
});

$("#resetProgress")?.addEventListener("click", resetInvestigation);
$("#closeEvidence")?.addEventListener("click", closeEvidenceLocker);
$("#closeEvidenceBackdrop")?.addEventListener("click", closeEvidenceLocker);
$("#evidenceLocker")?.addEventListener("click", openEvidenceLocker);

document.querySelectorAll(".mission-nav-item").forEach(button => {
    button.addEventListener("click", () => goToMission(Number(button.dataset.mission)));
});

/* =========================================================
   INITIALISE
   ========================================================= */

function initialiseApplication() {
    currentMission = state.currentMission;
    restoreTemporaryState();

    if (state.finalReport) {
        state.currentMission = 4;
        currentMission = 4;
        saveState();
    }

    updateProgress();
    showHome();
}

initialiseApplication();
