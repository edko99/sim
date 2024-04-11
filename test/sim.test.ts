import { assertEquals, fail } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { Process, Sim } from "../src/sim.ts";
import { Result } from "../src/sim.ts";
import { PREEMPT } from "../src/sim.ts";

Deno.test("One process is scheduled correctly", () => {
    const sim = new Sim();
    let count = 0;
    function* process(_id: number): Process {
        assertEquals(sim.time, 3);
        yield 1
        assertEquals(sim.time, 4);
        ++count;
    }
    sim.spawn(process, 3);
    sim.run();
    assertEquals(count, 1);
});

Deno.test("Multiple processes are scheduled correctly", () => {
    const sim = new Sim();
    let count = 0;
    function spawn(start:number) {
        function* process(_id: number): Process {
            assertEquals(sim.time, start);
            yield 1
            assertEquals(sim.time, start + 1);
            ++count;
        }
        sim.spawn(process, start);
    }
    spawn(100);
    spawn(10);
    spawn(1);
    sim.run();
    assertEquals(count, 3);
});

Deno.test("Time increases", () => {
    const sim = new Sim();
    const timestamps: number[] = [];
    function spawn(start:number) {
        function* process(_id: number): Process {
            timestamps.push(sim.time);
            yield 2
            timestamps.push(sim.time);
        }
        sim.spawn(process, start);
    }
    spawn(0);
    spawn(1);
    sim.run();
    assertEquals(timestamps, [0, 1, 2, 3]);
});

Deno.test("Impatience", () => {
    const sim = new Sim();
    const resource = sim.resource("resource");
    let ran = false;
    function* initialOccupant(_id: number): Process {
        const result = yield resource.requestImpatient(impatience);
        assertEquals(result, Result.OK);
        yield 100;
    }
    function* main(_id: number): Process {
        const result = yield resource.requestImpatient(impatience)
        assertEquals(result, Result.Preempted);
        assertEquals(sim.time, 10);
        ran = true;
    }
    function* impatience(_id: number): Process {
        yield 10;
        yield PREEMPT;
    }
    sim.spawn(initialOccupant);
    sim.spawn(main);
    sim.run();
    assertEquals(ran, true);
});

Deno.test("Liberating capacity advances the entire non-stric queue", () => {
    const sim = new Sim();
    const res = sim.resource("resource", 2, false);
    let count = 0;
    function* first(_id:number): Process {
        yield res.request(2);
        yield res.release(2);
    }
    function* successor(_id:number): Process {
        yield res.request(1);
        ++count;
    }
    sim.spawn(first);
    sim.spawn(successor);
    sim.spawn(successor);
    sim.run();
    assertEquals(count, 2);
});

Deno.test("Liberating capacity advances the entire queue head (strict)", () => {
    const sim = new Sim();
    const res = sim.resource("resource", 2, true);
    let count = 0;
    function* first(_id:number): Process {
        yield res.request(2);
        yield res.release(2);
    }
    function* successor(_id:number): Process {
        yield res.request(1);
        ++count;
    }
    sim.spawn(first);
    sim.spawn(successor);
    sim.spawn(successor);
    sim.run();
    assertEquals(count, 2);
});

Deno.test("Impatience causes non-strict resource queue to advance", () => {
    const sim = new Sim();
    const res = sim.resource("resource", 4, false);
    let count = 0;
    function* first(_:number): Process {
        yield res.request(2);
        yield 20;
    }
    function* second(_:number): Process {
        const result = yield res.requestImpatient(impatience, 4);
        assertEquals(result, Result.Preempted);
        ++count;
    }
    function* impatience(_:number): Process {
        yield 10;
        yield PREEMPT;
        fail("Impatience process should have not reached here");
    }
    function* third(_:number): Process {
        yield res.request(4);
        fail("Third process should have not reached here");
    }
    function* small(_:number): Process {
        yield res.request(1);
        ++count;
    }
    sim.spawn(first);
    sim.spawn(second);
    sim.spawn(third);
    sim.spawn(small);
    sim.spawn(small);
    sim.run();
    assertEquals(count, 3);
});
