import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { composePlan } from "../src/tools/compose-plan.js";

describe("commander_compose_plan", () => {
  it("composes a structured plan with skills, effort, and risks", () => {
    const result = composePlan({
      feature_description: "Build a billing dashboard with Stripe subscriptions, account permissions, and regression tests.",
      project_context: {
        stack: "Next.js, Postgres, Stripe",
        repo_root: "/repo",
        recent_commits: ["feat: add accounts table"],
      },
    });

    assert.equal(typeof result.plan_md, "string");
    assert.match(result.plan_md, /## Evals/);
    assert.ok(Array.isArray(result.recommended_skills));
    assert.ok(result.recommended_skills.includes("ccc-saas"));
    assert.ok(["S", "M", "L", "XL"].includes(result.estimated_effort));
    assert.ok(result.risks.length > 0);
  });

  it("handles a vague feature description with a scoped warning", () => {
    const result = composePlan({ feature_description: "make it better" });

    assert.match(result.plan_md, /make it better/);
    assert.equal(result.estimated_effort, "S");
    assert.ok(result.risks.some((risk) => risk.includes("too vague")));
  });
});
