/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import {BinaryHeap, ascend} from "./eventq.ts";
import Denque from "npm:denque@2.1.0";

export type Action = number | Request | Release | Preempt | Interrupt | Throttle;

export enum Result {
    OK,
    ExceedsCapacity,
    Preempted,
    Throttled,
    Interrupted,
}

export type VarGen = Generator<number, void, void>;

type Identified = {id:number};
type NoId<T> = T extends Identified ? never : T;

export type Process = Generator<Action, void, Result>;
type ProcGenPlain = () => Process;
type ProcGenCtx = (id:number) => Process;
export type ProcessGenerator = ProcGenPlain | ProcGenCtx; 

type Impatience = {ticket: number, resourceId: number}
type ManagedProcess = Process & {readonly id: number, readonly impatience?: Impatience};

type Request = {kind:"request", resource:Resource, capacity:number, priority:number, impatience:ProcessGenerator|undefined}
type Release = {kind:"release", resource:Resource, capacity:number}
type Preempt = {kind:"preempt"}
type Interrupt = {kind: "interrupt", processId: number}

export const PREEMPT: Preempt = {kind:"preempt"};

export class Sim {
    #sim = new SimCore();

    spawn(procGen: ProcessGenerator, timeFromNow = 0){
        this.#sim.spawn(procGen, timeFromNow);
    }

    generate(vargen:VarGen, process:ProcessGenerator, delay = 0) {
        return this.#sim.generate(vargen, delay, process);
    }

    resource(name:string, capacity = 1, strict = true, priorities = 1): Resource {
        return this.#sim.resource(name, capacity, strict, priorities);
    }

    run(totalTime: number|undefined = undefined){
        return this.#sim.run(totalTime);
    }

    get time(): number {
        return this.#sim.time;
    }

    find(query: string|RegExp): Resource[] {
        return this.#sim.find(query);
    }

    addCapacity(resource: Resource, capacity: number){
        this.#sim.addCapacity(resource, capacity);
    }

    interrupt(processId: number): Interrupt {
        return this.#sim.interrupt(processId);
    }

    logs(): ResourceUsageLog[] {
        return this.#sim.logs();
    }
}

class SimCore {
    #processId = 0;
    #resourceIndex = 0;

    time = 0;
    eventQueue = new BinaryHeap<[number, ManagedProcess, Result]>(
        ([a,_a,_ra],[b,_b,_rb]) => ascend(a,b),
        ([_t,mp,_r]) => mp.id
    );
    resources: ResourceCore[] = [];
    #resourceMap = new Map<string, ResourceCore>();

    spawn(procGen: ProcessGenerator, timeFromNow: number){
        const id = ++this.#processId;
        const idProcess = Object.assign(procGen(id), {id});
        this.#schedule(timeFromNow, idProcess, Result.OK);
    }

    generate(vargen:VarGen, delay:number, process:ProcessGenerator) {
        const generator = generate(this, vargen, delay, process);
        const id = ++this.#processId;
        const idProcess = Object.assign(generator, {id});
        this.#schedule(0, idProcess, Result.OK);
    }

    resource(name:string, capacity: number, strict: boolean, priorities: number): Resource {
        const resource = new ResourceCore(this, this.#resourceIndex++, name, capacity, strict, priorities);
        this.resources.push(resource);
        this.#resourceMap.set(name, resource);
        return new Resource(resource);
    }

    run(totalTime: number|undefined){
        let event = this.eventQueue.pop();
        while(event){
            const [time, process, result] = event;
            if(totalTime !== undefined &&  time >= totalTime){
                this.time = totalTime;
                break;
            }
            this.time = time;
            const next = process.next(result);
            if(!next.done){
                const cmd = next.value;
                if(typeof(cmd) === "number"){
                    this.#schedule(cmd, process, Result.OK);
                }
                else if(cmd instanceof Throttle){
                    const wait = cmd.throttle(time);
                    this.#schedule(wait, process, wait == 0 ? Result.OK : Result.Throttled);
                }
                else if(cmd.kind === "request"){
                    const resource = this.resources[cmd.resource.index];
                    const result = resource.request(process, cmd.capacity, cmd.priority);
                    if(typeof result !== "number") {
                        if(cmd.impatience !== undefined) {
                            const id = ++this.#processId;
                            const impatience:Impatience = {ticket:result.ticket, resourceId:resource.index};
                            const impatienceProcess: ManagedProcess = Object.assign(cmd.impatience(id), {id, impatience});
                            this.#schedule(0, impatienceProcess, Result.OK);
                        }
                    }
                    else {
                        this.#schedule(0, process, result);
                    }
                }
                else if(cmd.kind === "release") {
                    this.#schedule(0, process, Result.OK);
                    const resource = this.resources[cmd.resource.index];
                    resource.release(process.id, cmd.capacity).forEach(nextProcess => this.#schedule(0, nextProcess, Result.OK));
                }
                else if(cmd.kind === "preempt") {
                    if(process.impatience === undefined) throw "Only impatience processes can preempt";
                    const resource = this.resources[process.impatience!.resourceId];
                    const preemptedProcess = resource.remove(process.impatience!.ticket);
                    if(preemptedProcess !== undefined) {
                        this.#schedule(0, preemptedProcess, Result.Preempted);
                    }
                }
                else if(cmd.kind === "interrupt") {
                    const event = this.eventQueue.remove(cmd.processId);
                    if(event){
                        const [i_time, i_process, i_result] = event;
                        this.#schedule(0, process, Result.OK);
                        this.#schedule(0, i_process, time == i_time ? i_result : Result.Interrupted);
                    }
                }
            }
            event = this.eventQueue.pop();
        }
        this.resources.forEach(r => {
            r.completePendingLogs();
        });
    }

    find(query: string|RegExp): Resource[] {
        const availableResources: Resource[] = [];
        if(query instanceof RegExp) {
            for(const [name, resource] of this.#resourceMap) {
                if(query.test(name)){
                    availableResources.push(new Resource(resource));
                }
            }
        }
        else {
            const resource = this.#resourceMap.get(query);
            if(resource !== undefined) {
                availableResources.push(new Resource(resource));
            }
        }
        return availableResources;
    }

    addCapacity(resource: Resource, capacity: number){
        const r = this.resources[resource.index];
        r.addCapacity(capacity).forEach(nextProcess => this.#schedule(0, nextProcess, Result.OK));
    }

    interrupt(processId: number): Interrupt {
        return {kind: "interrupt", processId}
    }

    logs(): ResourceUsageLog[] {
        return this.resources.flatMap(r => r.log);
    }

    #schedule(timeFromNow: number, process: ManagedProcess, result: Result) {
        this.eventQueue.push([this.time + timeFromNow, process, result]);
    }
}

export class Resource {
    #resource: ResourceCore;
    
    constructor(resource: ResourceCore){
        this.#resource = resource;
    }

    get index(): number {
        return this.#resource.index;
    }

    get name(): string {
        return this.#resource.name;
    }

    get log(): ResourceUsageLog[] {
        return this.#resource.log;
    }

    request(capacity:number = 1, priority:number = 1): Request {
        return {kind:"request", resource:this, capacity, priority, impatience: undefined}
    }

    requestImpatient(impatience:ProcessGenerator, capacity:number = 1, priority:number = 1):Request {
        return {kind:"request", resource:this, capacity, priority, impatience}
    }

    release(capacity:number = 1): Release {
        return {kind:"release", resource:this, capacity}
    }
}

export interface ResourceUsageLog {
    pid: number,  // process id
    rid: number,  // resource id
    pri: number,  // priority
    rT: number,   // timestamp of request
    cap: number,  // requested capacity
    xqT?: number, // timestamp when queue is exited
    av?: number,  // available capacity before seizing requested capacity
    lT?: number,  // timestamp of release
    fr?: number,  // capacity released
}

type Ticket = {ticket:number};

class ResourceCore {
    readonly sim: SimCore;
    readonly index: number;
    readonly name: string;
    readonly strict: boolean;
    readonly maxCapacity: number;
    
    #availableCapacity: number;
    #ticketNumber = 0;
    #q: Denque<[number, ManagedProcess]>[];
    #activeProcesses = new Map<number, ResourceUsageLog>();
    readonly log: ResourceUsageLog[] = [];
  
    constructor(sim:SimCore, index:number, name:string, capacity:number, strict:boolean, priorities:number) {
        this.sim = sim;
        this.index = index;
        this.name = name;
        this.maxCapacity = capacity;
        this.#availableCapacity = capacity;
        this.strict = capacity == 1 || strict;
        this.#q = Array.from({length: priorities}, _ => new Denque<[number, ManagedProcess]>());
    }
  
    request(process: ManagedProcess, capacity: number, priority: number): Result | Ticket {
        if(capacity > this.maxCapacity) return Result.ExceedsCapacity;
        else {
            const usageLog: ResourceUsageLog = {pid:process.id, pri: priority, rid:this.index, rT:this.sim.time, cap:capacity};
            this.#activeProcesses.set(process.id, usageLog);
            if(capacity <= this.#availableCapacity){
                usageLog.xqT = this.sim.time;
                usageLog.av = this.#availableCapacity;
                this.#availableCapacity -= capacity;
                return Result.OK;
            }
            else {
                const ticket = ++this.#ticketNumber;
                this.#q[priority-1].push([ticket, process]);
                return {ticket};
            }
        }
    }
  
    release(processId: number, capacity: number): ManagedProcess[] {
        const usageLog = this.#activeProcesses.get(processId)!;
        usageLog.lT = this.sim.time;
        usageLog.fr = capacity;
        this.#activeProcesses.delete(processId);
        this.log.push(usageLog);
        this.#availableCapacity += capacity;
        return this.#fittingProcesses();
    }

    #fittingProcesses(): ManagedProcess[] {
        const processes: ManagedProcess[] = [];
        for(let priority=0; priority<this.#q.length; ++priority){
            const q = this.#q[priority];
            if(q.length > 0) {
                let i=0;
                while(i < (this.strict ? Math.min(1, q.length) : q.length)){
                    const [_, process] = q.peekAt(i)!;
                    const usageLog = this.#activeProcesses.get(process.id)!;
                    if(usageLog.cap <= this.#availableCapacity) {
                        usageLog.xqT = this.sim.time;
                        usageLog.av = this.#availableCapacity;
                        q.removeOne(i);
                        this.#availableCapacity -= usageLog.cap;
                        processes.push(process);
                    }
                    else ++i;
                }
            }
        }
        return processes;
    }

    addCapacity(capacity: number): ManagedProcess[] {
        this.#availableCapacity += capacity;
        return this.#fittingProcesses();
    }
  
    remove(id: number): ManagedProcess | undefined {
        for(let priority=0; priority<this.#q.length; ++priority){
            const pos = this.#binarySearch(id, priority);
            if(pos !== undefined) {
                const [_, process] = this.#q[priority].removeOne(pos)!;
                const usageLog = this.#activeProcesses.get(process.id)!;
                usageLog.xqT = this.sim.time;
                this.#activeProcesses.delete(process.id);
                this.log.push(usageLog);
                return process;
            }
        }
    }

    completePendingLogs() {
        this.#activeProcesses.forEach(log => this.log.push(log));
        this.#activeProcesses.clear();
    }

    #binarySearch(id: number, prio: number): number | undefined {
        const q = this.#q[prio];
        if(q.isEmpty()) return;

        let start = 0;
        let end = this.#q.length - 1;
        if(id < q.peekAt(start)![0]) return;
        if(id > q.peekAt(end)![0]) return;

        while(start <= end) {
            const mid = Math.floor((start + end) / 2);
            const midval = q.peekAt(mid)![0];
            if(id === midval) {
                return mid;
            }
            if(id < midval) {
                end = mid - 1;
            } else {
                start = mid + 1;
            }
        }
    }
}

export class Throttle {
    #control: Uint32Array;
    #gap: number;
    #index = 0;
    #isFull = false;

    constructor(processCount: number, perTime: number) {
        this.#control = new Uint32Array(processCount);
        this.#gap = perTime;
    }

    throttle(currentTime: number): number {
        const slot = this.#index;
        this.#index = (slot + 1) % this.#control.length;
        const nextActivation = Math.max(currentTime, this.#isFull ? this.#control[slot] + this.#gap : 0);
        this.#control[slot] = nextActivation;
        if(this.#index == 0) this.#isFull = true;
        return nextActivation - currentTime;
    }
}

function* generate(sim: SimCore, vargen:VarGen, delay:number, process:ProcessGenerator): Process {
    yield delay;
    for(const v of vargen){
        yield v;
        sim.spawn(process, 0);
    }
}

export function* varExpo(lambda: number, random: () => number = Math.random) {
    while(true) yield -Math.log(1 - random()) / lambda;
}

export function* varUniform(a: number, b: number, random: () => number = Math.random) {
    while(true) yield a + (b - a) * random();
}

export function randomInt(mean:number, plusOrMinus:number, random: () => number = Math.random): number {
    const r = Math.floor((2 * plusOrMinus + 1) * random());
    return mean - plusOrMinus + r;
}

export function uniformInt(from:number, until:number, random: () => number = Math.random): number {
    return Math.floor((1 + until - from) * random() + from);
}

export function customDistribution<T>(...point:[weight:number, value:T][]): (random0to1?: number) => T {
    const total = point.reduce((acc, val) => acc + val[0], 0);
    const normalized:[number, T][] = point.map(([w, v]) => [w/total, v]);
    return (random0to1:number|undefined): T => {
        if(random0to1 === undefined) random0to1 = Math.random();
        let accum = 0, i = 0;
        while(random0to1 >= accum && i < normalized.length){
            accum += normalized[i][0];
            i += 1;
        }
        return normalized[i-1][1];
    }
}

export function setupSampleListener<P, R>(sampler: (param:P) => R) {
    self.onmessage = (evt) => {
        const {runs, parameters} = evt.data as {runs:number, parameters:P};
        const samples: R[] = [];
        for(let i=0; i<runs; ++i){
            const sample = sampler(parameters);
            samples.push(sample);
        }
        self.postMessage(samples);
        self.close();
    }
}

export async function runScenarios<P, R>(srcPath:string, scenarios:P[], runs:number): Promise<R[][]> {
    return await Promise.all(scenarios.map(scenario => new Promise((resolve, reject) => {
        const worker = new Worker(srcPath, {type:"module"});
        worker.onmessage = evt => resolve(evt.data);
        worker.onerror = reject;
        worker.postMessage({runs, parameters:scenario});
    }))) as R[][];
}

export function writeResultsSync(results: number[][], fname: string) {
    if(results.length == 0) return;
    let csv = "";
    const runs = results[0].length;
    for(let i=0; i<runs; ++i){
        if(i>0) csv += "\n";
        for(let j=0; j<results.length; ++j){
            if(j>0) csv += ",";
            csv += results[j][i];
        }
    }
    Deno.writeTextFileSync(fname, csv);
}