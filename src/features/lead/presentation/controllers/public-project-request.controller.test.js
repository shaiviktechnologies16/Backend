import test from "node:test";
import assert from "node:assert/strict";
import { createPublicProjectRequestController } from "./public-project-request.controller.js";

test("publicProjectRequestController.submit returns 201 on valid submission", async () => {
  const mockUseCase = {
    async execute(payload) {
      return {
        project: {
          id: "proj-123",
          organizationId: "org-123",
          name: `${payload.projectType} - ${payload.company}`,
          description: payload.requirements,
          status: "ACTIVE",
          createdBy: "user-123",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        lead: {
          id: "lead-123",
          status: "NEW",
          createdAt: new Date(),
        },
        whatsapp: { sent: true },
      };
    },
  };

  const controller = createPublicProjectRequestController({
    submitProjectRequestUseCase: mockUseCase,
  });

  let responseStatus = null;
  let responseJson = null;

  const req = {
    body: {
      fullName: "Rakesh Sharma",
      mobile: "9010510476",
      email: "rakesh@shaiviktechnologies.in",
      company: "Shaivik Tech",
      projectType: "AI Solutions",
      requirements: "Custom AI Agent for customer support",
    },
  };

  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(data) {
      responseJson = data;
      return this;
    },
  };

  await controller.submit(req, res);

  assert.equal(responseStatus, 201);
  assert.equal(responseJson.success, true);
  assert.equal(responseJson.data.project.id, "proj-123");
  assert.equal(responseJson.data.lead.id, "lead-123");
  assert.equal(responseJson.data.whatsapp.sent, true);
});

test("publicProjectRequestController.submit validates required fields", async () => {
  const controller = createPublicProjectRequestController({
    submitProjectRequestUseCase: {},
  });

  const res = {
    status() { return this; },
    json() { return this; },
  };

  await assert.rejects(
    async () => {
      await controller.submit(
        { body: { fullName: "", mobile: "9876543210", requirements: "App" } },
        res,
      );
    },
    { message: "Full name is required." },
  );

  await assert.rejects(
    async () => {
      await controller.submit(
        { body: { fullName: "Rakesh", mobile: "", requirements: "App" } },
        res,
      );
    },
    { message: "Mobile number is required." },
  );

  await assert.rejects(
    async () => {
      await controller.submit(
        { body: { fullName: "Rakesh", mobile: "9876543210", requirements: "" } },
        res,
      );
    },
    { message: "Project requirements are required." },
  );
});

