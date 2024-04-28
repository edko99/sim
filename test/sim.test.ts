import { assertEquals, fail, assert } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { Process, Sim, Result, PREEMPT, Throttle } from "../mod.ts";

Deno.test("One process is scheduled correctly", () => {
    const sim = new Sim();
    let count = 0;
    function* process(): Process {
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
        function* process(): Process {
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
        function* process(): Process {
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
    function* initialOccupant(): Process {
        const result = yield resource.requestImpatient(impatience);
        assertEquals(result, Result.OK);
        yield 100;
    }
    function* main(): Process {
        const result = yield resource.requestImpatient(impatience)
        assertEquals(result, Result.Preempted);
        assertEquals(sim.time, 10);
        ran = true;
    }
    function* impatience(): Process {
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
    function* first(): Process {
        yield res.request(2);
        yield res.release(2);
    }
    function* successor(): Process {
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
    function* first(): Process {
        yield res.request(2);
        yield res.release(2);
    }
    function* successor(): Process {
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
    function* first(): Process {
        yield res.request(2);
        yield 20;
    }
    function* second(): Process {
        const result = yield res.requestImpatient(impatience, 4);
        assertEquals(result, Result.Preempted);
        ++count;
    }
    function* impatience(): Process {
        yield 10;
        yield PREEMPT;
        fail("Impatience process should have not reached here");
    }
    function* third(): Process {
        yield res.request(4);
        fail("Third process should have not reached here");
    }
    function* small(): Process {
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

Deno.test("Processes are unqueued by priority", () => {
    const p = [3, 1, 2, 1, 2, 3, 2, 1];
    const p_len = p.length;
    const result:number[] = [];
    const sim = new Sim();
    const prioResource = sim.resource("prioritized", 1, true, 3);
    const pr_agent = () => {
        const prio = p.shift();
        return function* agent(): Process {
            yield prioResource.request(1, prio!);
            yield prioResource.release();
            result.push(prio!);
        }
    }
    function* initial(): Process {
        yield prioResource.request();
        yield p_len + 1;
        yield prioResource.release();
    }
    sim.spawn(initial);
    for(let i=0; i<p_len; ++i) sim.spawn(pr_agent(), i+1);
    sim.run();
    assertEquals(result, [1, 1, 1, 2, 2, 2, 3, 3]);
});

Deno.test("Throttling", () => {
    const throttle = new Throttle(4, 2);
    const sim = new Sim();
    const exitTime: number[] = [];
    function* agent(): Process {
        yield throttle;
        exitTime.push(sim.time);
    }
    for(let i=0; i<10; ++i) sim.spawn(agent);
    sim.run();
    assertEquals(exitTime, [0, 0, 0, 0, 2, 2, 2, 2, 4, 4]);
});

Deno.test("Interrupt", () => {
    const sim = new Sim();
    let interruptorContinues = false;
    let wasInterrupted = false;
    function* interrupted(id: number): Process {
        function* interruptor(): Process {
            yield 10;
            yield sim.interrupt(id);
            assertEquals(sim.time, 10);
            interruptorContinues = true;
        }
        sim.spawn(interruptor);
        const result = yield 20;
        assertEquals(sim.time, 10);
        wasInterrupted = (result === Result.Interrupted);
    }
    sim.spawn(interrupted);
    sim.run();
    assert(wasInterrupted);
    assert(interruptorContinues);
});