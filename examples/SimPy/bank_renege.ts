/*
Covers: Resources, Condition events

A counter with a random service time and customers who renege.
Based on https://simpy.readthedocs.io/en/latest/examples/bank_renege.html

This example models a bank counter and customers arriving at random times.
Each customer has a certain patience. She waits to get to the counter until she’s at the end of her tether.
If she gets to the counter, she uses it for a while before releasing it.

New customers are created by the source process every few time steps.
*/

import { DESIST, Process, Result, Sim, expovariate, uniform } from "../../mod.ts";

const NEW_CUSTOMERS = 5  // Total number of customers
const INTERVAL_CUSTOMERS = 10.0  // Generate new customers roughly every x seconds
const MIN_PATIENCE = 1  // Min. customer patience
const MAX_PATIENCE = 3  // Max. customer patience

const sim = new Sim();

const counter = sim.resource("Counter");

function* source(): Process {
    for(let i=0; i<NEW_CUSTOMERS; ++i){
        sim.spawn(customer);
        yield expovariate(1 / INTERVAL_CUSTOMERS);
    }
}

let customerId = 0;

function* customer(): Process {
    const arrive = sim.time;
    const name = `Customer 0${++customerId}`;
    console.log(`${arrive.toFixed(4)} ${name}: Here I am`);
    const req = yield counter.requestImpatient(impatience);
    const wait = sim.time - arrive;
    if(req == Result.OK){
        console.log(`${sim.time.toFixed(4)} ${name}: Waited ${wait}`);
        yield expovariate(1 / 12);
        yield counter.release();
        console.log(`${sim.time.toFixed(4)} ${name}: Finished`);
    }
    else{
        console.log(`${sim.time.toFixed(4)} ${name}: RENEGED after ${wait}`);
    }
}

function* impatience(): Process {
    const patience = uniform(MIN_PATIENCE, MAX_PATIENCE);
    yield patience;
    yield DESIST;
}

sim.spawn(source);
console.log("Bank Renege");
sim.run();