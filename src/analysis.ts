import ttest2 from "npm:@stdlib/stats-ttest2";
import anova1 from "npm:@stdlib/stats-anova1";

export function analyzeResults(results: number[][]) {
    if(results.length < 2) {
        console.log("nothing to compare")
    }
    else if(results.length == 2) {
        const t = ttest2(results[0], results[1]);
        console.log(t.print());
    }
    else {
        const titles = results.map((_, i) => `Scenario ${i+1}`)
        const obs = results.flat();
        const lbl = results.flatMap((r,i) => r.map(_ => titles[i]));
        const a = anova1(obs, lbl);
        console.log(a.print());
        console.log(a.means);
    }
}