# sim
Discrete event simulation library, inspired by GPSS, to be used in Deno projects.

## Usage
Deno import
```js
import { Process, Sim, uniformInt } from "https://deno.land/x/sim@v0.1.2-alpha/mod.ts";

const sim = new Sim();

function* agent(id: number): Process {
    console.log(`time ${sim.time}: agent ${id}, starting`);
    yield uniformInt(4, 8); // do something that takes between 4 and 8 units of time
    console.log(`time ${sim.time}: agent ${id}, finished first action`);
    yield uniformInt(2, 6);
    console.log(`time ${sim.time}: agent ${id}, finished`);
}

sim.generatePoisson(agent, 1 / 5); // generate one agent every 5 units of time
sim.run(30); // start the simulation, and run it for 30 units of time
```

## Current capabilities
- Scheduling of events with simulated time
- Resources, with impatience
- Throttling
- Event interruption
- Basic analysis (multiple runs, ANOVA, etc.)
- Basic charts (using Vega-Lite)

## Intended
- Better docs (for now, see tests)
- Ability for processes to get more information about the simulated environment (resource stats, etc.)