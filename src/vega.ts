import { Resource } from "./sim.ts";

export function queueLengthEvolution(resource: Resource): object {
    return {
        "title": {
            "text": resource.name,
            "subtitle": "Queue length over time"
        },
        "transform": [
            {"filter": `datum.rid == ${resource.index}`},
            {"fold": ["rT", "xqT"]},
            {"filter": "isValid(datum.value)"},
            {"calculate": "datum.key=='rT' ? 1 : -1", "as": "q"},
            {
                "sort": [{"field": "value"}],
                "window": [
                    {"op":"sum", "field": "q", "as": "qLen"}
                ]
            }
        ],
        "mark": {"type":"line", "interpolate":"step-after", "tooltip": true},
        "encoding": {
            "x": {
                "field": "value",
                "type": "quantitative",
                "title": "Time"
            },
            "y": {
                "field": "qLen",
                "type": "quantitative",
                "title": "Queue length",
                "axis":{"tickMinStep":1}
            }
        }
    };
}

export function queueLengthDistribution(resource: Resource, simLength: number): object {
    return {
        "title": {
            "text": resource.name,
            "subtitle": "Queue length distribution"
        },
        "transform": [
            {"filter": `datum.rid == ${resource.index}`},
            {"fold": ["rT", "xqT"]},
            {"filter": "isValid(datum.value)"},
            {"calculate": "datum.key=='rT' ? 1 : -1", "as": "q"},
            {
                "sort": [{"field": "value"}],
                "window": [
                    {"op":"sum", "field": "q", "as": "qLen"},
                    {"op":"lead", "field": "value", "as": "xUntilMaybe"}
                ]
            },
            {"calculate": `(isValid(datum.xUntilMaybe) ? datum.xUntilMaybe : ${simLength}) - datum.value`, "as": "qTime"},
            {"joinaggregate": [{"op": "sum", "field": "qTime", "as": "TotalTime"}]},
            {"calculate": "datum.qTime/datum.TotalTime", "as":"PercentTime"}
        ],
        "mark": {"type":"bar", "tooltip": true},
        "encoding": {
            "x": {
                "field": "qLen",
                "title": "Queue Length"
            },
            "y": {
                "aggregate": "sum",
                "field": "PercentTime",
                "title": "%Time",
                "axis":{"format":".1~%"}
            }
        }
    }
}

export function comsumptionEvolution(resource: Resource, maxCapacity:number): object {
    return {
        "title": {
            "text": resource.name,
            "subtitle": "Resource usage over time"
        },
        "transform": [
            {"filter": `datum.rid == ${resource.index}`},
            {"fold": ["xqT", "lT"]},
            {"filter": "isValid(datum.value)"},
            {"calculate": "datum.key=='xqT' ? datum.cap : -datum.fr", "as": "c"},
            {
                "sort": [{"field": "value"}],
                "window": [
                    {"op":"sum", "field": "c", "as": "cons"}
                ]
            },
            {"calculate": `datum.cons/${maxCapacity}`, "as":"PercentResource"}
        ],
        "width": 600,
        "mark": {"type":"area", "interpolate":"step-after", "tooltip": true},
        "encoding": {
            "x": {
                "field": "value",
                "type": "quantitative",
                "title": "Time"
            },
            "y": {
                "field": "PercentResource",
                "type": "quantitative",
                "title": "Resource Comsumption",
                "axis":{"format":".1~%"}
            }
        }
    }
}

export function consumptionDistribution(resource: Resource, simLength: number): object {
    return {
        "title": {
            "text": resource.name,
            "subtitle": "Resource usage distribution"
        },
        "transform": [
            {"filter": `datum.rid == ${resource.index}`},
            {"fold": ["xqT", "lT"]},
            {"filter": "isValid(datum.value)"},
            {"calculate": "datum.key=='xqT' ? datum.cap : -datum.fr", "as": "c"},
            {
                "sort": [{"field": "value"}],
                "window": [
                    {"op":"sum", "field": "c", "as": "cons"},
                    {"op":"lead", "field": "value", "as": "xUntilMaybe"}
                ]
            },
            {"calculate": `(isValid(datum.xUntilMaybe) ? datum.xUntilMaybe : ${simLength}) - datum.value`, "as": "qTime"},
            {"joinaggregate": [{"op": "sum", "field": "qTime", "as": "TotalTime"}]},
            {"calculate": "datum.qTime/datum.TotalTime", "as":"PercentTime"}
        ],
        "mark": {"type":"bar", "tooltip": true},
        "encoding": {
            "x": {
                "field": "cons",
                "title": "Resource Consumption"
            },
            "y": {
                "aggregate": "sum",
                "field": "PercentTime",
                "title": "%Time",
                "axis":{"format":".1~%"}
            }
        }
    }
}

export function cmpDistChart(title:string, titles:string[], samples:number[][], stacked:boolean = true): object {
    const data = samples.flatMap((ss, i) => ss.map(s => ({s, "scenario":titles[i]})));
    const values = data.map(x => x.s);
    const min = Math.min(...values);
    const margin = Math.abs(0.01 * min);
    const extent = [min - margin, Math.max(...values) + margin];
    // deno-lint-ignore no-explicit-any
    const chart: Record<string, any> = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 400,
        "height": 100,
        "data": {"values": data},
        "title": {"text": `Distribution of ${title}`},
        "mark": "area",
        "transform": [{
            "density": "s",
            "groupby": ["scenario"],
            "extent": extent
        }],
        "encoding": {
            "x": {"field":"value", "type":"quantitative", "title":title},
            "y": {"field":"density", "type":"quantitative", "stack":"zero"}
        }
    }
    if(stacked){
        chart.encoding.color = {"field":"scenario", "type":"nominal"}
    }
    else {
        chart.encoding.row = {"field":"scenario"}
    }
    return chart;
}

export function chart(data:object, ...charts:object[]): object {
    return {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {"values": data},
        "vconcat": charts
    }
}

export function vconcat(...charts:object[]): object {
    return {
        "vconcat": charts
    }
}

export function hconcat(...charts:object[]): object {
    return {
        "hconcat": charts
    }
}