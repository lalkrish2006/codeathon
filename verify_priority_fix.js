const axios = require('axios');

const API_URL = 'http://localhost:5000/api';




const PYTHON_URL = 'http://localhost:8000/prioritize';

const cases = [
    {
        name: "Critical: Oxygen Cylinder",
        description: "Urgent need for oxygen cylinder for ICU patient.",
        expected_priority: 1,
        expected_override: true
    },
    {
        name: "Non-Critical: Trekking Gear",
        description: "Need oxygen cylinder for trekking trip in Himalayas.",
        expected_priority: 10,
        expected_override: true 
    },
    {
        name: "Future Use: Just in case",
        description: "Buying oxygen cylinder just in case of future wave.",
        expected_priority: 8,
        expected_override: true
    },
    {
        name: "Mild: Flu Medicine",
        description: "Need medicine for cold and flu symptoms.",
        expected_priority: 4,
        expected_override: true
    },
    {
        name: "Misuse: Pay Extra",
        description: "I will pay extra double price for urgent delivery of trekking gear.",
        expected_priority: 10, 
        check_reasoning: "MISUSE FLAG"
    },
    {
        name: "Misuse: Bribe (Critical Item)",
        description: "I will bribe you for urgent vaccine delivery.", 
        expected_priority: 10, 
        check_reasoning: "Payment-based urgency is not allowed",
        check_misuse: true
    },
    {
        name: "Misuse: Pay Extra (Non-Critical)",
        description: "I can pay extra and need it faster than others.",
        expected_priority: 10,
        check_reasoning: "Payment-based urgency is not allowed",
        check_misuse: true
    },
    {
        name: "Calibration: Stable/Backup (Downgrade)",
        description: "Need oxygen cylinder for stable daily support.",
        expected_priority: 3, 
        check_reasoning: "[Calibration] Urgency downgraded"
    },
    {
        name: "Calibration: ICU (Upgrade)",
        description: "Oxygen saturation dropped immediate ICU case.",
        expected_priority: 1,
        check_reasoning: "[Calibration] CRITICAL CONDITION detected"
    },
    {
        name: "Ethics: Travel (Non-Critical)",
        description: "Need oxygen urgent for travel.",
        expected_priority: 10, 
        check_reasoning: "Detected recreational keyword"
    }
];

async function run() {
    console.log("=== STARTING AI PRIORITY VERIFICATION (MISUSE CLAMP) ===");
    for (const test of cases) {
        try {
            const payload = {
                id: `TEST-${Date.now()}`,
                description: test.description,
                sender: "Test Verifier",
                recipient_type: "residential"
            };
            
            const res = await axios.post(PYTHON_URL, payload);
            const data = res.data;
            
            console.log(`\nTEST: ${test.name}`);
            console.log(`Input: "${test.description}"`);
            console.log(`Output: Priority ${data.final_priority_score} | MisuseFlag: ${data.misuse_flag} | Reasoning: ${data.reasoning.substring(0, 50)}...`);
            
            
            let pass = true;
            if (test.expected_priority && data.final_priority_score !== test.expected_priority) {
                console.error(`[FAIL] Expected Priority ${test.expected_priority}, got ${data.final_priority_score}`);
                console.error(`Reasoning: ${data.reasoning}`);
                pass = false;
            }
            
            if (test.check_reasoning && !data.reasoning.includes(test.check_reasoning)) {
                 console.error(`[FAIL] Expected reasoning to contain "${test.check_reasoning}"`);
                 pass = false;
            }

            if (test.check_misuse && data.misuse_flag !== true) {
                console.error(`[FAIL] Expected misuse_flag = true`);
                pass = false;
            }
            
            if (pass) console.log("[PASS] Correct.");
            
        } catch (e) {
            console.error(`[ERROR] ${test.name}:`, e.message);
        }
    }
}

run();
