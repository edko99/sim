/*
Carwash example.
Based on https://simpy.readthedocs.io/en/latest/examples/carwash.html

Covers: Waiting for other processes, Resources

Scenario:
  A carwash has a limited number of washing machines and defines
  a washing processes that takes some (random) time.

  Car processes arrive at the carwash at a random time. If one washing
  machine is available, they start the washing process and wait for it
  to finish. If not, they wait until they can use one.
*/

import { Sim, Process, uniformInt, varUniform } from "../../mod.ts";

const NUM_MACHINES = 2  // Number of machines in the carwash
const WASHTIME = 5      // Minutes it takes to clean a car
const T_INTER = 7       // Create a car every ~7 minutes
const SIM_TIME = 20     // Simulation time in minutes

const sim = new Sim();

const machine = sim.resource("Machine", NUM_MACHINES);

let carCount = 0;

function* car(): Process {
    const name = `Car ${carCount++}`;
    console.log(`${name} arrives at the carwash at ${sim.time.toFixed(2)}`);
    yield machine.request();
    console.log(`${name} enters the carwash at ${sim.time.toFixed(2)}`);
    yield WASHTIME;
    const pctDirt = uniformInt(50, 99);
    console.log(`Carwash removed ${pctDirt}% of ${name}'s dirt`);
    console.log(`${name} leaves the carwash at ${sim.time.toFixed(2)}`);
    yield machine.release();
}

for(let i=0; i<4; ++i) sim.spawn(car);
sim.generate(varUniform(T_INTER - 2, T_INTER + 2), car);

console.log("Carwash");
sim.run(SIM_TIME);