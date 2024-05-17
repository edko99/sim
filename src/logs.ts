import { ResourceUsageLog } from "./sim.ts";

export function eCDF(eDist: number[], id?: string): {key:number, val:number}[] {
    return asKeyVal(accumulate(normalize(eDist)), id);
}

export function normalize(x: number[]): number[] {
    const total = x.reduce((p, c) => p + c, 0);
    if(total === 0) throw "Cannot normalize if the sum is zero";
    return x.map(v => v / total);
}

export function accumulate(x: number[]): number[] {
    let prev = 0;
    return x.map(x => {
        prev += x;
        return prev;
    });
}

export function asKeyVal(x: number[], id?: string): {key:number, val:number, id?: string}[] {
    return x.map((val, key) => (id === undefined ? {key, val} : {key, val, id}));
}

export function queueLengthHistogram(log: ResourceUsageLog[], from: number = 0): number[] {
    const moves: {t:number, v:number}[] = [];
    for(const ru of log){
        moves.push({t:ru.rT, v:1});
        if(ru.xqT !== undefined) moves.push({t:ru.xqT, v:-1});
    }
    return _composeMoves(moves, from);
}

export function usageHistogram(log: ResourceUsageLog[], from: number = 0): number[] {
    const moves: {t:number, v:number}[] = [];
    for(const ru of log){
        if(ru.xqT !== undefined && ru.av !== undefined) moves.push({t:ru.xqT, v:ru.cap});
        if(ru.lT !== undefined) moves.push({t:ru.lT, v:-(ru.fr ?? 0)});
    }
    return _composeMoves(moves, from);
}

export function _composeMoves(moves: {t:number, v:number}[], from: number) {
    const cumul: number[] = [];
    moves.sort((a,b) => a.t - b.t);
    let ct = 0, cv = 0;
    for(const {t, v} of moves){
        if(t > from){
            const time = t - Math.max(ct, from);
            while(cumul.length <= cv) cumul.push(0);
            cumul[cv] += time;
        }
        ct = t; cv += v;
    }
    return cumul;
}