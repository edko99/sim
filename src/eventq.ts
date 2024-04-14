// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

// Modified version of @std/data-structures@^0.221.0
// Allows random removal of queued elements
// Elements must have an id property

/** Compares its two arguments for ascending order using JavaScript's built in comparison operators. */
export function ascend<T>(a: T, b: T): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Returns the parent index for a child index. */
function getParentIndex(index: number) {
  return Math.floor((index + 1) / 2) - 1;
}

export class BinaryHeap<T> implements Iterable<T> {
  #data: T[] = [];
  #positions = new Map<number, number>();

  constructor(private compare: (a: T, b: T) => number = ascend, private id: (t:T) => number) {}

  /** Returns the underlying cloned array in arbitrary order without sorting */
  toArray(): T[] {
    return Array.from(this.#data);
  }

  /** The amount of values stored in the binary heap. */
  get length(): number {
    return this.#data.length;
  }

  /** Returns the first value in the binary heap, or undefined if it is empty. */
  peek(): T | undefined {
    return this.#data[0];
  }

  /** Removes an element with a given id. */
  remove(id: number): T | undefined {
    return this.#pop(this.#positions.get(id)!);
  }

  /** Removes the first value from the binary heap and returns it, or null if it is empty. */
  pop(): T | undefined {
    return this.#pop(0);
  }

  #pop(index: number): T | undefined {
    const size: number = this.#data.length - 1;
    this.#swap(index, size);
    let parent = 0;
    let right: number = 2 * (parent + 1);
    let left: number = right - 1;
    while (left < size) {
      const greatestChild = right === size ||
          this.compare(this.#data[left]!, this.#data[right]!) <= 0
        ? left
        : right;
      if (this.compare(this.#data[greatestChild]!, this.#data[parent]!) < 0) {
        this.#swap(parent, greatestChild);
        parent = greatestChild;
      } else {
        break;
      }
      right = 2 * (parent + 1);
      left = right - 1;
    }
    const first = this.#data.pop();
    if(first !== undefined) this.#positions.delete(this.id(first));
    return first;
  }

  /** Adds values to the binary heap. */
  push(...values: T[]): number {
    for (const value of values) {
      let index: number = this.#data.length;
      let parent: number = getParentIndex(index);
      this.#positions.set(this.id(value), this.#data.length);
      this.#data.push(value);
      while (
        index !== 0 && this.compare(this.#data[index]!, this.#data[parent]!) < 0
      ) {
        this.#swap(parent, index);
        index = parent;
        parent = getParentIndex(index);
      }
    }
    return this.#data.length;
  }

  /** Removes all values from the binary heap. */
  clear() {
    this.#data = [];
    this.#positions.clear();
  }

  /** Checks if the binary heap is empty. */
  isEmpty(): boolean {
    return this.#data.length === 0;
  }

  /** Returns an iterator for retrieving and removing values from the binary heap. */
  *drain(): IterableIterator<T> {
    while (!this.isEmpty()) {
      yield this.pop() as T;
    }
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.drain();
  }

  #swap(a: number, b: number) {
    const a_value = this.#data[a];
    const b_value = this.#data[b];
    this.#data[a] = b_value;
    this.#data[b] = a_value;
    this.#positions.set(this.id(b_value), a);
    this.#positions.set(this.id(a_value), b);
  }
}
