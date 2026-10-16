import test from "node:test";
import assert from "node:assert/strict";
import { isHumanHandoverIntent } from "./message-intent.service.js";

test("Handoff Intent: Negative cases (MUST NOT trigger handoff)", () => {
  const negativeCases = [
    // 1. Postpone / future reconnect
    "ok i will connect with you later",
    "OK I WILL CONNECT WITH YOU LATER",
    "ok, i will connect with you later.",
    "I will connect with you tomorrow",
    "Let me connect with you later",
    "Can I connect with you again next week?",
    "Thanks, I will contact you later",
    "Can I reconnect next week?",
    "I will contact support next week",
    "ok bye will connect later",
    "let us connect tomorrow",
    "I'll connect with you soon",
    "We can connect another time",
    "I will talk to support later",

    // 2. Technical connectivity / integration / accounts / networks
    "How do I connect my account?",
    "I want to connect my account",
    "Connect my mobile app to the API",
    "How do I connect my mobile application to the API?",
    "I will connect to the website later",
    "How to connect with database",
    "How do I connect to the server?",
    "Connect to wifi",
    "Unable to connect to bluetooth device",
    "Failed to connect webhook",
    "Can I link my Google account?",
    "Connect my domain to Shaivik",

    // 3. System capabilities and product definition questions
    "Do you support dark mode?",
    "Does this support webhooks?",
    "Do you support Telugu language?",
    "Can you support multi-tenant organizations?",
    "What is an AI agent?",
    "What is an agent in Shaivik AI?",
    "What is a virtual assistant?",

    // 4. Ordinary conversation and self-descriptions
    "Thanks, goodbye",
    "I am a single person running a startup",
    "I am an insurance agent looking for tools",
    "I work as a real estate agent",
    "How many staff members can I add to my plan?",
    "We have a great team member who loves AI",
    "Tell me about your customer support features",

    // 5. Assistant response simulations (assistant mentions connecting with the user)
    "Our AI model will connect with your knowledge base to answer questions.",
    "Feel free to connect with us later if you need any additional help.",
    "Thank you! Connect with us tomorrow if you have any questions.",
  ];

  for (const message of negativeCases) {
    const result = isHumanHandoverIntent(message);
    assert.equal(
      result,
      false,
      `Expected FALSE (no handoff) for message: "${message}", but got ${result}`,
    );
  }
});

test("Handoff Intent: Positive cases (MUST trigger handoff)", () => {
  const positiveCases = [
    // 1. Explicit human / real person requests
    "Please connect me to a human agent.",
    "connect me to a human agent",
    "I want to speak to a real person.",
    "i want to talk to a human",
    "I need to speak with a human being",
    "Can I talk to a real person?",
    "Could I speak with a live agent?",
    "Connect me to a real human please",
    "Let me talk to a live person",
    "Give me a human agent",
    "Human agent please",
    "Live agent now",

    // 2. Explicit support team / representative transfer
    "Transfer me to customer support.",
    "Please transfer me to customer support",
    "Can a support representative help me?",
    "Please let me talk to your support team.",
    "I want to talk to your support team",
    "connect with your team member so i can talk with him",
    "talk with team member",
    "speak with executive",
    "connect me to an agent",
    "support care",
    "customer care please",
    "transfer this chat to customer care",
    "escalate to support team",
    "need to talk with your team",
    "talk with team",
    "connect with team",
    "need to talk with team",
    "talk with your team",
    "talk to your team",
    "connect with your team",
    "connect to your team",
    "can i talk to your team",
    "can i connect with your team",
    "can i connect with team",
    "can i speak with your team",
    "let me talk with your team",
    "please connect me to your team",
    "reach out to your team",
    "contact your team",
    "get in touch with your team",

    // 3. Explicit handover commands
    "handover this chat to a real person",
    "hand over to an agent",
    "handoff to human support",
    "request human escalation",

    // 4. Telugu script
    "మానవ ఏజెంట్‌తో మాట్లాడాలి",
    "సపోర్ట్ ఏజెంట్‌తో మాట్లాడాలి",
    "హ్యూమన్ ఏజెంట్‌కి కనెక్ట్ చేయండి",

    // 5. Romanized Telugu
    "human agent tho matladali",
    "support team tho matladali",
    "real person tho matladali",
    "human agent ki connect cheyandi",
    "support agent tho connect cheyandi",
  ];

  for (const message of positiveCases) {
    const result = isHumanHandoverIntent(message);
    assert.equal(
      result,
      true,
      `Expected TRUE (handoff triggered) for message: "${message}", but got ${result}`,
    );
  }
});

test("Handoff Intent: Non-string and empty inputs return false", () => {
  assert.equal(isHumanHandoverIntent(null), false);
  assert.equal(isHumanHandoverIntent(undefined), false);
  assert.equal(isHumanHandoverIntent(""), false);
  assert.equal(isHumanHandoverIntent("   "), false);
  assert.equal(isHumanHandoverIntent(123), false);
  assert.equal(isHumanHandoverIntent({}), false);
});

test("Duplicate Handoff Prevention: Notifications are sent only once per handover transition", async () => {
  let webhookDispatchCount = 0;
  let whatsappNotificationCount = 0;

  class FakeConversationRepository {
    constructor() {
      this.conv = {
        id: "conv-1",
        agentId: "agent-1",
        projectId: "proj-1",
        visitorId: "vis-1",
        isHandover: false,
        handoverRequestedAt: null,
        setHandoverMode(mode) {
          this.isHandover = mode;
          this.handoverRequestedAt = mode ? new Date() : null;
        },
      };
    }
    async findById(id) {
      return this.conv;
    }
    async update(conv) {
      this.conv = conv;
      return conv;
    }
  }

  const fakeAgentRepo = {
    async findById(id) {
      return {
        id,
        name: "Test Agent",
        project: { organizationId: "org-1", name: "Test Project" },
      };
    },
  };

  const fakeWebhookDispatcher = {
    async dispatch() {
      webhookDispatchCount++;
    },
  };

  const fakeWhatsappUseCase = {
    async execute() {
      whatsappNotificationCount++;
    },
  };

  // Simulate toggleHandoverMode logic
  const conversationRepo = new FakeConversationRepository();

  async function handleMessage(userContent) {
    const isHandoverTriggered = isHumanHandoverIntent(userContent);
    const conv = await conversationRepo.findById("conv-1");

    if (isHandoverTriggered && !conv.isHandover) {
      const wasHandover = conv.isHandover;
      conv.setHandoverMode(true);
      await conversationRepo.update(conv);

      if (conv.isHandover && !wasHandover) {
        await fakeWebhookDispatcher.dispatch();
        await fakeWhatsappUseCase.execute();
      }
      return { isHandover: true, notified: true };
    }

    return { isHandover: conv.isHandover, notified: false };
  }

  // Turn 1: Ordinary message - "ok i will connect with you later"
  const res1 = await handleMessage("ok i will connect with you later");
  assert.equal(res1.isHandover, false);
  assert.equal(res1.notified, false);
  assert.equal(webhookDispatchCount, 0);
  assert.equal(whatsappNotificationCount, 0);

  // Turn 2: User explicitly requests human - "Please connect me to a human agent"
  const res2 = await handleMessage("Please connect me to a human agent");
  assert.equal(res2.isHandover, true);
  assert.equal(res2.notified, true);
  assert.equal(webhookDispatchCount, 1);
  assert.equal(whatsappNotificationCount, 1);

  // Turn 3: User sends subsequent message while already in handover mode - "Are you there?"
  const res3 = await handleMessage("Are you there?");
  assert.equal(res3.isHandover, true);
  assert.equal(res3.notified, false);
  assert.equal(webhookDispatchCount, 1, "Webhook must NOT be dispatched again");
  assert.equal(whatsappNotificationCount, 1, "WhatsApp notification must NOT be sent again");

  // Turn 4: User repeats request while in handover mode - "I need a human"
  const res4 = await handleMessage("I need a human");
  assert.equal(res4.isHandover, true);
  assert.equal(res4.notified, false);
  assert.equal(webhookDispatchCount, 1, "Must remain exactly 1 notification");
  assert.equal(whatsappNotificationCount, 1, "Must remain exactly 1 notification");
});

