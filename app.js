
/* =========================================================
   DIGITAL DETECTIVE
   OPERATION BLACKOUT — CASE FILE 001
   AURELIA GLOBAL

   All evidence is fictional and simulated.
   Progress is stored locally in the participant's browser.
   ========================================================= */


/* =========================================================
   1. APPLICATION STATE
   ========================================================= */

const STORAGE_KEY = "digitalDetectiveOperationBlackout";

const defaultState = {
    currentMission: 0,
    completedMissions: [],
    unlockedMissions: [0],
    collectedEvidence: [],
    answers: {},
    finalReport: false
};

let state = loadState();

let currentMission = 0;

let selectedHotspots = [];
let selectedLogs = [];
let timelineAnswers = [];
let selectedFinalAnswers = {};

let toastTimeout;


/* =========================================================
   2. EVIDENCE DATABASE
   ========================================================= */

const evidenceDatabase = {

    email: {
        title: "Email delivery record",
        description:
            "A suspicious external message reached the employee's mailbox at 09:05. The evidence record lists its subject as Urgent: payroll update."
    },

    browser: {
        title: "Browser activity record",
        description:
            "Browser activity indicates that the employee opened the suspicious link at 09:14. The page imitated the company's login interface."
    },

    credentials: {
        title: "Credential submission record",
        description:
            "At 09:16, credentials were submitted through the external page. No second-factor challenge was recorded in this simulated evidence."
    },

    authentication: {
        title: "Authentication log",
        description:
            "At 09:24, a successful login was recorded from unfamiliar IP 203.0.113.47 using a new device outside the employee's usual hours."
    },

    files: {
        title: "File access record",
        description:
            "At 09:27, the new session listed a shared finance folder and opened one file. The exact extent of access remains to be verified."
    },

    metadata: {
        title: "Email metadata",
        description:
            "The message includes a separate Reply-To address, an unknown relay, a lookalike sender domain and bulk-sender metadata."
    },

    authenticationDetails: {
        title: "Email authentication results",
        description:
            "SPF passed for the sending domain, DKIM passed for that domain, and DMARC was set to p=none. These results do not establish that the message was trustworthy."
    }

};


/* =========================================================
   3. SAVE AND LOAD PROGRESS
   ========================================================= */

function loadState() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return structuredClone(defaultState);
        }

        const parsed = JSON.parse(saved);

        return {
            ...structuredClone(defaultState),
            ...parsed
        };

    } catch (error) {

        console.warn("Could not load saved progress.", error);

        return structuredClone(defaultState);

    }

}


function saveState() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        console.warn("Could not save progress.", error);

    }

}


/* =========================================================
   4. GENERAL UTILITIES
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}


function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => {

        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return replacements[character];

    });

}


function showToast(message) {

    const toast = $("#toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {

        toast.classList.remove("show");

    }, 2800);

}


function markEvidenceCollected(id) {

    if (!state.collectedEvidence.includes(id)) {

        state.collectedEvidence.push(id);

        saveState();
        updateProgress();

        showToast("Evidence added to your investigation locker.");

    }

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

}


function goToMission(index) {

    if (!state.unlockedMissions.includes(index)) {

        showToast("Complete the previous mission to unlock this file.");

        return;

    }

    currentMission = index;
    state.currentMission = index;

    resetTemporaryMissionState();

    saveState();

    renderMission();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function resetTemporaryMissionState() {

    selectedHotspots = [];
    selectedLogs = [];
    timelineAnswers = [];
    selectedFinalAnswers = {};

}


/* =========================================================
   5. LANDING PAGE AND NAVIGATION
   ========================================================= */

function showHome() {

    $("#homeView").classList.remove("hidden");
    $("#workspaceView").classList.add("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function showWorkspace() {

    $("#homeView").classList.add("hidden");
    $("#workspaceView").classList.remove("hidden");

    currentMission = state.currentMission;

    renderMission();
    updateProgress();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   6. PROGRESS AND SIDEBAR
   ========================================================= */

function updateProgress() {

    const completed = state.completedMissions.length;

    $("#progressCount").textContent = `${completed} / 5`;

    $("#progressFill").style.width = `${completed * 20}%`;

    $("#evidenceCount").textContent =
        state.collectedEvidence.length;

    document.querySelectorAll(".mission-nav-item").forEach(button => {

        const index = Number(button.dataset.mission);

        const unlocked = state.unlockedMissions.includes(index);
        const completedMission = isMissionComplete(index);

        button.disabled = !unlocked;

        button.classList.toggle("locked", !unlocked);
        button.classList.toggle("active", currentMission === index);
        button.classList.toggle("completed", completedMission);

        const status = button.querySelector(".mission-state");

        if (completedMission) {

            status.textContent = "✓";

        } else if (unlocked) {

            status.textContent = currentMission === index ? "●" : "○";

        } else {

            status.textContent = "⌑";

        }

    });

}


/* =========================================================
   7. SHARED HTML COMPONENTS
   ========================================================= */

function sectionLabel(text) {

    return `
        <div class="section-label">${text}</div>
    `;

}


function panel(title, content, tag = "") {

    return `
        <section class="panel">

            <div class="panel-heading">

                <h3>${title}</h3>

                ${tag ? `<span class="panel-tag">${tag}</span>` : ""}

            </div>

            ${content}

        </section>
    `;

}


function infoCard(title, description, badge = "") {

    return `
        <article class="info-card">

            ${badge
                ? `<span class="status-badge badge-info">${badge}</span>`
                : ""
            }

            <h3 class="mt-10">${title}</h3>

            <p class="mt-10">${description}</p>

        </article>
    `;

}


function missionHeading(number, title, description, label) {

    return `
        ${sectionLabel(label)}

        <h1>${title}</h1>

        <p class="mb-15">${description}</p>

        <span class="status-badge badge-purple">
            MISSION ${String(number).padStart(2, "0")} / 05
        </span>
    `;

}


function actionButton(text, action, disabled = false) {

    return `
        <button
            class="action-button"
            data-action="${action}"
            ${disabled ? "disabled" : ""}
        >
            ${text}
        </button>
    `;

}


function feedback(title, description, type = "success") {

    return `
        <div class="feedback ${type}">
            <strong>${title}</strong>
            <p>${description}</p>
        </div>
    `;

}


/* =========================================================
   8. RENDERING SYSTEM
   ========================================================= */

function renderMission() {

    const renderers = [
        renderMissionOne,
        renderMissionTwo,
        renderMissionThree,
        renderMissionFour,
        renderMissionFive
    ];

    const missionNames = [
        "Would You Trust This Email?",
        "Identify the Red Flags",
        "Investigate the Email",
        "Examine the Evidence",
        "What Really Happened?"
    ];

    const missionContent = $("#missionContent");

    $("#missionCrumb").textContent =
        `CASE FILE 001 / MISSION ${String(currentMission + 1).padStart(2, "0")}`;

    missionContent.innerHTML = renderers[currentMission]();

    renderMissionFooter();

    updateProgress();

}


function renderMissionFooter() {

    const footer = $("#missionFooter");

    const complete = isMissionComplete(currentMission);

    if (currentMission === 4) {

        footer.innerHTML = `
            <span class="footer-note">
                CASE FILE 001 · FINAL INVESTIGATION
            </span>

            <div class="footer-actions">

                <button
                    class="secondary-button"
                    data-action="open-evidence"
                >
                    VIEW EVIDENCE
                </button>

                <button
                    class="action-button"
                    data-action="print-report"
                >
                    PRINT FINAL REPORT
                </button>

            </div>
        `;

        return;

    }

    footer.innerHTML = `
        <span class="footer-note">
            ${complete
                ? "MISSION COMPLETED · YOU MAY REVIEW THIS FILE"
                : "COMPLETE THE INVESTIGATION TASK TO CONTINUE"
            }
        </span>

        <div class="footer-actions">

            <button
                class="secondary-button"
                data-action="open-evidence"
            >
                EVIDENCE LOCKER
            </button>

            ${complete
                ? `<button class="action-button" data-action="next-mission">
                    NEXT MISSION →
                   </button>`
                : ""
            }

        </div>
    `;

}


/* =========================================================
   9. MISSION 1
   WOULD YOU TRUST THIS EMAIL?
   ========================================================= */

function renderMissionOne() {

    const alreadyCompleted = isMissionComplete(0);

    return `

        ${missionHeading(
            1,
            "Would You Trust This Email?",
            "An urgent corporate alert has reached an Aurelia Global employee. Before examining its technical details, make your initial assessment.",
            "FIELD BRIEFING · INITIAL ASSESSMENT"
        )}


        <div class="two-column-layout mt-20">

            <div>

                ${sectionLabel("EVIDENCE ACQUISITION · SIMULATED INBOX CAPTURE")}

                <div class="email-window">

                    <div class="email-top">
                        <strong>✉ Corporate Mailbox</strong>
                        <span class="status-badge badge-warning">URGENT</span>
                    </div>

                    <div class="email-details">

                        <div class="email-detail">
                            <span>From:</span>
                            <span>IT Support Helpdesk &lt;ITsupport@aureliaglobal-support.com&gt;</span>
                        </div>

                        <div class="email-detail">
                            <span>To:</span>
                            <span>employee@aureliaglobal.coY</span>
                        </div>

                        <div class="email-detail">
                            <span>Subject:</span>
                            <span>Immediate Action Required — Account Verification</span>
                        </div>

                        <div class="email-detail">
                            <span>Security:</span>
                            <span>TLS 1.3 encrypted · Hop count: 4 · Priority: High</span>
                        </div>

                    </div>

                    <div class="email-body">

                        <p>
                            Aurelia Global Single Sign-On (SSO) maintenance
                            has detected unverified multi-factor credentials
                            for your workstation.
                        </p>

                        <p>
                            To maintain operational continuity, you must
                            verify your profile within two hours.
                        </p>

                        <div class="email-warning">
                            <strong>
                                Failure to verify will result in immediate
                                suspension of enterprise access and
                                operational portal lockout.
                            </strong>
                        </div>

                        <div class="email-verify">
                            Verify Account Credentials Now
                        </div>

                        <p class="email-disclaimer">
                            SIMULATED EMAIL · DO NOT OPEN EXTERNAL LINKS
                        </p>

                    </div>

                </div>

            </div>


            <div>

                ${panel(
                    "Field briefing",
                    `
                        <p>
                            Consider the human and technical cues in this
                            urgent corporate alert.
                        </p>

                        <div class="divider"></div>

                        <h4 class="text-cyan">01 · Would you trust this email?</h4>
                        <p class="mt-10">
                            Compare the sender with normal IT practice.
                        </p>

                        <div class="divider"></div>

                        <h4 class="text-cyan">02 · What would make you suspicious?</h4>
                        <p class="mt-10">
                            Consider tone, timing, domain and pressure.
                        </p>

                        <div class="divider"></div>

                        <h4 class="text-cyan">03 · What would you investigate first?</h4>
                        <p class="mt-10">
                            Consider MX records, URL resolution or mailbox logs.
                        </p>
                    `,
                    "INITIAL ASSESSMENT"
                )}

                <div class="panel mt-20">

                    <h3>Your initial judgement</h3>

                    <p class="mt-10">
                        Choose the action you would take before examining
                        the technical evidence.
                    </p>

                    <div class="mt-20" style="display:grid;gap:10px;">

                        <button class="option-button"
                            data-action="mission1-answer"
                            data-answer="trust">
                            <span>01</span>
                            Trust the email and verify immediately
                        </button>

                        <button class="option-button"
                            data-action="mission1-answer"
                            data-answer="suspicious">
                            <span>02</span>
                            Treat it as suspicious and report it
                        </button>

                        <button class="option-button"
                            data-action="mission1-answer"
                            data-answer="investigate">
                            <span>03</span>
                            Pause and investigate before deciding
                        </button>

                    </div>

                    <div id="mission1Feedback"></div>

                </div>

            </div>

        </div>


        ${alreadyCompleted
            ? feedback(
                "Mission completed",
                "Your initial assessment has been recorded. You can revisit this mission at any time."
            )
            : ""
        }

    `;

}


function answerMissionOne(answer) {

    const explanations = {

        trust: {
            title: "That decision carries risk.",
            message:
                "Do not enter credentials through an unexpected email link. An apparent IT request is not proof of legitimacy.",
            type: "warning"
        },

        suspicious: {
            title: "Good security instinct.",
            message:
                "The sender domain and urgent credential request are suspicious. Reporting is a safer initial response.",
            type: "success"
        },

        investigate: {
            title: "A cautious investigative approach.",
            message:
                "Preserve the message and verify it through official IT channels before taking action.",
            type: "success"
        }

    };

    const result = explanations[answer];

    if (!result) return;

    state.answers.mission1 = answer;

    markEvidenceCollected("email");

    completeMission(0);

    $("#mission1Feedback").innerHTML =
        feedback(result.title, result.message, result.type);

    renderMissionFooter();

    showToast("Mission 1 completed. Mission 2 unlocked.");

}


/* =========================================================
   10. MISSION 2
   IDENTIFY THE RED FLAGS
   ========================================================= */

function renderMissionTwo() {

    const clues = [
        {
            id: "sender",
            title: "01 · Sender domain",
            description:
                "The sender uses aureliaglobal-support.com, while the legitimate corporate domain is aureliaglobal.com.",
            answer: "The sender domain does not match the legitimate corporate domain."
        },

        {
            id: "urgency",
            title: "02 · Urgency and threat",
            description:
                "The email imposes a two-hour deadline and threatens immediate enterprise access suspension.",
            answer: "Pressure and threats encourage rushed decisions."
        },

        {
            id: "credentials",
            title: "03 · Credential request",
            description:
                "The message asks the employee to verify credentials through an email button.",
            answer: "Unexpected credential requests through email links are suspicious."
        },

        {
            id: "destination",
            title: "04 · Destination host",
            description:
                "The verification destination uses the lookalike domain rather than the legitimate company domain.",
            answer: "The destination host is not the official company domain."
        }

    ];

    const completed = isMissionComplete(1);

    return `

        ${missionHeading(
            2,
            "Identify the Red Flags",
            "Inspect the simulated message. Select all four suspicious indicators to complete your investigation.",
            "FORENSIC TELEMETRY · MISSION 2"
        )}


        <div class="panel mt-20">

            <div class="panel-heading">
                <h3>Simulated email evidence</h3>
                <span class="status-badge badge-warning">SUSPICIOUS MESSAGE</span>
            </div>

            <div class="email-window">

                <div class="email-details">

                    <div class="email-detail">
                        <span>From:</span>
                        <span>ITsupport@aureliaglobal-support.com</span>
                    </div>

                    <div class="email-detail">
                        <span>To:</span>
                        <span>employee@aureliaglobal.coY</span>
                    </div>

                    <div class="email-detail">
                        <span>Subject:</span>
                        <span>Immediate Action Required — Account Verification</span>
                    </div>

                </div>

                <div class="email-body">

                    <p>
                        Aurelia Global SSO maintenance has detected
                        unverified multi-factor credentials.
                    </p>

                    <p>
                        Verify your profile within
                        <button class="hotspot ${selectedHotspots.includes("urgency") ? "found" : ""}"
                            data-action="mission2-clue"
                            data-clue="urgency">
                            TWO HOURS
                        </button>
                        to avoid immediate account suspension.
                    </p>

                    <p>
                        Verify your
                        <button class="hotspot ${selectedHotspots.includes("credentials") ? "found" : ""}"
                            data-action="mission2-clue"
                            data-clue="credentials">
                            ACCOUNT CREDENTIALS
                        </button>
                        using the button below.
                    </p>

                    <div class="email-verify">
                        Verify Account Credentials Now
                    </div>

                    <p class="email-disclaimer">
                        SIMULATED MESSAGE · LINK IS NOT ACTIVE
                    </p>

                </div>

            </div>

        </div>


        <div class="panel mt-20">

            <div class="panel-heading">
                <h3>Find the four red flags</h3>

                <span class="panel-tag">
                    ${selectedHotspots.length} / 4 IDENTIFIED
                </span>
            </div>

            <p>
                Select each indicator below. You can inspect the sender,
                urgency, credential request and destination.
            </p>

            <div class="card-grid mt-20">

                ${clues.map(clue => `

                    <button
                        class="option-button ${selectedHotspots.includes(clue.id) ? "selected" : ""}"
                        data-action="mission2-clue"
                        data-clue="${clue.id}"
                    >

                        <span>
                            ${selectedHotspots.includes(clue.id) ? "✓" : "＋"}
                        </span>

                        <span>${clue.title}</span>

                    </button>

                `).join("")}

            </div>

            <div id="mission2Feedback" class="mt-20">

                ${selectedHotspots.length
                    ? `<p class="text-cyan">${selectedHotspots.length} of 4 indicators identified.</p>`
                    : ""
                }

            </div>

        </div>


        ${completed
            ? feedback(
                "Mission completed",
                "All four red flags have been identified. The message should be treated as suspicious."
            )
            : ""
        }

    `;

}


function selectMissionTwoClue(id) {

    const validClues = [
        "sender",
        "urgency",
        "credentials",
        "destination"
    ];

    if (!validClues.includes(id)) return;

    if (!selectedHotspots.includes(id)) {

        selectedHotspots.push(id);

        showToast("Red flag identified.");

    }

    if (id === "sender") markEvidenceCollected("metadata");
    if (id === "destination") markEvidenceCollected("metadata");

    if (selectedHotspots.length === 4) {

        completeMission(1);

        showToast("All four red flags identified. Mission 3 unlocked.");

    }

    renderMission();

}


/* =========================================================
   11. MISSION 3
   INVESTIGATE THE EMAIL
   ========================================================= */

function renderMissionThree() {

    const completed = isMissionComplete(2);

    return `

        ${missionHeading(
            3,
            "Investigate the Email",
            "The sender domain looks suspicious, but the authentication results introduce a more interesting question. Work through the technical evidence before reaching your conclusion.",
            "FORENSIC TELEMETRY · MISSION 3"
        )}


        <div class="card-grid three-columns mt-20">

            ${infoCard(
                "Sender",
                "ITsupport@aureliaglobal-support.com",
                "SIMULATED EVIDENCE"
            )}

            ${infoCard(
                "Legitimate domain",
                "aureliaglobal.com",
                "CORPORATE DOMAIN"
            )}

            ${infoCard(
                "Destination",
                "https://aureliaglobal-support.com/verify-account",
                "DO NOT OPEN"
            )}

        </div>


        ${panel(
            "Email authentication results",
            `
                <p class="mb-15">
                    Inspect each authentication mechanism. A passing result
                    does not establish that an email is safe.
                </p>

                <div class="card-grid three-columns">

                    <div class="info-card">
                        <span class="status-badge badge-success">PASS</span>
                        <h3 class="mt-10">SPF</h3>
                        <p class="mt-10">
                            The sending IP is authorised by the
                            lookalike domain's SPF policy.
                        </p>
                        <small class="mono text-cyan">RFC 7208</small>
                    </div>

                    <div class="info-card">
                        <span class="status-badge badge-success">PASS</span>
                        <h3 class="mt-10">DKIM</h3>
                        <p class="mt-10">
                            A valid signature is associated with
                            d=aureliaglobal-support.com.
                        </p>
                        <small class="mono text-cyan">RFC 6376</small>
                    </div>

                    <div class="info-card">
                        <span class="status-badge badge-warning">p=none</span>
                        <h3 class="mt-10">DMARC</h3>
                        <p class="mt-10">
                            Monitoring policy. No quarantine or
                            reject enforcement is specified.
                        </p>
                        <small class="mono text-cyan">RFC 7489</small>
                    </div>

                </div>

                <div class="feedback warning mt-20">
                    <strong>Investigator's caution</strong>
                    <p>
                        A newly registered lookalike domain can pass
                        SPF and DKIM for its own domain. Authentication
                        establishes identity provenance, not intent.
                    </p>
                </div>
            `,
            "PROTOCOL-LEVEL VERIFICATION"
        )}


        ${panel(
            "Email metadata",
            `
                <div class="table-wrapper">
                    <table class="data-table">

                        <thead>
                            <tr>
                                <th>FIELD</th>
                                <th>OBSERVED VALUE</th>
                            </tr>
                        </thead>

                        <tbody>

                            <tr>
                                <td>Reply-To</td>
                                <td>collect.aurelia@mail-relay.net</td>
                            </tr>

                            <tr>
                                <td>Received</td>
                                <td>Unknown relay 203.0.113.45</td>
                            </tr>

                            <tr>
                                <td>Date</td>
                                <td>08 Nov 2026, 07:42 UTC</td>
                            </tr>

                            <tr>
                                <td>X-Mailer</td>
                                <td>bulk-sender v2</td>
                            </tr>

                        </tbody>

                    </table>
                </div>

                <p class="mt-15">
                    The Reply-To address differs from the sender domain.
                    The relay and bulk-sender metadata deserve further
                    investigation.
                </p>
            `,
            "SIMULATED METADATA"
        )}


        <div class="panel mt-20">

            <h3>Investigator's challenge</h3>

            <p class="mt-10">
                Which conclusion best explains the evidence?
            </p>

            <div class="mt-20" style="display:grid;gap:10px;">

                <button class="option-button"
                    data-action="mission3-answer"
                    data-answer="safe">
                    A. SPF and DKIM passed, so the email is safe.
                </button>

                <button class="option-button"
                    data-action="mission3-answer"
                    data-answer="suspicious">
                    B. The email is suspicious despite passing SPF and DKIM.
                </button>

                <button class="option-button"
                    data-action="mission3-answer"
                    data-answer="proof">
                    C. The metadata proves the identity of the attacker.
                </button>

            </div>

            <div id="mission3Feedback" class="mt-20"></div>

        </div>


        <div class="panel mt-20">

            <h3>What would you request next?</h3>

            <p class="mt-10">
                Select the most useful additional investigation material.
            </p>

            <div class="mt-20" style="display:grid;gap:10px;">

                <button class="option-button"
                    data-action="mission3-request"
                    data-request="headers">
                    Full email headers and gateway logs
                </button>

                <button class="option-button"
                    data-action="mission3-request"
                    data-request="domain">
                    The legitimate domain's DMARC record
                </button>

                <button class="option-button"
                    data-action="mission3-request"
                    data-request="registration">
                    The lookalike URL's registration date and history
                </button>

            </div>

            <div id="mission3RequestFeedback" class="mt-20"></div>

        </div>


        ${completed
            ? feedback(
                "Mission completed",
                "You identified why passing authentication does not make the message trustworthy."
            )
            : ""
        }

    `;

}


function answerMissionThree(answer) {

    const feedbackArea = $("#mission3Feedback");

    if (answer === "suspicious") {

        state.answers.mission3 = answer;

        markEvidenceCollected("authenticationDetails");
        markEvidenceCollected("metadata");

        feedbackArea.innerHTML = feedback(
            "Correct assessment.",
            "SPF and DKIM passed for the lookalike sender domain. DMARC is set to p=none. These results do not prove that the sender is the legitimate company.",
            "success"
        );

        checkMissionThreeCompletion();

    } else if (answer === "safe") {

        feedbackArea.innerHTML = feedback(
            "Not quite.",
            "Authentication can pass for an attacker's own domain. Always compare the authenticated domain with the legitimate organisation and examine message intent.",
            "warning"
        );

    } else if (answer === "proof") {

        feedbackArea.innerHTML = feedback(
            "Not quite.",
            "The metadata provides investigative clues, but it does not establish the identity of the attacker.",
            "warning"
        );

    }

}


function answerMissionThreeRequest(request) {

    const explanations = {

        headers:
            "Full headers and gateway logs can help reconstruct the message's transmission path and authentication context.",

        domain:
            "The legitimate domain's DMARC record helps investigators understand the organisation's published email-authentication policy.",

        registration:
            "Domain registration history can help establish whether the lookalike domain was newly registered or changed recently."

    };

    if (!explanations[request]) return;

    state.answers.mission3Request = request;

    markEvidenceCollected("metadata");

    $("#mission3RequestFeedback").innerHTML =
        feedback("Useful investigation request", explanations[request]);

    checkMissionThreeCompletion();

}


function checkMissionThreeCompletion() {

    if (
        state.answers.mission3 === "suspicious" &&
        state.answers.mission3Request
    ) {

        completeMission(2);

        renderMissionFooter();

        showToast("Email investigation complete. Mission 4 unlocked.");

    }

}


/* =========================================================
   12. MISSION 4
   EXAMINE THE EVIDENCE
   ========================================================= */

const logDatabase = {

    email: {
        file: "email_delivery.log",
        time: "09:05",
        title: "Email delivery record",
        lines: [
            "[09:05:00] External message accepted by mail gateway.",
            "[09:05:01] Subject: Urgent: payroll update.",
            "[09:05:02] Sender classified as external.",
            "[09:05:03] Message delivered to employee mailbox.",
            "[SIMULATED] Message record preserved."
        ],
        evidence: "email"
    },

    browser: {
        file: "browser_activity.log",
        time: "09:14",
        title: "Browser access record",
        lines: [
            "[09:14:00] Employee opened external verification URL.",
            "[09:14:03] Page imitates Aurelia Global login.",
            "[09:14:05] External page loaded.",
            "[SIMULATED] Browser activity preserved."
        ],
        evidence: "browser"
    },

    credentials: {
        file: "credential_activity.log",
        time: "09:16",
        title: "Credential submission record",
        lines: [
            "[09:16:00] Credentials submitted to external page.",
            "[09:16:02] No second-factor challenge recorded.",
            "[SIMULATED] Submission record preserved."
        ],
        evidence: "credentials"
    },

    authentication: {
        file: "authentication.log",
        time: "09:24",
        title: "Unfamiliar login",
        lines: [
            "[09:24:00] Successful authentication recorded.",
            "[09:24:01] Source IP: 203.0.113.47.",
            "[09:24:02] Device: unfamiliar device.",
            "[09:24:03] Time: outside usual hours.",
            "[SIMULATED] Authentication record preserved."
        ],
        evidence: "authentication"
    },

    files: {
        file: "file_access.log",
        time: "09:27",
        title: "File access record",
        lines: [
            "[09:27:00] Shared finance folder listed.",
            "[09:27:03] One file opened from the new session.",
            "[09:27:05] Exact access scope not established.",
            "[SIMULATED] File access record preserved."
        ],
        evidence: "files"
    }

};


function renderMissionFour() {

    const completed = isMissionComplete(3);

    const logs = Object.entries(logDatabase);

    return `

        ${missionHeading(
            4,
            "Examine the Evidence",
            "The security team has collected several records. Inspect each one, collect the evidence and reconstruct the incident timeline.",
            "DIGITAL FORENSICS · MISSION 4"
        )}


        ${panel(
            "Digital forensics briefing",
            `
                <p>
                    Investigators correlate different sources to
                    reconstruct what happened, when it happened and
                    how far the incident may have reached.
                </p>

                <div class="card-grid three-columns mt-20">

                    ${infoCard(
                        "Logs",
                        "Time-stamped records of system events."
                    )}

                    ${infoCard(
                        "Metadata",
                        "Data about a message or file, such as headers."
                    )}

                    ${infoCard(
                        "IP addresses",
                        "Network origins and relays."
                    )}

                    ${infoCard(
                        "Indicators of compromise",
                        "Traces that signal a possible intrusion."
                    )}

                    ${infoCard(
                        "Evidence preservation",
                        "Copying data without altering it."
                    )}

                    ${infoCard(
                        "Chain of custody",
                        "A record of who held the evidence, and when."
                    )}

                </div>
            `,
            "FORENSIC BRIEFING"
        )}


        <div class="panel mt-20">

            <div class="panel-heading">
                <h3>Evidence acquisition</h3>
                <span class="panel-tag">${selectedLogs.length} / 5 INSPECTED</span>
            </div>

            <p>
                Open each record to inspect its contents. Collect all
                five records before reconstructing the timeline.
            </p>

            <div class="card-grid mt-20">

                ${logs.map(([id, log]) => `

                    <button
                        class="option-button ${selectedLogs.includes(id) ? "selected" : ""}"
                        data-action="inspect-log"
                        data-log="${id}"
                    >

                        <span>
                            ${selectedLogs.includes(id) ? "✓" : "▤"}
                        </span>

                        <span>
                            <strong>${log.file}</strong>
                            <small class="mono muted">${log.time} · SIMULATED</small>
                        </span>

                    </button>

                `).join("")}

            </div>

            <div id="logViewer" class="mt-20">

                <div class="empty-evidence">
                    <span>▤</span>
                    <strong>Select an evidence record</strong>
                    <p>Its simulated contents will appear here.</p>
                </div>

            </div>

        </div>


        <div class="panel mt-20">

            <div class="panel-heading">
                <h3>Reconstruct the incident timeline</h3>
                <span class="panel-tag">${timelineAnswers.length} / 7 EVENTS</span>
            </div>

            <p>
                Arrange the events in chronological order. Select the
                next event in the sequence, beginning at 09:05.
            </p>

            <div id="timelineProgress" class="mt-20">

                ${renderTimelineProgress()}

            </div>

            <div class="divider"></div>

            <div class="card-grid mt-20">

                ${getTimelineOptions()}

            </div>

            <div id="timelineFeedback" class="mt-20"></div>

        </div>


        ${panel(
            "Investigator's discussion",
            `
                <h4 class="text-cyan">Which evidence is most important?</h4>
                <p class="mt-10">
                    Correlate the reported credential submission with
                    the subsequent unfamiliar successful login.
                </p>

                <div class="divider"></div>

                <h4 class="text-cyan">What does each record tell us?</h4>
                <p class="mt-10">
                    Each record establishes a different part of the
                    sequence. No single event tells the entire story.
                </p>

                <div class="divider"></div>

                <h4 class="text-cyan">What can we not conclude yet?</h4>
                <p class="mt-10">
                    We cannot establish the attacker's identity or
                    determine the full scope of file access from
                    the available records alone.
                </p>
            `,
            "DISCUSS"
        )}


        ${completed
            ? feedback(
                "Mission completed",
                "You inspected the evidence records and reconstructed the incident sequence."
            )
            : ""
        }

    `;

}


const timelineEvents = [

    {
        id: "email",
        time: "09:05",
        title: "Suspicious email received"
    },

    {
        id: "opened",
        time: "09:12",
        title: "Employee opens the email"
    },

    {
        id: "link",
        time: "09:14",
        title: "Suspicious link visited"
    },

    {
        id: "credentials",
        time: "09:16",
        title: "Login credentials entered"
    },

    {
        id: "login",
        time: "09:24",
        title: "Unfamiliar successful login"
    },

    {
        id: "files",
        time: "09:27",
        title: "Unusual access to confidential files"
    },

    {
        id: "contact",
        time: "09:30",
        title: "Employee contacts IT support"
    }

];


function renderTimelineProgress() {

    if (!timelineAnswers.length) {

        return `
            <p class="muted">
                No events arranged yet. Start with 09:05.
            </p>
        `;

    }

    return `
        <div class="timeline">

            ${timelineAnswers.map(id => {

                const event = timelineEvents.find(item => item.id === id);

                return `
                    <div class="timeline-item">

                        <span class="timeline-time">${event.time}</span>

                        <h4>${event.title}</h4>

                    </div>
                `;

            }).join("")}

        </div>
    `;

}


function getTimelineOptions() {

    const remaining = timelineEvents.filter(
        event => !timelineAnswers.includes(event.id)
    );

    return remaining.map(event => `

        <button
            class="option-button"
            data-action="timeline-select"
            data-event="${event.id}"
        >

            <span class="mono text-cyan">${event.time}</span>

            <span>${event.title}</span>

        </button>

    `).join("");

}


function inspectLog(id) {

    const log = logDatabase[id];

    if (!log) return;

    if (!selectedLogs.includes(id)) {

        selectedLogs.push(id);

    }

    markEvidenceCollected(log.evidence);

    if (id === "authentication") {
        markEvidenceCollected("authentication");
    }

    if (id === "files") {
        markEvidenceCollected("files");
    }

    $("#logViewer").innerHTML = `

        <div class="log-window">

            <div class="log-header">
                <strong>${log.file}</strong>
                <span class="status-badge badge-info">SIMULATED RECORD</span>
            </div>

            <div class="log-content">
                ${log.lines.map(line => {

                    const safeLine = escapeHTML(line);

                    return `<span class="log-line">${safeLine}</span>`;

                }).join("")}
            </div>

        </div>

        <div class="feedback success">
            <strong>${log.title}</strong>
            <p>${evidenceDatabase[log.evidence].description}</p>
        </div>

    `;

    updateMissionFourProgress();

}


function selectTimelineEvent(id) {

    const expected = timelineEvents[timelineAnswers.length];

    if (!expected) return;

    if (id !== expected.id) {

        $("#timelineFeedback").innerHTML = feedback(
            "Check the sequence again.",
            `The next event should be at ${expected.time}. Think about what happened first.`,
            "warning"
        );

        return;

    }

    timelineAnswers.push(id);

    $("#timelineFeedback").innerHTML = feedback(
        "Correct chronological placement.",
        `${expected.time} — ${expected.title}`,
        "success"
    );

    renderTimelineSection();

    updateMissionFourProgress();

}


function renderTimelineSection() {

    $("#timelineProgress").innerHTML =
        renderTimelineProgress();

    const completed = timelineAnswers.length === 7;

    const remaining = getTimelineOptions();

    const options = document.querySelector(".timeline-options");

    const panelElement = $("#timelineProgress")
        .closest(".panel");

    if (!panelElement) return;

    const optionContainer = panelElement.querySelector(".card-grid");

    if (optionContainer) {

        optionContainer.innerHTML = remaining || (
            `<p class="text-success">All seven events are in chronological order.</p>`
        );

    }

    const tag = panelElement.querySelector(".panel-tag");

    if (tag) {
        tag.textContent = `${timelineAnswers.length} / 7 EVENTS`;
    }

    if (completed) {

        $("#timelineFeedback").innerHTML = feedback(
            "Timeline reconstructed.",
            "You have connected all seven events from the initial email to the employee contacting IT support.",
            "success"
        );

    }

}


function updateMissionFourProgress() {

    if (
        selectedLogs.length === 5 &&
        timelineAnswers.length === 7
    ) {

        completeMission(3);

        renderMissionFooter();

        showToast("Evidence examined. Mission 5 unlocked.");

    }

}


/* =========================================================
   13. MISSION 5
   WHAT REALLY HAPPENED?
   ========================================================= */

function renderMissionFive() {

    const completed = isMissionComplete(4);

    return `

        ${missionHeading(
            5,
            "What Really Happened?",
            "You have examined the email, analysed authentication results and reconstructed the sequence of events. Now deliver your final assessment.",
            "FINAL BRIEFING · MISSION 5"
        )}


        ${panel(
            "Evidence gathered",
            `
                <div class="card-grid three-columns">

                    ${infoCard(
                        "Suspicious sender",
                        "A lookalike domain impersonates the company."
                    )}

                    ${infoCard(
                        "Urgent request",
                        "The email pressures the employee to verify credentials."
                    )}

                    ${infoCard(
                        "Link visited",
                        "The suspicious link was visited at 09:14."
                    )}

                    ${infoCard(
                        "Credentials entered",
                        "Credential submission occurred at 09:16."
                    )}

                    ${infoCard(
                        "Unfamiliar login",
                        "A successful login was recorded at 09:24."
                    )}

                    ${infoCard(
                        "File access",
                        "A finance folder was listed and one file opened at 09:27."
                    )}

                </div>
            `,
            "SIMULATED EVIDENCE"
        )}


        <div class="panel mt-20">

            <h3>Final investigation decisions</h3>

            <p class="mt-10">
                Select the most defensible conclusion for each question.
            </p>


            <div class="divider"></div>

            <h4>01 · How should this incident be classified?</h4>

            <div class="mt-15" style="display:grid;gap:10px;">

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="classification"
                    data-answer="phishing">
                    Credential-harvesting phishing
                </button>

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="classification"
                    data-answer="malware">
                    Confirmed ransomware infection
                </button>

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="classification"
                    data-answer="normal">
                    Normal IT maintenance
                </button>

            </div>


            <div class="divider"></div>

            <h4>02 · Was the account likely compromised?</h4>

            <div class="mt-15" style="display:grid;gap:10px;">

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="compromise"
                    data-answer="suspected">
                    Yes — suspected account compromise is supported by the evidence.
                </button>

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="compromise"
                    data-answer="unproven">
                    No — there is no evidence of unusual access.
                </button>

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="compromise"
                    data-answer="certain">
                    Yes — the attacker's identity and full activity are confirmed.
                </button>

            </div>


            <div class="divider"></div>

            <h4>03 · What should happen first?</h4>

            <div class="mt-15" style="display:grid;gap:10px;">

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="response"
                    data-answer="contain">
                    Contain the incident: secure the account and revoke active sessions.
                </button>

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="response"
                    data-answer="ignore">
                    Ignore the activity unless more employees report it.
                </button>

                <button class="option-button"
                    data-action="mission5-answer"
                    data-question="response"
                    data-answer="delete">
                    Delete the logs to remove suspicious traces.
                </button>

            </div>


            <div id="mission5Feedback" class="mt-20"></div>

            <button
                class="action-button mt-20"
                data-action="submit-verdict"
            >
                SUBMIT FINAL VERDICT →
            </button>

        </div>


        <div id="finalReport"></div>


        ${completed
            ? feedback(
                "Case completed",
                "Your final assessment has been submitted. Review or print your investigation report."
            )
            : ""
        }

    `;

}


function answerMissionFive(question, answer) {

    selectedFinalAnswers[question] = answer;

    const button = document.querySelector(
        `[data-question="${question}"][data-answer="${answer}"]`
    );

    if (button) {

        document.querySelectorAll(
            `[data-question="${question}"]`
        ).forEach(option => {

            option.classList.remove("selected");

        });

        button.classList.add("selected");

    }

}


function renderVerdictReview() {

    const answers = state.answers.finalVerdict || {};

    const correct = {
        classification: "phishing",
        compromise: "suspected",
        response: "contain"
    };

    const questions = [
        {
            id: "classification",
            title: "01 · Incident classification",
            options: {
                phishing: "Credential-harvesting phishing",
                malware: "Confirmed ransomware infection",
                normal: "Normal IT maintenance"
            },
            explanation:
                "The email impersonated IT support and attempted to collect employee credentials through a lookalike domain."
        },
        {
            id: "compromise",
            title: "02 · Account compromise",
            options: {
                suspected: "Yes — suspected account compromise is supported by the evidence.",
                unproven: "No — there is no evidence of unusual access.",
                certain: "Yes — the attacker's identity and full activity are confirmed."
            },
            explanation:
                "Credentials were submitted, followed by an unfamiliar successful login and unusual finance-folder access. However, the attacker's identity and full activity remain unknown."
        },
        {
            id: "response",
            title: "03 · Immediate response",
            options: {
                contain: "Contain the incident: secure the account and revoke active sessions.",
                ignore: "Ignore the activity unless more employees report it.",
                delete: "Delete the logs to remove suspicious traces."
            },
            explanation:
                "Containment comes first. Secure the account, revoke active sessions, preserve evidence and begin investigating the affected systems."
        }
    ];

    return `
        <div class="panel mt-20">

            <div class="panel-heading">
                <h3>Investigation Results</h3>
                <span class="status-badge badge-success">MISSION SOLVED</span>
            </div>

            <p class="muted mt-10">
                You completed the investigation. Review the evidence-based
                answers below to see how your assessment compares.
            </p>

            ${questions.map(question => {

                const selected = answers[question.id];
                const isCorrect = selected === correct[question.id];

                return `
                    <div class="info-card mt-15">

                        <h4>${question.title}</h4>

                        <p class="mt-10">
                            <strong>Your answer:</strong>
                            <span class="${isCorrect ? "text-cyan" : "muted"}">
                                ${question.options[selected] || "No answer recorded"}
                            </span>
                        </p>

                        <p class="mt-10">
                            <strong>Correct answer:</strong>
                            <span class="text-cyan">
                                ${question.options[correct[question.id]]}
                            </span>
                        </p>

                        <p class="mt-10">
                            <strong>Why?</strong>
                            ${question.explanation}
                        </p>

                        <div class="mt-10">
                            ${isCorrect
                                ? '<span class="status-badge badge-success">CORRECT</span>'
                                : '<span class="status-badge badge-warning">REVIEW THIS ANSWER</span>'
                            }
                        </div>

                    </div>
                `;

            }).join("")}

            <div class="divider"></div>

            <h3>Case Outcome</h3>

            <p class="mt-10">
                The evidence supports credential-harvesting phishing
                followed by suspected account compromise.
            </p>

            <p class="muted mt-10">
                The full extent of the incident and whether data was
                exfiltrated remain unconfirmed.
            </p>

        </div>
    `;
}

function submitFinalVerdict() {

    const required = [
        "classification",
        "compromise",
        "response"
    ];

    const missing = required.filter(
        question => !selectedFinalAnswers[question]
    );

    if (missing.length) {

        $("#mission5Feedback").innerHTML = feedback(
            "Investigation incomplete",
            "Answer all three questions before submitting your verdict.",
            "warning"
        );

        return;
    }

    // Record the participant's answers.
    state.answers.finalVerdict = {
        ...selectedFinalAnswers
    };

    // Calculate the score for feedback.
    const correct = {
        classification: "phishing",
        compromise: "suspected",
        response: "contain"
    };

    const score = required.filter(
        question =>
            selectedFinalAnswers[question] === correct[question]
    ).length;

    state.answers.finalScore = score;

    // Mark Mission 5 as completed regardless of the score.
    completeMission(4);

    state.finalReport = true;

    saveState();

    // Show the results and correct answers.
    $("#mission5Feedback").innerHTML = feedback(
        "Investigation completed!",
        `You solved Operation Blackout. Your assessment scored ${score} / 3. Review the explanations below to see the correct conclusions.`,
        "success"
    );

    $("#finalReport").innerHTML = renderVerdictReview();

    renderMissionFooter();

    showToast("Mission 5 solved — Operation Blackout completed.");

    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
    });

}

/* =========================================================
   14. FINAL REPORT
   ========================================================= */

function renderFinalReport() {

    const score = state.answers.finalScore ?? 0;

    return `

        <div class="panel mt-20" id="printableReport">

            <div class="panel-heading">
                <h2>Final Investigation Report</h2>
                <span class="status-badge badge-success">CASE REVIEW</span>
            </div>

            <div class="divider"></div>

            <p class="section-label">CLASSIFICATION</p>

            <h3 class="text-cyan">
                Credential-harvesting phishing followed by suspected account compromise.
            </h3>


            <div class="divider"></div>

            <div class="two-column-layout">

                <div>

                    <h3>Confirmed evidence</h3>

                    <ul class="report-list">
                        <li>Suspicious credential request.</li>
                        <li>Unfamiliar destination domain.</li>
                        <li>Simulated authentication failures.</li>
                        <li>Reported credential entry.</li>
                        <li>Subsequent unfamiliar successful login.</li>
                    </ul>

                </div>

                <div>

                    <h3>Unanswered questions</h3>

                    <ul class="report-list">
                        <li>Attacker identity.</li>
                        <li>Exact access scope.</li>
                        <li>Whether confidential information was viewed or modified.</li>
                        <li>Whether other accounts were affected.</li>
                    </ul>

                </div>

            </div>


            <div class="divider"></div>

            <h3>Incident response recommendations</h3>

            <div class="card-grid four-columns mt-20">

                ${infoCard(
                    "01 · CONTAIN",
                    "Secure the account, revoke active sessions and block confirmed malicious infrastructure through approved procedures."
                )}

                ${infoCard(
                    "02 · INVESTIGATE",
                    "Preserve logs and examine affected systems, files and accounts."
                )}

                ${infoCard(
                    "03 · RECOVER",
                    "Reset credentials through official channels, restore services and verify system integrity."
                )}

                ${infoCard(
                    "04 · IMPROVE",
                    "Enable MFA, review security controls and strengthen employee awareness."
                )}

            </div>


            <div class="divider"></div>

            <div class="feedback success">

                <strong>CASE FILE 001 · INVESTIGATION COMPLETE</strong>

                <p>
                    Your decision score: ${score} / 3.
                    Your findings have been recorded locally in this browser.
                </p>

            </div>


            <p class="mt-20">
                Cybersecurity is not just about detecting attacks.
                It is about thinking critically, investigating evidence
                and making informed decisions.
            </p>

            <p class="email-disclaimer mt-20">
                ALL CASE DETAILS AND EVIDENCE ARE SIMULATED.
                THIS REPORT DOES NOT REPRESENT A REAL INCIDENT.
            </p>

        </div>

    `;

}


/* =========================================================
   15. EVIDENCE LOCKER
   ========================================================= */

function openEvidenceLocker() {

    const modal = $("#evidenceModal");

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    renderEvidenceLocker();

}


function closeEvidenceLocker() {

    const modal = $("#evidenceModal");

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");

}


function renderEvidenceLocker() {

    const list = $("#evidenceList");

    if (!state.collectedEvidence.length) {

        list.innerHTML = `
            <div class="empty-evidence">
                <span>▤</span>
                <strong>No evidence collected yet</strong>
                <p>Complete investigation tasks to unlock evidence records.</p>
            </div>
        `;

        return;

    }

    list.innerHTML = state.collectedEvidence.map(id => {

        const evidence = evidenceDatabase[id];

        if (!evidence) return "";

        return `
            <div class="evidence-list-item">

                <strong>${escapeHTML(evidence.title)}</strong>

                <p>${escapeHTML(evidence.description)}</p>

            </div>
        `;

    }).join("");

}


/* =========================================================
   16. PRINT REPORT
   ========================================================= */

function printReport() {

    if (!state.finalReport) {

        showToast("Complete the final verdict before printing.");

        return;

    }

    const report = $("#finalReport");

    if (!report || !report.innerHTML.trim()) {

        showToast("Final report is not available yet.");

        return;

    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {

        showToast("Allow pop-ups to print your report.");

        return;

    }

    printWindow.document.write(`

        <!DOCTYPE html>

        <html lang="en">

        <head>

            <meta charset="UTF-8">

            <title>Operation Blackout — Final Report</title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    color: #18113D;
                    max-width: 900px;
                    margin: 40px auto;
                    padding: 20px;
                    line-height: 1.7;
                }

                h1, h2, h3 {
                    color: #6157FF;
                }

                .panel {
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                }

                .card-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }

                .info-card {
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                }

                .divider {
                    margin: 20px 0;
                    border-top: 1px solid #ddd;
                }

                .section-label {
                    font-size: 11px;
                    font-weight: bold;
                    letter-spacing: 2px;
                }

                .text-cyan {
                    color: #6157FF;
                }

                .feedback {
                    padding: 15px;
                    background: #f0efff;
                }

                .email-disclaimer {
                    font-size: 10px;
                }

                @media print {
                    body {
                        margin: 10px;
                    }
                }

            </style>

        </head>

        <body>

            <h1>DIGITAL DETECTIVE</h1>

            <p>OPERATION BLACKOUT · AURELIA GLOBAL</p>

            <p>CASE FILE 001 · FINAL INVESTIGATION REPORT</p>

            ${report.innerHTML}

        </body>

        </html>

    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.print();

}


/* =========================================================
   17. RESET INVESTIGATION
   ========================================================= */

function resetInvestigation() {

    const confirmed = window.confirm(
        "Reset Operation Blackout? Your mission progress and collected evidence will be deleted from this browser."
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);

    state = structuredClone(defaultState);

    currentMission = 0;

    resetTemporaryMissionState();

    updateProgress();

    showHome();

    showToast("Investigation progress reset.");

}


/* =========================================================
   18. EVENT HANDLING
   ========================================================= */

document.addEventListener("click", event => {

    const target = event.target.closest("[data-action]");

    if (!target) return;

    const action = target.dataset.action;

    switch (action) {

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

            answerMissionFive(
                target.dataset.question,
                target.dataset.answer
            );

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

    }

});


/* =========================================================
   19. NAVIGATION EVENT LISTENERS
   ========================================================= */

$("#startCase").addEventListener("click", showWorkspace);

$("#backHome").addEventListener("click", showHome);

$("#brandHome").addEventListener("click", event => {

    event.preventDefault();

    showHome();

});


$("#resetProgress").addEventListener(
    "click",
    resetInvestigation
);


$("#closeEvidence").addEventListener(
    "click",
    closeEvidenceLocker
);


$("#closeEvidenceBackdrop").addEventListener(
    "click",
    closeEvidenceLocker
);


$("#evidenceLocker")?.addEventListener(
    "click",
    openEvidenceLocker
);


document.querySelectorAll(".mission-nav-item").forEach(button => {

    button.addEventListener("click", () => {

        goToMission(Number(button.dataset.mission));

    });

});


/* =========================================================
   20. INITIALISE APPLICATION
   ========================================================= */

function initialiseApplication() {

    currentMission = state.currentMission;

    updateProgress();

    if (state.finalReport) {

        // Keep the completed report available after a refresh.

        state.currentMission = 4;

        currentMission = 4;

        saveState();

    }

    showHome();

}


initialiseApplication();
