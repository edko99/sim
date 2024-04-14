import { assertEquals } from "https://deno.land/std@0.219.0/assert/mod.ts";
import { runScenarios } from "../../mod.ts";

const path = import.meta.resolve("./multi_worker.ts");

Deno.test("data collected from multiple concurrently running sampling workers", () =>{
    runScenarios<number, number>(path, [1,2], 3).then(samples => {
        assertEquals(samples, [[1,1,1], [2,2,2]]);
    })
});