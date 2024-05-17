import { assertEquals } from "https://deno.land/std@0.219.0/assert/mod.ts";
//import { ResourceUsageLog } from "../src/sim.ts";
import { _composeMoves, accumulate, asKeyVal, normalize, queueLengthHistogram, usageHistogram } from "../src/logs.ts";

Deno.test("asKey works", () => {
    const actual = asKeyVal([1, 2, 3, 4]);
    const expected = [{key:0, val:1}, {key:1, val:2}, {key:2, val:3}, {key:3, val:4}];
    assertEquals(actual, expected);
});

Deno.test("normalize works", () => {
    const actual = normalize([1, 2, 3, 4]);
    const expected = [0.1, 0.2, 0.3, 0.4];
    assertEquals(actual, expected);
});

Deno.test("accumulate works", () => {
    const actual = accumulate([1, 2, 3, 4]);
    const expected = [1, 3, 6, 10];
    assertEquals(actual, expected);
});

Deno.test("queueLengthHistogram", () => {
    const input = [
        {pid:1, rid:1, pri:1, rT:0, cap:4, xqT:2},
        {pid:2, rid:1, pri:1, rT:1, cap:2},
    ];
    const actual = queueLengthHistogram(input);
    const expected: number[] = [0, 1, 1];
    assertEquals(actual, expected);
});

Deno.test("usageHistogram", () => {
    const input = [
        {pid:1, rid:1, pri:1, rT:0, cap:4, xqT:2, av:10, lT:4, fr:4},
        {pid:2, rid:1, pri:1, rT:1, cap:3, xqT:2.5, av:6, lT:3.5, fr:3},
    ];
    const actual = usageHistogram(input);
    const expected: number[] = [2, 0, 0, 0, 1, 0, 0, 1];
    assertEquals(actual, expected);
});

Deno.test("_composeMoves simple cases", () => {
    assertEquals(_composeMoves([
        {t:0, v:1}, {t:1, v:-1},
    ], 0), [0, 1]);
    assertEquals(_composeMoves([
        {t:0, v:1}, {t:1, v:-1},
        {t:2, v:1}, {t:3, v:-1},
    ], 0), [1, 2]);
});

Deno.test("_composeMoves simple cases, with from", () => {
    assertEquals(_composeMoves([
        {t:0, v:1}, {t:1, v:-1},
    ], 0.5), [0, 0.5]);
    assertEquals(_composeMoves([
        {t:0, v:1}, {t:1, v:-1},
        {t:2, v:1}, {t:3, v:-1},
    ], 2), [0, 1]);
});

Deno.test("_composeMoves overlap", () => {
    assertEquals(_composeMoves([
        {t:0, v:1}, {t:2, v:-1},
        {t:1, v:1}, {t:4, v:-1},
    ], 0), [0, 3, 1]);
    assertEquals(_composeMoves([
        {t:1, v:1}, {t:4, v:-1},
        {t:2, v:1}, {t:4, v:-1},
        {t:3, v:1}, {t:4, v:-1},
    ], 0), [1, 1, 1, 1]);
    // same as previous, but shuffled
    assertEquals(_composeMoves([
        {t:4, v:-1}, {t:4, v:-1},
        {t:4, v:-1},{t:3, v:1},
        {t:2, v:1}, {t:1, v:1}, 
    ], 0), [1, 1, 1, 1]);
});

Deno.test("_composeMoves overlap, with from", () => {
    assertEquals(_composeMoves([
        {t:0, v:1}, {t:2, v:-1},
        {t:1, v:1}, {t:4, v:-1},
    ], 1.5), [0, 2, 0.5]);
    assertEquals(_composeMoves([
        {t:1, v:1}, {t:4, v:-1},
        {t:2, v:1}, {t:4, v:-1},
        {t:3, v:1}, {t:4, v:-1},
    ], 1.5), [0, 0.5, 1, 1]);
    // same as previous, but shuffled
    assertEquals(_composeMoves([
        {t:4, v:-1}, {t:4, v:-1},
        {t:4, v:-1},{t:3, v:1},
        {t:2, v:1}, {t:1, v:1}, 
    ], 1.5), [0, 0.5, 1, 1]);
});
