import test from "node:test";
import assert from "node:assert/strict";
import { spent, committed } from "../src/lib/types.ts";

test("gift totals count purchased spending and all non-idea commitments", () => {
  const gifts = [
    { status: "idea", estimated_price: 100, actual_price: null },
    { status: "planned", estimated_price: 50, actual_price: null },
    { status: "purchased", estimated_price: 80, actual_price: 60 },
    { status: "gifted", estimated_price: 20, actual_price: 0 },
    { status: "gifted", estimated_price: null, actual_price: null },
  ];
  assert.equal(spent(gifts), 60);
  assert.equal(committed(gifts), 110);
  assert.equal(100 - spent(gifts), 40);
});
