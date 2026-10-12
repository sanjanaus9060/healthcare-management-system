import { emptyToNull, initials, splitList, isUpcoming, todayISO } from "./format";

test("initials strips doctor prefix", () => {
  expect(initials("Dr. Ananya Rao")).toBe("AR");
  expect(initials("Priya")).toBe("P");
});

test("emptyToNull converts blank strings", () => {
  expect(emptyToNull("  ")).toBeNull();
  expect(emptyToNull("abc")).toBe("abc");
});

test("splitList trims comma separated values", () => {
  expect(splitList("Penicillin, , Dust ")).toEqual(["Penicillin", "Dust"]);
});

test("isUpcoming only for active future appointments", () => {
  expect(isUpcoming({ status: "pending", date: todayISO() })).toBe(true);
  expect(isUpcoming({ status: "cancelled", date: "2999-01-01" })).toBe(false);
  expect(isUpcoming({ status: "confirmed", date: "2000-01-01" })).toBe(false);
});
