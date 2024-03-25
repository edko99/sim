export function queueLengthEvolution(resourceIndex: number): object {
    return {
        "transform": [
            {"filter": `datum.rid == ${resourceIndex}`},
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

export function queueLengthDistribution(resourceIndex: number, simLength: number): object {
    return {
        "transform": [
            {"filter": `datum.rid == ${resourceIndex}`},
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

export function comsumptionEvolution(resourceIndex:number, maxCapacity:number): object {
    return {
        "transform": [
            {"filter": `datum.rid == ${resourceIndex}`},
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

export function consumptionDistribution(resourceIndex: number, simLength: number): object {
    return {
        "transform": [
            {"filter": `datum.rid == ${resourceIndex}`},
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
