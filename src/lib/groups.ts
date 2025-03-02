import pattern from "patternomaly";

export const levels = ["osnovna", "rekreativna 1", "rekreativna 2", "nadaljevalna"]
export const colors = ["#6cac44", "#1c93d1", "#961cd1", "#184962", "#009688", "#5F52D1", "#513594", '#ff7f0e', '#d62728', '#8c564b', '#7f7f7f', '#bcbd22', '#17becf'];
const levelColors: Map<string, string> = new Map([
    ["osnovna", "#6cac44"],
    ["osnovna / rekreativna 1", "#009688"],
    ["rekreativna 1", "#1c93d1"],
    ["rekreativna 1 /2", "#5F52D1"],
    ["rekreativna 2", "#961cd1"],
    ["rekreativna 2 / nadaljevalna", "#513594"],
    ["nadaljevalna", "#184962"],
])

const patterns = ["line", "dot", "line-vertical", "square"]

export function getGroupColors(groups: string[]|GroupBreakdown[], makePatterns: boolean = false): string[] {
    if (groups.length > 0 && typeof groups[0] === 'string') {
        return groups.map(v => levelColors.get(v as string)) as string[]
    }
    const colors = ((groups as GroupBreakdown[]).map(({level}) => levelColors.get(level)) as string[]) as any as string[]
    if (!makePatterns) {
        return colors
    }
    const count: Map<string, number> = new Map();
    for (let i = 0; i < colors.length; i++) {
        const cnt = count.get(colors[i]) || 0
        count.set(colors[i], cnt + 1)
        if (cnt != 0) {
            colors[i] = pattern.draw(patterns[cnt-1] as any, colors[i], "rgba(0, 0, 0, 0.5)") as any as string
        }
    }
    return colors

}

export function doesGroupMatch(userGroup: string, settingGroup: string) {
    return userGroup.includes(settingGroup) || (settingGroup === "rekreativna 2" && userGroup.includes("rekreativna 1 /2"));
}

export function isGroupSelected(groups: string[], selectedGroups: Set<string>, useLevelsAsGroups: boolean) {
    if (useLevelsAsGroups) {
        for (const g1 of groups) {
            for (const g2 of selectedGroups) {
                if (doesGroupMatch(g1, g2)) {
                    return true;
                }
            }
        }
        return false;
    }
    return groups.some((group) => selectedGroups.has(group));
}

export function extractGroups(data: {groups: string[]}[]): GroupBreakdown[] {
    const groups = Array.from(new Set(data.flatMap(d => d.groups)));
    groups.sort((a, b) => {
        let mul = 1;
        for (const level of levels) {
            const aMatch = doesGroupMatch(a, level);
            const bMatch = doesGroupMatch(b, level);
            if (aMatch && !bMatch) {
                return -1 * mul;
            }
            if (!aMatch && bMatch) {
                return 1 * mul;
            }
            if (aMatch && bMatch) {
                mul = -1;
            }
        }
        return a < b ? -1 : 1;
    });

    return parseGroups(groups);
}

const nameShorteners: Map<string, string> = new Map([
    ["OŠ Bičevje", "Bič"],
    ["OŠ Dravlje", "Dra"],
    ["SUAŠ", "SUAŠ"],
    ["Gimnazija Šiška", "Šiš"],
    ["OŠ Vič", "Vič"],
    ["OŠ Riharda Jakopiča", "RH"],
    ["nadaljevalna", "N"],
    ["osnovna / rekreativna 1", "OR1"],
    ["rekreativna 1", "R1"],
    ["rekreativna 2 / nadaljevalna", "R2N"],
    ["rekreativna 2", "R2"],
    ["osnovna", "O"],
    ["rekreativna 1 /2", "R12"],
]);

export type GroupBreakdown = {index: number, level: string, location: string, day: string, shortName: string, name: string};

export function parseGroups(groups: string[]): GroupBreakdown[] {
    return groups.map((name, index) => {
        const [dayAndLevel, location, _lj] = name.split(" (");
        const [day, level] = dayAndLevel.split(" - ");
        return {
            name,
            level,
            day,
            location,
            index,
            shortName: `${nameShorteners.get(level)||level}_${day[0]}_${nameShorteners.get(location)||location}`,
        }
    });
}
