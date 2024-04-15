import { assertEquals } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { ascend, BinaryHeap } from "../src/eventq.ts";

// Tests copied (and modified) from the standard library
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

Deno.test("BinaryHeap works with ascend comparator", () => {
  const minHeap = new BinaryHeap<number[]>(([a,_a],[b,_b]) => ascend(a,b), ([_x, i]) => i);
  const values: number[][] = [-10, 9, -1, 100, 9, 1, 0, 9, -100, 10, -9].map((x, i) => [x, i]);
  const expected: number[] = [-100, -10, -9, -1, 0, 1, 9, 9, 9, 10, 100];
  let actual: number[] = [];

  assertEquals(minHeap.length, 0);
  assertEquals(minHeap.isEmpty(), true);
  assertEquals(minHeap.peek(), undefined);
  for (const [i, value] of values.entries()) {
    assertEquals(minHeap.push(value), i + 1);
  }
  assertEquals(minHeap.length, values.length);
  assertEquals(minHeap.isEmpty(), false);
  while (!minHeap.isEmpty()) {
    assertEquals(minHeap.peek()![0], expected[actual.length]);
    actual.push(minHeap.pop()![0] as number);
    assertEquals(minHeap.length, expected.length - actual.length);
    assertEquals(minHeap.isEmpty(), actual.length === expected.length);
  }
  assertEquals(minHeap.peek(), undefined);
  assertEquals(actual, expected);

  actual = [];
  assertEquals(minHeap.push(...values), values.length);
  assertEquals(minHeap.length, values.length);
  assertEquals(minHeap.isEmpty(), false);
  assertEquals(minHeap.peek()![0], expected[0]);
  for (const value of minHeap) {
    actual.push(value[0]);
    assertEquals(minHeap.length, expected.length - actual.length);
    assertEquals(minHeap.isEmpty(), actual.length === expected.length);
    const peek = minHeap.peek();
    if(peek !== undefined){
        assertEquals(peek[0], expected[actual.length]);
    }
  }
  assertEquals(actual, expected);
});

Deno.test("BinaryHeap handles edge case 1", () => {
  const naiveId = (x:number) => x; // only works because there are no duplicate values
  const minHeap = new BinaryHeap<number>(ascend, naiveId);
  minHeap.push(4, 2, 8, 1, 10, 7, 3, 6, 5);
  assertEquals(minHeap.pop(), 1);
  minHeap.push(9);

  const expected = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  assertEquals([...minHeap], expected);
});

Deno.test("BinaryHeap handles edge case 2", () => {
  interface Point {
    x: number;
    y: number;
  }
  const minHeap = new BinaryHeap<Point>((a, b) => ascend(a.x, b.x), p => p.y);
  minHeap.push({ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 });

  const expected = [{ x: 0, y: 1 }, { x: 0, y: 3 }, { x: 0, y: 2 }];
  assertEquals([...minHeap], expected);
});

Deno.test("BinaryHeap handles edge case 3", () => {
  interface Point {
    x: number;
    y: number;
  }
  const minHeap = new BinaryHeap<Point>((a, b) => ascend(a.x, b.x), p => 100*p.x + p.y);
  minHeap.push(
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 4 },
    { x: 2, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 7 },
  );

  const expected = [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 5 },
    { x: 2, y: 4 },
    { x: 2, y: 6 },
    { x: 2, y: 7 },
  ];
  assertEquals([...minHeap], expected);
});

Deno.test("BinaryHeap handles README example", () => {
  const naiveId = (x:number) => x; // only works because there are no duplicate values
  const minHeap = new BinaryHeap<number>(ascend, naiveId);
  minHeap.push(4, 1, 3, 5, 2);
  assertEquals(minHeap.peek(), 1);
  assertEquals(minHeap.pop(), 1);
  assertEquals([...minHeap], [2, 3, 4, 5]);
  assertEquals([...minHeap], []);
});

// Test deletions

Deno.test("BinaryHeap handles removal of first value", () => {
  const naiveId = (x:number) => x; // only works because there are no duplicate values
  const minHeap = new BinaryHeap<number>(ascend, naiveId);
  minHeap.push(4, 1, 3, 5, 2);
  minHeap.remove(1);
  assertEquals(minHeap.peek(), 2);
  assertEquals(minHeap.pop(), 2);
  assertEquals([...minHeap], [3, 4, 5]);
  assertEquals([...minHeap], []);
});

Deno.test("BinaryHeap handles removal of value in the middle", () => {
  const naiveId = (x:number) => x; // only works because there are no duplicate values
  const minHeap = new BinaryHeap<number>(ascend, naiveId);
  minHeap.push(4, 1, 3, 5, 2);
  minHeap.remove(3);
  assertEquals(minHeap.peek(), 1);
  assertEquals(minHeap.pop(), 1);
  assertEquals([...minHeap], [2, 4, 5]);
  assertEquals([...minHeap], []);
});

Deno.test("BinaryHeap handles removal of last value", () => {
  const naiveId = (x:number) => x; // only works because there are no duplicate values
  const minHeap = new BinaryHeap<number>(ascend, naiveId);
  minHeap.push(4, 1, 3, 5, 2);
  minHeap.remove(5);
  assertEquals(minHeap.peek(), 1);
  assertEquals(minHeap.pop(), 1);
  assertEquals([...minHeap], [2, 3, 4]);
  assertEquals([...minHeap], []);
});

Deno.test("BinaryHeap handles multiple removals of first values", () => {
  const naiveId = (x:number) => x; // only works because there are no duplicate values
  const minHeap = new BinaryHeap<number>(ascend, naiveId);
  minHeap.push(4, 1, 3, 5, 2);
  minHeap.remove(1);
  minHeap.remove(2);
  assertEquals(minHeap.peek(), 3);
  assertEquals(minHeap.pop(), 3);
  assertEquals([...minHeap], [4, 5]);
  assertEquals([...minHeap], []);
});

Deno.test("BinaryHeap handles removal of values in the middle", () => {
  const naiveId = (x:number) => x; // only works because there are no duplicate values
  const minHeap = new BinaryHeap<number>(ascend, naiveId);
  minHeap.push(4, 1, 3, 5, 2);
  minHeap.remove(3);
  minHeap.remove(4);
  assertEquals(minHeap.peek(), 1);
  assertEquals(minHeap.pop(), 1);
  assertEquals([...minHeap], [2, 5]);
  assertEquals([...minHeap], []);
});

Deno.test("BinaryHeap handles multiple removals of last values", () => {
  const naiveId = (x:number) => x; // only works because there are no duplicate values
  const minHeap = new BinaryHeap<number>(ascend, naiveId);
  minHeap.push(4, 1, 3, 5, 2);
  minHeap.remove(5);
  minHeap.remove(4);
  assertEquals(minHeap.peek(), 1);
  assertEquals(minHeap.pop(), 1);
  assertEquals([...minHeap], [2, 3]);
  assertEquals([...minHeap], []);
});